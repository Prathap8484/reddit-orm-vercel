import "dotenv/config";

async function test() {
  const url = "https://old.reddit.com/r/samsunggalaxy/comments/1uavt4e/should_i_get_the_samsung_galaxy_a57_5g_or_a/";
  const subreddit = "samsunggalaxy";
  const title = "Should I get the Samsung Galaxy A57 5G or a Xiaomi Poco x8 Pro?";
  
  let rssUrl = url.replace(/\/$/, '') + '.rss';
  console.log("Fetching", rssUrl);
  
  const redditRes = await fetch(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)" }
  });
  
  console.log("RSS Status:", redditRes.status);
  const xml = await redditRes.text();
  
  const entryRegex = /<content type="html">([\s\S]*?)<\/content>/g;
  const entries = [];
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    let text = match[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    entries.push(text);
  }
  
  console.log("Entries found:", entries.length);
  
  const selftext = entries[0] || "";
  const topComments = entries.slice(1, 4).join("\n---\n");
  
  console.log("Body length:", selftext.length);
  console.log("Comments length:", topComments.length);
  
  const inputData = `[POST TO EVALUATE]
Subreddit: r/${subreddit}
Title: ${title}
Body: ${selftext}
Comments:
${topComments}
`;

  const RUBRIC_PROMPT = `You are an elite Reddit ORM (Online Reputation Management) Filtering Engine for the Samsung Galaxy A37 and A57.
You will receive the Title, Body, and Top Comments of a Reddit post.
Your job is to evaluate this post against a strict 15-point rubric and output a JSON evaluation.

RUBRIC:
1. Primary Filter (Must Have): Clear buying/upgrade intent (e.g., "Which phone should I buy?", "Upgrade suggestions", "Pixel vs Samsung").
2. Budget Filter: Reject immediately if budget is explicitly under ₹30k or over ₹50k.
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

  console.log("Calling Claude...");
  
  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: RUBRIC_PROMPT,
      temperature: 0.1,
      messages: [{ role: "user", content: inputData }]
    })
  });
  
  console.log("Claude Status:", anthropicRes.status);
  const data = await anthropicRes.text();
  console.log("Claude Response:", data);
}

test();
