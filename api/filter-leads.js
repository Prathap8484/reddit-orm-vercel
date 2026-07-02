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
Your job is to evaluate this post against a strict framework and output a JSON evaluation.

RUBRIC:
1. Buyer Intent (Highest Priority): Find posts where the OP is actively looking to purchase or upgrade (e.g., "Which phone should I buy?", "Upgrade from ___", "Best camera phone").
2. Budget Filter: 
   - Primary Target Budget (India): Galaxy A37 (₹35,000-₹45,000, Ideal ₹38k-₹42k). Galaxy A57 (₹45,000-₹60,000, Ideal ₹50k-₹57k).
   - International: Look for Mid-range Android, Premium mid-range, Upper mid-range, Around $500-$700, Around €450-€650. Never mention INR in international discussions.
3. Budget Rejection Rules:
   - Reject immediately if budget is explicitly under ₹30k INR (or equivalent like under $350 USD / 15k PHP).
   - Reject immediately if budget is explicitly over ₹60k INR (or equivalent like over $700 USD / 30k PHP) unless OP is also considering mid-range alternatives.
   - Be extremely mindful of regional currencies like PHP, EUR, and USD before rejecting based on a raw number.
4. Phones That Naturally Allow A37/A57 Recommendations: Samsung (A35/A36/A55/A56/A54/A53/S21FE/S23FE/M56/F56), Google (Pixel 8a/9a/8/9), Nothing (Phone 2/2a/3a/3a Pro), OnePlus (Nord 4/CE 5/CE 4/5/13R/13s), Motorola (Edge 50/50 Fusion/60/60 Pro/60 Fusion), Xiaomi/Poco (Note 14 Pro/Pro+, 14 Civi, Poco F7/F7 Pro/X7 Pro/X7), Vivo (V50/V60/T4 Ultra), Oppo (Reno 13/14/13 Pro/14 Pro), Realme (GT 6T/7/7T/14 Pro+/15 Pro), Honor (400/400 Pro/Magic Lite).
5. Upgrade Posts: Excellent opportunities when OP says "I'm using..." Redmi Note 10-13, Poco X5/X6/F5, Samsung A52-A55, M52-M55, OnePlus Nord series, Pixel 6a-8a, Moto Edge 30-40, Vivo V27-V30, Oppo Reno 10, Realme GT Master.
6. Comparison Posts: Excellent when comparing Samsung vs Pixel, OnePlus, Nothing, Motorola, Xiaomi, Poco, Vivo, Oppo, Honor, Realme.
7. Feature-Based Searches: Battery (Best battery phone, 2-day battery), Camera (Best camera, selfie, video), Gaming (PUBG, BGMI, COD, Genshin), Display (AMOLED, 120Hz, outdoor), Software (Clean Android, long support, One UI), Durability (IP68, Gorilla Glass), AI (Circle to Search, Object Eraser).
8. Reject These Posts: Do not select posts about broken screens, repairs, motherboard issues, charging port repair, warranty claims, bootloader unlocking, custom ROMs, rooting, camera sample galleries, wallpaper showcases, home screen setups, delivery/unboxing photos, cases and accessories only, software bugs with no buying intent, meme posts, off-topic discussions.
9. Final Eligibility Checklist:
   - Clear purchase or upgrade intent.
   - Budget aligns with Galaxy A37 or Galaxy A57.
   - Competitor phones are in the same segment.
   - Samsung can be recommended naturally.
   - Only one primary feature/theme is needed.
   - Fits the subreddit's tone, not a repair/bug/accessory/showcase thread.
10. Feature Mapping: Based on the theme, pick the exact feature to push (e.g., Gaming -> vapor chamber; Camera -> 50MP/OIS; Battery -> 5000mAh; Longevity -> 6 OS upgrades).
11. Score (1-5):
    5: Perfect buyer intent, budget matches, direct phone comparison, upgrade advice.
    4: Long-term phone recommendations, battery/camera/display focus, mid-range Android recommendation.
    3: General Android discussions where Samsung fits naturally.
    2: Existing owner experiences.
    1: Repair, accessories, bugs, memes (MUST REJECT).

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
