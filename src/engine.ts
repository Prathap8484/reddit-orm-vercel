import "dotenv/config";
import * as cheerio from "cheerio";
import { db } from "./db";
import { clients, personas, logs } from "./db/schema";
import { eq, inArray } from "drizzle-orm";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

if (!API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

/**
 * 1. Database Integration & Fetch Active Clients & Personas
 */
async function getActiveConfigurations() {
  const activeClients = await db.query.clients.findMany({
    where: eq(clients.status, 'active'),
    with: {
      personas: true
    }
  });
  return activeClients;
}

// --- Thread Discovery ---
/**
 * Fetches the newest threads from a specific subreddit on old.reddit.com
 */
async function fetchSubredditLinks(subreddit: string): Promise<string[]> {
  const url = `https://old.reddit.com/r/${subreddit}/new/`;
  try {
    console.log(`    -> Fetching thread list from ${url}`);
    const res = await fetch(url, { headers: { "user-agent": UA } });
    
    if (!res.ok) {
      console.warn(`    ⚠️ Failed to fetch r/${subreddit}: ${res.status}`);
      return [];
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const links: string[] = [];
    
    // Fix Link Post Bug: Target the comments link instead of a.title
    // This ensures we always get the Reddit thread URL, even if the post links externally.
    $("a.bylink.comments, a.comments").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("/comments/")) {
        // Ensure absolute URLs
        const absoluteUrl = href.startsWith("/") ? `https://old.reddit.com${href}` : href;
        links.push(absoluteUrl);
      }
    });
    
    // Return top 5 recent posts
    return links.slice(0, 5);
  } catch (error: any) {
    console.error(`    ⚠️ Error scraping subreddit r/${subreddit}:`, error.message);
    return [];
  }
}

// --- Intact Reddit API Logic ---
function cleanText(value: string, limit = 2500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\[deleted\]|\[removed\]/gi, "")
    .trim()
    .slice(0, limit);
}

function normalizeRedditUrl(url: string) {
  return String(url || "").replace("www.reddit.com", "old.reddit.com").replace(/\/$/, "");
}

async function fetchRedditContext(permalink: string) {
  const url = normalizeRedditUrl(permalink);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return { selftext: "", topComments: "" };
    const html = await res.text();
    const $ = cheerio.load(html);
    const blocks: string[] = [];
    $("div.md").each((_, el) => {
      const text = cleanText($(el).text(), 1200);
      if (text) blocks.push(text);
    });
    return {
      selftext: blocks[0] || "",
      topComments: blocks.slice(1, 5).join("\n---\n"),
    };
  } catch {
    return { selftext: "", topComments: "" };
  }
}

// --- Intact Claude API Logic ---
function extractJson(text: string) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return JSON.");
  return JSON.parse(match[0]);
}

async function analyzeAndDraft(
  postUrl: string, 
  context: any, 
  systemPrompt: string,
  tone: string
) {
  const system = `${systemPrompt}\n\nMaintain this tone: ${tone}\n\nReturn strictly valid JSON only:
{
  "decision": "ACCEPT" | "REJECT",
  "score": 1-5,
  "comment": "final comment if accepted, else empty string",
  "reason": "short reason"
}`;

  const user = `[POST]
URL: ${postUrl}
Body: ${context.selftext || ""}
Top comments:
${context.topComments || ""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.25,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return extractJson(data?.content?.[0]?.text || "");
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main Execution Engine ---
export async function run() {
  console.log("Initializing database-driven execution engine...");

  const activeClients = await getActiveConfigurations();

  if (activeClients.length === 0) {
    console.log("No active clients found. Exiting pipeline.");
    return;
  }

  for (const client of activeClients) {
    console.log(`\n=== Processing Client: ${client.name} (ID: ${client.id}) ===`);

    if (!client.personas || client.personas.length === 0) {
      console.warn(`[SKIP] Client '${client.name}' has no active personas configured.`);
      continue;
    }

    for (const persona of client.personas) {
      console.log(`\n  -> Initializing Persona: ${persona.name}`);
      
      const subreddits = persona.targetSubreddits || [];
      if (subreddits.length === 0) {
        console.warn(`    [SKIP] Persona '${persona.name}' has no target subreddits.`);
        continue;
      }
      
      for (const subreddit of subreddits) {
        console.log(`\n    -> Sweeping r/${subreddit}...`);
        
        // 1. Thread Discovery
        const postUrls = await fetchSubredditLinks(subreddit);
        
        if (postUrls.length === 0) {
           console.log(`      No recent posts found for r/${subreddit}`);
           continue;
        }

        // 2. Resolve N+1 Query Overhead (Bulk Deduplication)
        // Fetch all matching logs in one single query
        const existingLogs = await db.query.logs.findMany({
          where: inArray(logs.postId, postUrls)
        });

        // Map to a Set for O(1) lookups
        const existingPostIds = new Set(existingLogs.map(log => log.postId));
        
        // Filter out URLs that have already been processed
        const newPostUrls = postUrls.filter(url => !existingPostIds.has(url));

        if (newPostUrls.length === 0) {
           console.log(`      [DEDUP] All ${postUrls.length} posts were already processed. Skipping to save API tokens.`);
           continue;
        }

        // Process only brand new threads
        for (const postUrl of newPostUrls) {
          try {
            console.log(`      [NEW] Processing: ${postUrl}`);

            // Fetch Reddit Context
            const context = await fetchRedditContext(postUrl);
            
            // Analyze using Claude
            const result = await analyzeAndDraft(
              postUrl, 
              context, 
              persona.systemPrompt, 
              persona.tone || "neutral"
            );
            
            // 3. Complete the Logging Loop
            let logContent = "";
            if (result.decision === "ACCEPT") {
               console.log(`      ✅ Draft accepted (Score: ${result.score})`);
               logContent = result.comment || "No comment generated";
            } else {
               console.log(`      ❌ Draft rejected: ${result.reason}`);
               logContent = `REJECTED: ${result.reason}`;
            }

            // Insert the log record into Neon database using Drizzle
            await db.insert(logs).values({
              clientId: client.id,
              postId: postUrl,
              content: logContent
            });
            
          } catch (error: any) {
            // 4. Resilient Error Handling
            console.error(`      ⚠️ Error processing post ${postUrl}: ${error.message}`);
          }
          
          await wait(1500); // Rate limit protection
        }
      }
    }
  }

  console.log("\nPipeline execution complete.");
}


