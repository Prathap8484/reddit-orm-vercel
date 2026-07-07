import fs from "node:fs";
import "dotenv/config";
import * as cheerio from "cheerio";
import { parseCsv } from "./harvest.mjs";

const IN_FILE = process.argv[2] || "master.csv";
const OUT_FILE = process.argv[3] || "reddit_sheet_output.csv";
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620";

const SHEET_HEADERS = ["Title", "URL", "Comment", "Upvotes", "No. of comments", "Date published"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

if (!API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toSheetCsv(rows) {
  const lines = [SHEET_HEADERS.join(",")];
  for (const row of rows) lines.push(SHEET_HEADERS.map((h) => csvEscape(row[h])).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

function parseSheetCsv(text) {
  const body = text.replace(/^\uFEFF/, "");
  const records = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuotes) {
      if (c === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      records.push(row);
      field = "";
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    records.push(row);
  }
  if (records.length <= 1) return [];
  return records.slice(1).map((r) => Object.fromEntries(SHEET_HEADERS.map((h, i) => [h, r[i] || ""])));
}

function normalizeRedditUrl(url) {
  return String(url || "").replace("www.reddit.com", "old.reddit.com").replace(/\/$/, "");
}

function cleanText(value, limit = 2500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\[deleted\]|\[removed\]/gi, "")
    .trim()
    .slice(0, limit);
}

function inferModel(row) {
  const phone = String(row.phone || "").toUpperCase();
  const title = String(row.title || "").toLowerCase();
  if (phone.includes("S26") || /\bs26\b/.test(title)) return "Samsung Galaxy S26";
  if (phone.includes("A37") || /\ba37\b/.test(title)) return "Samsung Galaxy A37";
  if (phone.includes("A57") || /\ba57\b/.test(title)) return "Samsung Galaxy A57";
  return "Samsung Galaxy A37, A57, or S26 whichever naturally fits";
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRedditContext(permalink) {
  const url = normalizeRedditUrl(permalink);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return { selftext: "", topComments: "" };
    const html = await res.text();
    const $ = cheerio.load(html);
    const blocks = [];
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

function extractJson(text) {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude did not return JSON.");
  return JSON.parse(match[0]);
}

async function analyzeAndDraft(row, context) {
  const targetModel = inferModel(row);
  const system = `You are helping a Reddit community manager prepare a Google Sheet of buying-intent Reddit posts for Samsung Galaxy S26, A37, and A57.

Evaluate whether the post has real buying, upgrade, comparison, or recommendation intent. Reject repair, bug-only, accessories-only, showcase, meme, rooting/custom ROM, and already-purchased posts.

If accepted, write one helpful Reddit comment. The comment must answer the user's situation first, mention the Samsung model only if it fits naturally, include one honest caveat, avoid fake ownership claims, avoid pretending you bought or used the device, avoid corporate marketing language, and stay around 50-100 words.

Return strictly valid JSON only:
{
  "decision": "ACCEPT" | "REJECT",
  "score": 1-5,
  "target_model": "Samsung Galaxy S26" | "Samsung Galaxy A37" | "Samsung Galaxy A57",
  "comment": "final comment if accepted, else empty string",
  "reason": "short reason"
}`;

  const user = `[POST]
Target model from search: ${targetModel}
Subreddit: ${row.subreddit || ""}
Title: ${row.title || ""}
Body: ${context.selftext || ""}
Top comments:
${context.topComments || ""}

Metadata:
Upvotes: ${row.upvotes ?? ""}
Comments: ${row.comments ?? ""}
Date: ${row.date || ""}
URL: ${row.link || ""}`;

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

function buildSheetRow(row, comment) {
  return {
    Title: row.title || "",
    URL: String(row.link || "").replace("old.reddit.com", "www.reddit.com"),
    Comment: comment || "",
    Upvotes: row.upvotes ?? "",
    "No. of comments": row.comments ?? "",
    "Date published": row.date || "",
  };
}

async function run() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`Input file not found: ${IN_FILE}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(IN_FILE, "utf8"));
  const existing = fs.existsSync(OUT_FILE) ? parseSheetCsv(fs.readFileSync(OUT_FILE, "utf8")) : [];
  const seen = new Set(existing.map((r) => r.URL).filter(Boolean));
  const output = [...existing];
  const counts = { processed: 0, accepted: 0, skipped: 0, failed: 0 };

  console.log(`Sheet pipeline started: ${IN_FILE} -> ${OUT_FILE}`);
  console.log(`Existing accepted rows: ${existing.length}`);

  for (const row of rows) {
    const url = String(row.link || "").replace("old.reddit.com", "www.reddit.com");
    if (!url || seen.has(url)) {
      counts.skipped++;
      continue;
    }

    console.log(`\n[${counts.processed + 1}] ${String(row.title || "").slice(0, 80)}`);
    try {
      const context = await fetchRedditContext(row.link);
      const result = await analyzeAndDraft(row, context);
      counts.processed++;

      if (result.decision === "ACCEPT" && Number(result.score) >= 4 && result.comment) {
        output.push(buildSheetRow(row, cleanText(result.comment, 900)));
        seen.add(url);
        counts.accepted++;
        fs.writeFileSync(OUT_FILE, toSheetCsv(output), "utf8");
        console.log(`  accepted (${result.target_model || inferModel(row)})`);
      } else {
        console.log(`  rejected: ${result.reason || "not buying intent"}`);
      }
    } catch (err) {
      counts.failed++;
      console.log(`  failed: ${err.message}`);
    }

    await wait(1800);
  }

  fs.writeFileSync(OUT_FILE, toSheetCsv(output), "utf8");
  console.log(`\nDone. Processed: ${counts.processed} | Accepted: ${counts.accepted} | Skipped: ${counts.skipped} | Failed: ${counts.failed}`);
  console.log(`Sheet-ready CSV: ${OUT_FILE}`);
}

run();
