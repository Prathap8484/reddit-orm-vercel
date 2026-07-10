import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

// Helper to determine priority
function calculatePriority({ aiScore, comments, days }) {
  const intent = aiScore != null ? Math.max(0, Math.min(1, (aiScore - 2) / 3)) : 0.6;
  const recency = Math.max(0, Math.min(1, 1 - days / 30));
  const engage = comments != null ? Math.min(1, Math.log10(comments + 1) / 2) : 0;
  return Math.round(100 * (0.5 * intent + 0.3 * recency + 0.2 * engage));
}

export default async function handler(req, res) {
  try {
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error("Missing DATABASE_URL");
      return res.status(500).json({ error: "DATABASE_URL not configured." });
    }

    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const { rows } = await pool.query("SELECT * FROM pending_leads WHERE status = 'pending' ORDER BY created_at DESC");
    
    // Index AI evaluations by post id
    const leads = rows.map(r => {
      const url = r.post_url || "";
      const subredditMatch = url.match(/reddit\.com\/r\/([^/]+)/i);
      const subreddit = subredditMatch ? subredditMatch[1] : "";

      const t = new Date(r.published_date).getTime();
      const days = isNaN(t) ? 0 : (Date.now() - t) / (24 * 3600 * 1000);

      // Derive AI score from the drafted_comment content rather than hardcoding 5.
      // REJECTED posts stored by engine.ts start with "REJECTED:", drafted comments
      // indicate an accepted post.
      const comment = r.drafted_comment || "";
      let aiScore = 3; // default mid-range
      if (comment.startsWith("REJECTED:")) {
        aiScore = 1;
      } else if (comment.length > 100) {
        aiScore = 5; // long, high-quality drafted comment
      } else if (comment.length > 20) {
        aiScore = 4; // shorter but present drafted comment
      }
      
      const pScore = calculatePriority({
        aiScore,
        comments: r.num_comments || 0,
        days: days
      });

      return {
        id: String(r.id),
        title: r.post_title || "",
        link: url.replace("old.reddit.com", "www.reddit.com"),
        subreddit: subreddit,
        author: "", // Add if added to schema
        phone: r.device_model || "",
        date: r.published_date ? new Date(r.published_date).toISOString() : "",
        comments: r.num_comments || 0,
        upvotes: r.upvotes || 0,
        aiScore,
        theme: "General",
        feature: "Various",
        country: "Global",
        reason: comment,
        drafted_comment: comment,
        priorityScore: pScore,
      };
    });

    await pool.end();

    return res.status(200).json({
      leads,
      source: "postgres",
      counts: { total: leads.length, scored: leads.length, harvested: leads.length },
    });
  } catch (error) {
    console.error("[leads.js] Error:", error.message);
    return res.status(500).json({ error: "Could not read harvested leads from database." });
  }
}
