import { XMLParser } from "fast-xml-parser";

export default async function handler(req, res) {
  try {
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }
    const query = req.query.q || "";
    if (!query) return res.status(400).json({ error: "Missing query" });

    // Fetch the RSS feed instead of JSON to bypass Reddit's data-center IP bans
    const rssUrl = `https://www.reddit.com/search.rss?q=${encodeURIComponent(query)}&sort=new&t=month&limit=100`;
    
    const response = await fetch(rssUrl, {
      headers: {
        "accept": "application/xml, text/xml, */*; q=0.01",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Reddit returned ${response.status}` });
    }

    const xml = await response.text();
    
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(xml);
    
    let entries = [];
    if (parsed.feed && parsed.feed.entry) {
      entries = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    }
    
    const children = entries.map(entry => {
      const title = entry.title || "No Title";
      
      let fullUrl = "";
      if (entry.link) {
         if (Array.isArray(entry.link)) {
            const linkObj = entry.link.find(l => l["@_href"]);
            if (linkObj) fullUrl = linkObj["@_href"];
         } else if (entry.link["@_href"]) {
            fullUrl = entry.link["@_href"];
         }
      }
      
      let permalink = fullUrl.replace("https://www.reddit.com", "");
      if (!permalink.startsWith("/")) permalink = "/" + permalink;
      
      if (!permalink.includes("/comments/")) {
        return null;
      }
      
      let subreddit = "";
      if (entry.category) {
        if (Array.isArray(entry.category)) {
           const cat = entry.category.find(c => c["@_term"]);
           if (cat) subreddit = cat["@_term"];
        } else if (entry.category["@_term"]) {
           subreddit = entry.category["@_term"];
        }
      }
      
      const updatedStr = entry.updated || new Date().toISOString();
      const parsedTime = new Date(updatedStr).getTime();
      const created_utc = isNaN(parsedTime) ? 0 : Math.floor(parsedTime / 1000);
      
      const oneMonthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      if (created_utc < oneMonthAgo) {
        return null;
      }
      
      let selftext = "";
      if (entry.content && typeof entry.content === "object" && entry.content["#text"]) {
         selftext = entry.content["#text"];
      } else if (typeof entry.content === "string") {
         selftext = entry.content;
      }
      
      selftext = selftext.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      selftext = selftext.replace(/<[^>]+>/g, " ").trim();
      
      let author = "unknown";
      if (entry.author && entry.author.name) {
         author = entry.author.name.replace("/u/", "");
      }
      
      return {
        data: {
          title,
          permalink,
          subreddit,
          ups: 0,
          num_comments: 0,
          created_utc,
          selftext,
          author
        }
      };
    }).filter(Boolean);

    // Return exact same JSON structure that app.js expects from Reddit's search.json
    return res.status(200).json({
      data: {
        children
      }
    });

  } catch (error) {
    console.error(`[reddit-search.js] Error:`, error.message);
    return res.status(500).json({ error: "Could not fetch from Reddit." });
  }
}
