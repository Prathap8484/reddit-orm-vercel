/**
 * POST /api/fetch-reddit
 *
 * Fetches a Reddit post's public JSON data and returns:
 *   title, subreddit, selftext, permalink, and top-level comments.
 *
 * This is read-only — no Reddit login, no cookies, no posting.
 */

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Normalize any Reddit URL into the canonical JSON endpoint.
 * Supports: reddit.com, www.reddit.com, old.reddit.com, redd.it
 */
function normalizeRedditUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid Reddit URL.");
  }

  const host = url.hostname.toLowerCase();

  if (host === "redd.it") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) throw new Error("Could not extract post ID from redd.it link.");
    const redditUrl = `https://www.reddit.com/comments/${id}.json?raw_json=1`;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(redditUrl)}`;
  }

  if (!host.endsWith("reddit.com")) {
    throw new Error("Only Reddit post URLs are supported.");
  }

  // Strip query string and hash, ensure .json suffix
  url.search = "";
  url.hash = "";
  let pathname = url.pathname.replace(/\/$/, "");

  if (!pathname.includes("/comments/")) {
    throw new Error("Use a Reddit post URL that contains /comments/.");
  }

  if (!pathname.endsWith(".json")) pathname += ".json";
  const redditUrl = `https://www.reddit.com${pathname}?raw_json=1`;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(redditUrl)}`;
}

/** Clean and truncate text for safe display. */
function cleanText(value, limit = 700) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .replace(/\[deleted\]|\[removed\]/gi, "")
    .trim()
    .slice(0, limit);
}

/** Extract top-level comments from the Reddit JSON children array. */
function extractComments(children, maxCount = 8) {
  return (children || [])
    .filter((child) => child?.kind === "t1" && child?.data?.body)
    .slice(0, maxCount)
    .map((child) => ({
      author: cleanText(child.data.author, 80),
      score: Number(child.data.score || 0),
      body: cleanText(child.data.body, 700),
    }))
    .filter((c) => c.body);
}

// ── Vercel serverless handler ────────────────────────────────────────

export default async function handler(req, res) {
  try {
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }
    
    // Accept GET ?url=... or POST { url: '...' }
    let inputUrl;
    if (req.method === "GET" || !req.method) {
      inputUrl = (req.query && req.query.url) || "";
    } else if (req.method === "POST") {
      let body = {};
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON payload in request body." });
      }
      inputUrl = body.url;
    } else {
      return res.status(405).json({ error: "Use GET ?url=... or POST { url: '...' }" });
    }

    if (!inputUrl) {
      return res.status(400).json({ error: "Missing 'url' in request body." });
    }

    // Normalize and fetch from Reddit's public JSON API
    const redditUrl = normalizeRedditUrl(inputUrl);
    const response = await fetch(redditUrl, {
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
      },
    });

    if (!response.ok) {
      console.error(`[reddit.js] Reddit returned ${response.status} for: ${redditUrl}`);
      const hint = response.status === 403
        ? "Reddit blocked the fetch. Open the Reddit post, copy its title + top comments, and paste them in the Post Context box."
        : `Reddit returned ${response.status}. The post may be private or deleted.`;
      return res.status(response.status).json({ error: hint });
    }
    // Reddit sometimes returns HTML even with 200 (bot detection)
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      return res.status(422).json({
        error: "Reddit returned a non-JSON page. Open the post, copy title + comments, and paste them in the Post Context box.",
      });
    }

    const data = await response.json();

    // Reddit JSON structure: [ postListing, commentListing ]
    if (!Array.isArray(data) || !data[0]?.data?.children) {
      console.error(`[reddit.js] Unexpected JSON structure from: ${redditUrl}`);
      return res.status(422).json({ error: "Unexpected Reddit post structure. The JSON format may have changed." });
    }
    const post = data[0].data.children[0]?.data;
    const comments = data[1]?.data?.children || [];

    if (!post) {
      console.error(`[reddit.js] Could not parse post data from: ${redditUrl}`);
      return res.status(422).json({ error: "Could not read the Reddit post. The JSON format may have changed." });
    }

    const title = cleanText(post.title, 300);
    const subreddit = post.subreddit ? `r/${post.subreddit}` : "";
    const selftext = cleanText(post.selftext, 2000);
    const permalink = post.permalink
      ? `https://www.reddit.com${post.permalink}`
      : inputUrl;
    const topComments = extractComments(comments, 8);

    // Build a human-readable context block the AI and UI both consume
    const commentLines = topComments
      .map((c, i) => `Comment ${i + 1} (u/${c.author}, score ${c.score}): ${c.body}`)
      .join("\n\n");
    const context = [
      `Subreddit: ${subreddit}`,
      `Title: ${title}`,
      selftext ? `Post body:\n${selftext}` : "",
      commentLines ? `Top comments:\n${commentLines}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return res.status(200).json({
      title,
      subreddit,
      selftext,
      context,
      permalink,
      comments: topComments,
    });
  } catch (error) {
    console.error(`[reddit.js] Error:`, error.message);
    return res.status(400).json({ error: error.message || "Could not fetch Reddit post." });
  }
}
