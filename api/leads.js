/**
 * GET /api/leads
 *
 * Serves the harvested leads as a ranked "priority dashboard".
 *
 * It reads two files produced by the local pipeline:
 *   - master.csv          (harvest.mjs)   → date, upvotes, comments, phone
 *   - filtered_leads.csv  (ai-filter.mjs) → AI intent score, theme, feature, reason
 *
 * The two are joined on the Reddit post id, then each lead gets a single
 * priorityScore (0-100) blending intent, recency, and engagement so the most
 * actionable threads float to the top. If filtered_leads.csv is missing, it
 * falls back to master.csv alone and scores intent from the title keywords.
 */

import fs from "node:fs";
import path from "node:path";

// ── CSV parsing ──────────────────────────────────────────────────────

/** Parse a CSV string (RFC-4180 quoting) into an array of row objects. */
function parseCsv(text) {
  const body = String(text || "").replace(/^﻿/, "");
  const records = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuotes) {
      if (c === '"') {
        if (body[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); records.push(row); field = ""; row = []; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); records.push(row); }
  if (records.length <= 1) return [];
  const headers = records[0].map((h) => h.trim());
  return records.slice(1)
    .filter((r) => r.length >= headers.length && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

/** Read the first of several candidate paths that exists, or "". */
function readFirst(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch { /* keep trying */ }
  }
  return "";
}

// ── Helpers ──────────────────────────────────────────────────────────

const postId = (link) => (String(link || "").match(/\/comments\/([a-z0-9]+)/i) || [])[1] || "";
const num = (v) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
};

const INTENT_RE = /\b(buy|buying|upgrade|worth|should i|vs\.?|versus|recommend|which phone|switch|thinking of getting|help me choose)\b/i;

/** Days since a "YYYY-MM-DD ..." date string; large number if unparseable. */
function daysSince(dateStr) {
  const t = new Date(String(dateStr || "").replace(" ", "T")).getTime();
  if (isNaN(t)) return 999;
  return (Date.now() - t) / (24 * 3600 * 1000);
}

/**
 * Blend the three signals into a 0-100 priority score.
 *   intent   0..1  (AI score 3-5 → 0..1, or title keyword hit → 0.6)
 *   recency  0..1  (today → 1, linear to 0 at 30 days)
 *   engage   0..1  (comment count, log-scaled: ~100 comments → 1)
 */
function priority({ aiScore, hasIntentKeyword, comments, days }) {
  const intent = aiScore != null
    ? Math.max(0, Math.min(1, (aiScore - 2) / 3))
    : (hasIntentKeyword ? 0.6 : 0.3);
  const recency = Math.max(0, Math.min(1, 1 - days / 30));
  const engage = comments != null ? Math.min(1, Math.log10(comments + 1) / 2) : 0;
  return Math.round(100 * (0.5 * intent + 0.3 * recency + 0.2 * engage));
}

// ── Handler ──────────────────────────────────────────────────────────

export default function handler(req, res) {
  try {
    if (process.env.APP_PASSWORD && req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized. Please set your passcode in Settings." });
    }

    const cwd = process.cwd();
    const masterText = readFirst([
      path.join(cwd, "master.csv"),
      path.join(cwd, "reports", "master.csv"),
    ]);
    const filteredText = readFirst([
      path.join(cwd, "filtered_leads.csv"),
      path.join(cwd, "reports", "filtered_leads.csv"),
    ]);

    const masterRows = parseCsv(masterText);
    const filteredRows = parseCsv(filteredText);

    if (masterRows.length === 0 && filteredRows.length === 0) {
      return res.status(200).json({
        leads: [],
        source: "none",
        message: "No harvested data yet. Run `node harvest.mjs` (and optionally `node ai-filter.mjs`) locally first.",
      });
    }

    // Index master by post id for engagement/date lookup.
    const masterById = new Map();
    for (const r of masterRows) {
      const id = postId(r.link);
      if (id) masterById.set(id, r);
    }

    // Index AI evaluations by post id.
    const aiById = new Map();
    for (const r of filteredRows) {
      const id = postId(r.Link);
      if (id) aiById.set(id, r);
    }

    // Base set: prefer master (has engagement + date for everything); if master
    // is empty, fall back to the filtered rows alone.
    const baseIds = masterById.size ? [...masterById.keys()] : [...aiById.keys()];

    const leads = baseIds.map((id) => {
      const m = masterById.get(id) || {};
      const ai = aiById.get(id) || {};
      const title = m.title || ai.Title || "";
      const link = m.link || ai.Link || "";
      const comments = num(m.comments);
      const upvotes = num(m.upvotes);
      const dateStr = m.date || "";
      const days = daysSince(dateStr);
      const aiScore = num(ai.Score);

      return {
        id,
        title,
        link: link.replace("old.reddit.com", "www.reddit.com"),
        subreddit: (m.subreddit || (ai.Subreddit ? "r/" + ai.Subreddit : "") || "").replace(/^r\//, ""),
        author: m.author || "",
        phone: m.phone || "",
        date: dateStr,
        comments,
        upvotes,
        aiScore,
        theme: ai.Theme || "",
        feature: ai.Feature || "",
        country: ai.Country || "",
        reason: ai.Reason || "",
        priorityScore: priority({
          aiScore,
          hasIntentKeyword: INTENT_RE.test(title),
          comments,
          days,
        }),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

    return res.status(200).json({
      leads,
      source: aiById.size ? "master+ai" : "master",
      counts: { total: leads.length, scored: aiById.size, harvested: masterById.size },
    });
  } catch (error) {
    console.error("[leads.js] Error:", error.message);
    return res.status(500).json({ error: "Could not read harvested leads." });
  }
}
