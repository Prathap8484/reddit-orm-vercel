export const maxDuration = 60;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }

    const API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!API_KEY) {
      console.error("Missing ANTHROPIC_API_KEY");
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' });
    }

    const { url, title, subreddit, selftext: clientSelfText } = req.body;
    if (!url) {
      console.error("Missing URL in req.body", req.body);
      return res.status(400).json({ error: 'Missing URL' });
    }

    console.log(`Processing URL: ${url}`);

    let selftext = clientSelfText || "";
    let topComments = "";

    // 1. Fetch Reddit RSS ONLY if client did not provide selftext
    if (!selftext) {
      console.log(`Selftext not provided by client. Fallback to scraping Reddit search for title: ${title}`);
      
      // Use search.rss instead of comments/...rss because comments.rss is IP-banned on Vercel Datacenters
      const searchRssUrl = `https://www.reddit.com/r/${subreddit}/search.rss?q=${encodeURIComponent(title)}&restrict_sr=on&sort=relevance&t=all`;
      
      console.log(`Fetching RSS Fallback: ${searchRssUrl}`);
      const redditRes = await fetch(searchRssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" }
      });
      
      console.log(`Reddit RSS Status: ${redditRes.status}`);
      if (!redditRes.ok) {
        console.error(`Reddit fetch failed with ${redditRes.status}. Proceeding to evaluate with TITLE ONLY.`);
      } else {
        const xml = await redditRes.text();
        
        // We are looking for the entry that matches our post
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let matchedEntry = "";
        let match;
        
        // Extract post ID from original URL to ensure we match the right post in search results
        const urlParts = url.split('/');
        const postIdIndex = urlParts.indexOf('comments') + 1;
        const postId = postIdIndex > 0 && postIdIndex < urlParts.length ? urlParts[postIdIndex] : "";

        while ((match = entryRegex.exec(xml)) !== null) {
          const entryBlock = match[1];
          if (postId && entryBlock.includes(postId)) {
             matchedEntry = entryBlock;
             break;
          }
        }
        
        // If we couldn't match by ID, just take the first entry since we searched by exact title
        if (!matchedEntry) {
           const firstMatch = /<entry>([\s\S]*?)<\/entry>/.exec(xml);
           if (firstMatch) matchedEntry = firstMatch[1];
        }
        
        if (matchedEntry) {
          const contentMatch = matchedEntry.match(/<content type="html">([\s\S]*?)<\/content>/);
          if (contentMatch) {
            let text = contentMatch[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
            selftext = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          }
          console.log("Successfully extracted selftext from search.rss fallback");
        } else {
          console.log("Could not find matching post in search.rss fallback. Proceeding with title only.");
        }
      }
    } else {
      console.log("Using cached selftext from client. Bypassing Reddit fetch.");
    }

    const inputData = `[POST TO EVALUATE]
Subreddit: r/${subreddit || "unknown"}
Title: ${title || "Unknown Title"}
Body: ${selftext}
Comments:
${topComments}
`;

    // 2. Evaluate with Claude
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

    console.log("Calling Claude API...");
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    console.log(`Claude Status: ${anthropicRes.status}`);
    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text();
      console.error("Claude API Error:", errorText);
      return res.status(500).json({ error: 'Claude API failed', details: errorText });
    }

    const data = await anthropicRes.json();
    let text = data?.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      text = match[0];
    } else {
      text = text.replace(/```json/i, "").replace(/```/g, "").trim();
    }
    
    console.log("Claude Evaluation:", text);
    const evaluation = JSON.parse(text);
    return res.status(200).json(evaluation);

  } catch (err) {
    console.error("Fatal Error in filter-leads API:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
