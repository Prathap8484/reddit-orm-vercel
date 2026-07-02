import fs from "fs";
import readline from "readline";
import "dotenv/config";
import * as cheerio from "cheerio";
import { parseCsv } from "./harvest.mjs";

// Configuration
const IN_FILE = process.argv[2] || "master.csv";
const OUT_FILE = "filtered_leads.csv";
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

const RUBRIC_PROMPT = `You are an elite Reddit ORM (Online Reputation Management) Filtering Engine for the Samsung Galaxy A37 and A57.
You will receive the Title, Body, and Top Comments of a Reddit post.
Your job is to evaluate this post against a strict 15-point rubric and output a JSON evaluation.

RUBRIC:
1. Primary Filter (Must Have): Clear buying/upgrade intent (e.g., "Which phone should I buy?", "Upgrade suggestions", "Pixel vs Samsung").
2. Budget Filter: Reject immediately if budget is explicitly under $350 USD (or equivalent like ₹30k INR, 15k PHP) or over $600 USD (or equivalent). Be mindful of regional currencies like PHP, EUR, and USD before rejecting based on a number.
3. Country Filter: Identify if India, US, Europe, or Unknown.
4. Topic Filter: Accept ONLY Buying Advice, Upgrade Advice, Comparison, Battery, Camera, Performance, Display, Longevity, Durability, AI Features.
5. Theme Matching: Identify exactly ONE dominant theme (e.g., Camera).
6. Natural Opportunity: Samsung A37/A57 must naturally fit the OP's requirements.
7. Conversation Filter: Check comments. Reject if OP explicitly hates Samsung or One UI, or already bought a phone.
8. Subreddit Filter: Reject repair, rooting, tech support, developer discussions.
9. Reject Immediately: Broken screens, bugs, flashing ROMs, memes, flex posts, shipping updates, no buying intent.
10. Feature Mapping: Based on the theme, pick the exact feature to push (e.g., Gaming -> vapor chamber; Camera -> 50MP/OIS; Battery -> 5000mAh; Longevity -> 6 OS upgrades).
11. Score (1-5):
    5: Perfect buyer intent, budget matches, Samsung fits, active comparison.
    4: Great upgrade advice, battery/camera focus.
    3: General Android talk, vague comparisons.
    2: Existing owner accessory talk.
    1: Repair, bugs, memes (MUST REJECT).

OUTPUT FORMAT:
Return strictly valid JSON with no markdown formatting. Schema:
{
  "decision": "ACCEPT" | "REJECT",
  "score": <number 1-5>,
  "primary_theme": "<theme>",
  "feature_to_mention": "<feature>",
  "country_context": "<India|US|Europe|Unknown>",
  "reason": "<short explanation>"
}`;

async function fetchRedditPost(permalink) {
  try {
    // permalink already contains https://old.reddit.com/r/...
    const res = await fetch(permalink, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" }
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    const $ = cheerio.load(html);
    const mdBlocks = [];
    $('div.md').each((i, el) => {
      let text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) mdBlocks.push(text);
    });
    
    // We already have title & subreddit from the CSV. Just return the text blocks.
    return {
      title: "", // Passed from CSV
      selftext: mdBlocks[0] || "",
      subreddit: "", // Passed from CSV
      topComments: mdBlocks.slice(1, 4).join("\n---\n")
    };
  } catch (err) {
    return null;
  }
}

async function evaluatePost(postData) {
  const inputData = `[POST TO EVALUATE]
Subreddit: r/${postData.subreddit}
Title: ${postData.title}
Body: ${postData.selftext}
Comments:
${postData.topComments}
`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: RUBRIC_PROMPT,
        temperature: 0.1,
        messages: [{ role: "user", content: inputData }]
      })
    });
    
    if (!res.ok) {
      console.log(await res.text());
      return null;
    }
    const data = await res.json();
    let text = data?.content?.[0]?.text || "";
    // Clean potential markdown wrap
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      text = match[0];
    } else {
      text = text.replace(/```json/i, "").replace(/```/g, "").trim();
    }
    
    return JSON.parse(text);
  } catch (err) {
    console.error("AI Evaluation Error:", err.message);
    return null;
  }
}

// ── Main Pipeline ──────────────────────────────────────────────────
async function run() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Input file ${IN_FILE} not found.`);
    process.exit(1);
  }

  console.log(`Starting AI Filter Pipeline. Reading from ${IN_FILE}...`);
  
  // Write CSV header
  if (!fs.existsSync(OUT_FILE)) {
    fs.writeFileSync(OUT_FILE, "Decision,Score,Theme,Feature,Country,Reason,Subreddit,Title,Link\n");
  }

  const csvText = fs.readFileSync(IN_FILE, 'utf8');
  const rows = parseCsv(csvText);

  // Skip posts already evaluated in a previous run so daily refreshes only
  // score NEW harvested leads (bounds API cost and avoids duplicate rows).
  const alreadyScored = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";

  let totalProcessed = 0;
  let totalAccepted = 0;
  let totalSkipped = 0;

  for (const row of rows) {
    const subreddit = row.subreddit ? row.subreddit.replace("r/", "") : "unknown";
    const title = row.title || "";
    const link = row.link || "";

    if (!link) continue;
    if (alreadyScored.includes(link)) { totalSkipped++; continue; }

    console.log(`\n[Processing] ${title.substring(0,50)}...`);
    
    const postData = await fetchRedditPost(link);
    if (!postData) {
      console.log("  -> Failed to fetch Reddit context (Rate limit/Deleted). Skipping.");
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const evaluation = await evaluatePost(postData);
    if (!evaluation) {
      console.log("  -> AI Evaluation failed. Skipping.");
      continue;
    }

    console.log(`  -> Decision: ${evaluation.decision} (Score: ${evaluation.score})`);
    
    if (evaluation.decision === "ACCEPT" && evaluation.score >= 3) {
      const cleanTitle = title.replace(/"/g, '""');
      const cleanReason = (evaluation.reason || "").replace(/"/g, '""');
      
      const csvRow = `"ACCEPT",${evaluation.score},"${evaluation.primary_theme}","${evaluation.feature_to_mention}","${evaluation.country_context}","${cleanReason}","${subreddit}","${cleanTitle}","${link}"\n`;
      
      fs.appendFileSync(OUT_FILE, csvRow);
      totalAccepted++;
    }

    totalProcessed++;
    // Polite delay for APIs
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nPipeline Complete! Processed: ${totalProcessed} | Accepted: ${totalAccepted} | Skipped (already scored): ${totalSkipped}`);
  console.log(`Results saved to ${OUT_FILE}`);
}

run();
