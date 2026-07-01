export default async function handler(req, res) {
  try {
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
    
    // Parse the RSS XML manually using Regex (since Vercel edge doesn't have DOMParser)
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    const children = entries.map(entry => {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link href="([^"]+)"/);
      const contentMatch = entry.match(/<content type="html">([\s\S]*?)<\/content>/);
      const authorMatch = entry.match(/<name>\/u\/([^<]+)<\/name>/);
      const categoryMatch = entry.match(/<category term="([^"]+)"/);
      const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);

      const title = titleMatch ? titleMatch[1] : "No Title";
      const fullUrl = linkMatch ? linkMatch[1] : "";
      let permalink = fullUrl.replace("https://www.reddit.com", "");
      if (!permalink.startsWith("/")) permalink = "/" + permalink;
      
      // Strict filter: If it's not a post (e.g., a subreddit link), reject it
      if (!permalink.includes("/comments/")) {
        return null;
      }
      
      const subreddit = categoryMatch ? categoryMatch[1] : "";
      
      const updatedStr = updatedMatch ? updatedMatch[1] : new Date().toISOString();
      const parsedTime = new Date(updatedStr).getTime();
      const created_utc = isNaN(parsedTime) ? 0 : Math.floor(parsedTime / 1000);
      
      // Decode basic HTML entities from content
      let selftext = contentMatch ? contentMatch[1] : "";
      selftext = selftext.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      // Strip HTML tags for the text preview
      selftext = selftext.replace(/<[^>]+>/g, " ").trim();

      return {
        data: {
          title,
          permalink,
          subreddit,
          ups: 0, // RSS doesn't provide exact upvotes easily
          num_comments: 0, // RSS doesn't provide comment count easily
          created_utc, // Added to fix date parsing errors in app.js
          selftext,
          author: authorMatch ? authorMatch[1] : "unknown"
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
