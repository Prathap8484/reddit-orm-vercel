import { XMLParser } from "fast-xml-parser";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** Extract the base-36 post id from any Reddit permalink (…/comments/<id>/…). */
function postIdFromPermalink(permalink) {
  const m = String(permalink || "").match(/\/comments\/([a-z0-9]+)/i);
  return m ? m[1] : "";
}

/**
 * Fetch old.reddit's search HTML and return a Map of postId -> { comments }.
 * old.reddit renders the comment count server-side; RSS does not. This is a
 * single search request (not per-post), so it stays within serverless limits.
 * Returns an empty Map if old.reddit is unreachable (e.g. datacenter IP ban),
 * in which case the caller reports comment counts as unknown rather than 0.
 */
async function fetchCommentCounts(query) {
  const counts = new Map();
  try {
    const url = `https://old.reddit.com/search?q=${encodeURIComponent(query)}&sort=new&t=month`;
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return counts;
    const html = await res.text();
    const blocks = html.split("search-result search-result-link").slice(1);
    for (const b of blocks) {
      const perm = (b.match(/href="(https:\/\/old\.reddit\.com\/r\/[^"]+\/comments\/[^"]+)"/) || [])[1];
      const id = postIdFromPermalink(perm);
      if (!id) continue;
      const comments = Number(
        ((b.match(/class="search-comments[^"]*"[^>]*>([\d,]+)\s*comment/) || [])[1] || "0").replace(/,/g, "")
      );
      counts.set(id, comments);
    }
  } catch {
    /* old.reddit unavailable — counts stay empty, reported as unknown */
  }
  return counts;
}

export default async function handler(req, res) {
  try {
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }
    const query = req.query.q || "";
    if (!query) return res.status(400).json({ error: "Missing query" });

    // RSS is the primary source: it is the endpoint that survives Reddit's
    // datacenter IP bans on Vercel, and it uniquely carries the post body.
    const rssUrl = `https://www.reddit.com/search.rss?q=${encodeURIComponent(query)}&sort=new&t=month&limit=100`;

    // Fetch RSS (title/body/date/author) and old.reddit counts in parallel.
    const [response, commentCounts] = await Promise.all([
      fetch(rssUrl, {
        headers: {
          "accept": "application/xml, text/xml, */*; q=0.01",
          "user-agent": UA,
        },
      }),
      fetchCommentCounts(query),
    ]);

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

      // Real comment count from old.reddit when available; null = unknown.
      const postId = postIdFromPermalink(permalink);
      const num_comments = commentCounts.has(postId) ? commentCounts.get(postId) : null;

      return {
        data: {
          title,
          permalink,
          subreddit,
          ups: null, // not available without per-post enrichment (IP-banned on Vercel)
          num_comments,
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
