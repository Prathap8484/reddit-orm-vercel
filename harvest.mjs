/**
 * Daily Reddit harvester — Samsung Galaxy S26 / A37 / A57.
 *
 * Usage:   node harvest.mjs
 *          node harvest.mjs --hours 24
 *          node harvest.mjs --hours 48 --out ./reports
 *
 * Sweeps the subreddits in SUBREDDITS, reads each one's "new" listing from
 * old.reddit (which still works without a Reddit API key), keyword-filters
 * for the three phones, de-duplicates, and writes a dated CSV with:
 *
 *   date, phone, subreddit, title, upvotes, comments, author, link
 *
 * Why old.reddit HTML and not the JSON API:
 *   Reddit now returns 403 for every unauthenticated *.json endpoint, but the
 *   classic old.reddit listing pages still render server-side HTML that carries
 *   the score / comment-count / timestamp as data-attributes. We parse those.
 */

import fs from "node:fs/promises";
import path from "node:path";

// ── Config ───────────────────────────────────────────────────────────

// Subreddits to sweep. Add or remove freely — unknown/empty ones are skipped.
const SUBREDDITS = [
  // Phone-dedicated subs (high match density, native scores). Kept small on
  // purpose: the Reddit-wide search below already covers every other subreddit,
  // and sweeping big general subs just wastes the rate-limit budget.
  "GalaxyS26",
  "GalaxyS26Ultra",
  "GalaxyA57",
  "GalaxyA56",
  "GalaxyA37",
  "samsung",
  "SamsungGalaxy",
  "samsunggalaxy",
];

// Phone matchers. Each post is tagged with whichever phones its title matches.
// Patterns are case-insensitive and word-boundary anchored to avoid false hits.
const PHONES = [
  { tag: "S26", re: /\b(galaxy\s*)?s26(\s*(ultra|plus|\+|fe))?\b/i },
  { tag: "A37", re: /\b(galaxy\s*)?a37\b/i },
  { tag: "A57", re: /\b(galaxy\s*)?a57\b/i },
];

// Reddit-wide keyword searches — catch posts in ANY subreddit, not just the
// swept list. Multiple name variants per phone widen recall. These have no
// score in the results, so we enrich them below.
const intent = '(buy OR buying OR upgrade OR worth OR "should i" OR review OR switch)';
const SEARCH_QUERIES = [
  // S26
  `galaxy s26 ${intent}`, `s26 ultra ${intent}`, `s26 plus ${intent}`, `s26 fe ${intent}`, `samsung s26 ${intent}`,
  // A37
  `galaxy a37 ${intent}`, `samsung a37 ${intent}`, `a37 5g ${intent}`,
  // A57
  `galaxy a57 ${intent}`, `samsung a57 ${intent}`, `a57 5g ${intent}`,
];

const MAX_SEARCH_PAGES = 40; // up to ~1000 results/query (expanded for strict 80-100 lead goal)
const ENRICH_CAP = 1500; // max per-post score lookups (bounds runtime)

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const REQUEST_DELAY_MS = 1200; // polite gap between requests
const ENRICH_DELAY_MS = 800; // lighter gap for the many score lookups
const MAX_PAGES_PER_SUB = 20; // safety cap (25 posts/page)

// Per-phone target you want to hit (for the summary readout).
// To get 80-100 approved leads at a ~20% pass rate, we need ~500 raw leads.
const TARGET_PER_PHONE = 500;

// ── Args ─────────────────────────────────────────────────────────────

function parseArgs() {
  const a = process.argv.slice(2);
  const out = { hours: 90 * 24, out: "." }; // default: last 90 days (3 months)
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--days") out.hours = (Number(a[++i]) || 90) * 24;
    else if (a[i] === "--hours") out.hours = Number(a[++i]) || out.hours;
    else if (a[i] === "--out") out.out = a[++i] || out.out;
  }
  return out;
}

/** Map a window in hours to Reddit search's coarse time filter (t=...). */
function timeFilter(hours) {
  if (hours <= 24) return "day";
  if (hours <= 7 * 24) return "week";
  if (hours <= 31 * 24) return "month";
  return "year"; // Default to year since we need 90 days
}

// ── Helpers ──────────────────────────────────────────────────────────

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with Reddit-aware rate-limit handling. On HTTP 429 it backs off
 * (5s, 10s, 20s) and retries, so a throttle doesn't silently kill a phase.
 * Returns the response text, or null if it ultimately fails.
 */
async function fetchText(url, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "user-agent": UA } });
    } catch {
      return null;
    }
    if (res.ok) return res.text();
    if (res.status === 429 && attempt < retries) {
      const backoff = 5000 * Math.pow(2, attempt);
      console.log(`    rate-limited (429), waiting ${backoff / 1000}s...`);
      await wait(backoff);
      continue;
    }
    return null; // non-retryable, or out of retries
  }
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&#32;/g, " ")
    .replace(/&#x2F;|&#47;/g, "/");
}

/** Pull one attribute value out of an opening <div ...> tag. */
function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : "";
}

/** Match a title against the phone list; returns matched tags (e.g. ["S26"]). */
function matchPhones(title) {
  return PHONES.filter((p) => p.re.test(title)).map((p) => p.tag);
}

/**
 * Parse an old.reddit listing page into post records.
 * Each post lives in a <div class=" thing ... " data-*="..."> block.
 */
function parseListing(html) {
  const posts = [];
  // Split on the thing-div opening so each chunk starts at one post.
  const chunks = html.split(/<div class=" thing /).slice(1);
  for (const chunk of chunks) {
    const tag = "<div class=\" thing " + chunk.slice(0, chunk.indexOf(">") + 1);
    if (attr(tag, "data-promoted") === "true") continue; // skip ads
    const id = attr(tag, "data-fullname");
    if (!id.startsWith("t3_")) continue;

    // Title sits in the first <a ... class="title ...">TITLE</a> after the tag.
    const titleMatch = chunk.match(/class="title[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    const title = decodeEntities((titleMatch ? titleMatch[1] : "").replace(/<[^>]+>/g, " ")).trim();

    posts.push({
      id,
      title,
      score: Number(attr(tag, "data-score") || 0),
      comments: Number(attr(tag, "data-comments-count") || 0),
      created: Number(attr(tag, "data-timestamp") || 0), // ms epoch
      author: attr(tag, "data-author"),
      subreddit: attr(tag, "data-subreddit"),
      permalink: "https://old.reddit.com" + decodeEntities(attr(tag, "data-permalink")),
    });
  }
  // Next-page cursor: the "next" button links contain after=t3_xxx
  const nextMatch = html.match(/after=(t3_[a-z0-9]+)/i);
  return { posts, after: nextMatch ? nextMatch[1] : null };
}

/**
 * Parse an old.reddit search results page. These blocks carry comments + date
 * + permalink + author + subreddit, but NOT score (enriched separately).
 */
function parseSearch(html) {
  const posts = [];
  const blocks = html.split("search-result search-result-link").slice(1);
  for (const b of blocks) {
    const perm = (b.match(/href="(https:\/\/old\.reddit\.com\/r\/[^"]+\/comments\/[^"]+)"/) || [])[1];
    if (!perm) continue;
    const idM = perm.match(/\/comments\/([a-z0-9]+)\//i);
    if (!idM) continue;
    const title = decodeEntities((b.match(/class="search-title[^"]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "")
      .replace(/<[^>]+>/g, " ").trim();
    const comments = Number(((b.match(/class="search-comments[^"]*"[^>]*>([\d,]+)\s*comment/) || [])[1] || "0").replace(/,/g, ""));
    const dt = (b.match(/datetime="([^"]+)"/) || [])[1];
    const author = decodeEntities((b.match(/class="search-author">[\s\S]*?<a[^>]*>([^<]+)</) || [])[1] || "");
    const sub = (perm.match(/\/r\/([^/]+)\//) || [])[1] || "";
    posts.push({
      id: "t3_" + idM[1],
      title,
      score: null, // unknown until enriched
      comments,
      created: dt && !isNaN(new Date(dt).getTime()) ? new Date(dt).getTime() : 0,
      author,
      subreddit: sub,
      permalink: perm,
    });
  }
  const nextMatch = html.match(/after=(t3_[a-z0-9]+)/i);
  return { posts, after: nextMatch ? nextMatch[1] : null };
}

/** Run one keyword search across all of Reddit, paging back to the cutoff. */
async function searchQuery(query, cutoffMs, t) {
  const collected = [];
  let after = null;
  for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
    const url =
      `https://old.reddit.com/search?q=${encodeURIComponent(query)}&sort=new&t=${t}` +
      `&count=${page * 25}` + (after ? `&after=${after}` : "");
    const html = await fetchText(url);
    if (!html) break;
    const { posts, after: next } = parseSearch(html);
    if (posts.length === 0) break;
    let reachedOld = false;
    for (const p of posts) {
      if (p.created && p.created < cutoffMs) { reachedOld = true; continue; }
      collected.push(p);
    }
    if (reachedOld || !next) break;
    after = next;
    await wait(REQUEST_DELAY_MS);
  }
  return collected;
}

/** Fetch a single post page and read its real upvote score, or null. */
async function enrichScore(permalink) {
  const html = await fetchText(permalink, 2);
  if (!html) return null;
  const m = html.match(/data-fullname="t3_[^"]*"[\s\S]{0,500}?data-score="(\d+)"/) ||
    html.match(/data-score="(\d+)"/);
  return m ? Number(m[1]) : null;
}

/** Fetch one subreddit's new listing, paging back until older than cutoff. */
async function sweepSubreddit(sub, cutoffMs) {
  const collected = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES_PER_SUB; page++) {
    const url =
      `https://old.reddit.com/r/${sub}/new/?count=${page * 25}` +
      (after ? `&after=${after}` : "");
    const html = await fetchText(url);
    if (!html) {
      if (page === 0) console.log(`  r/${sub}: unavailable — skipped`);
      break;
    }

    const { posts, after: next } = parseListing(html);
    if (posts.length === 0) break;

    let reachedOld = false;
    for (const p of posts) {
      if (p.created && p.created < cutoffMs) {
        reachedOld = true;
        continue;
      }
      collected.push(p);
    }

    if (reachedOld || !next) break; // everything past here is older than window
    after = next;
    await wait(REQUEST_DELAY_MS);
  }
  return collected;
}

const CSV_HEADERS = ["date", "phone", "subreddit", "title", "upvotes", "comments", "author", "link"];

/** Build a CSV string with proper quoting. */
function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) lines.push(CSV_HEADERS.map((h) => esc(r[h])).join(","));
  return "﻿" + lines.join("\r\n"); // BOM so Excel reads UTF-8 cleanly
}

function fmtDate(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parse a CSV string written by toCsv() back into row objects. */
function parseCsv(text) {
  const body = text.replace(/^﻿/, "");
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
  return records.slice(1)
    .filter((r) => r.length >= CSV_HEADERS.length)
    .map((r) => Object.fromEntries(CSV_HEADERS.map((h, i) => [h, r[i]])));
}

/**
 * Merge today's rows into a growing master CSV, de-duplicating by link.
 * Returns { added, total }. This is how volume accumulates across daily runs.
 */
async function mergeMaster(masterPath, freshRows) {
  let existing = [];
  try {
    existing = parseCsv(await fs.readFile(masterPath, "utf8"));
  } catch {
    /* no master yet — first run */
  }
  const seenLinks = new Set(existing.map((r) => r.link));
  let added = 0;
  for (const r of freshRows) {
    if (seenLinks.has(r.link)) continue;
    seenLinks.add(r.link);
    existing.push(r);
    added++;
  }
  // Newest first by date string (ISO-ish, so lexical sort works).
  existing.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  await fs.writeFile(masterPath, toCsv(existing), "utf8");
  return { added, total: existing.length };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const { hours, out } = parseArgs();
  const cutoffMs = Date.now() - hours * 3600 * 1000;
  const t = timeFilter(hours);

  console.log(`\n  Reddit Harvest — S26 / A37 / A57`);
  console.log(`  Window: last ${Math.round(hours / 24)} day(s)  |  Subreddits: ${SUBREDDITS.length}  |  Queries: ${SEARCH_QUERIES.length}\n`);

  const seen = new Set();
  const rows = [];
  const perPhone = { S26: 0, A37: 0, A57: 0 };

  // Add a post to the result set if it's new and matches a phone. Returns true if kept.
  const addPost = (p) => {
    if (seen.has(p.id)) return false;
    const tags = matchPhones(p.title);
    if (tags.length === 0) return false;
    seen.add(p.id);
    for (const t of tags) perPhone[t] = (perPhone[t] || 0) + 1;
    rows.push({
      date: fmtDate(p.created),
      phone: tags.join(" / "),
      subreddit: "r/" + p.subreddit,
      title: p.title,
      upvotes: p.score, // numeric, or null if not yet known
      comments: p.comments,
      author: p.author,
      link: p.permalink,
      _created: p.created,
    });
    return true;
  };

  // Phase 1: Reddit-wide keyword search first (highest yield), enrich scores later.
  const pendingScore = [];
  for (const q of SEARCH_QUERIES) {
    const posts = await searchQuery(q, cutoffMs, t);
    let kept = 0;
    for (const p of posts) {
      if (addPost(p)) { kept++; if (p.score === null) pendingScore.push(p); }
    }
    console.log(`  search "${q}": ${kept} new post(s)`);
    await wait(REQUEST_DELAY_MS);
  }

  // Phase 2: sweep phone-dedicated subs (native scores; catches anything search missed).
  for (const sub of SUBREDDITS) {
    const posts = await sweepSubreddit(sub, cutoffMs);
    let kept = 0;
    for (const p of posts) if (addPost(p)) kept++;
    console.log(`  r/${sub}: ${kept} matching post(s)`);
    await wait(REQUEST_DELAY_MS);
  }

  // Enrich the search-discovered posts with their real upvote count.
  const toEnrich = pendingScore.slice(0, ENRICH_CAP);
  if (toEnrich.length) console.log(`\n  Enriching upvotes for ${toEnrich.length} post(s) (~${Math.ceil(toEnrich.length * ENRICH_DELAY_MS / 60000)} min)...`);
  let done = 0;
  for (const p of toEnrich) {
    const score = await enrichScore(p.permalink);
    const row = rows.find((r) => r.link === p.permalink);
    if (row) row.upvotes = score; // may stay null if lookup failed
    if (++done % 25 === 0) console.log(`    enriched ${done}/${toEnrich.length}`);
    await wait(ENRICH_DELAY_MS);
  }

  rows.sort((a, b) => b._created - a._created);
  rows.forEach((r) => delete r._created);

  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(out, `harvest-${stamp}.csv`);
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(file, toCsv(rows), "utf8");

  // Accumulate into the growing master spreadsheet (de-duped by link).
  const masterPath = path.join(out, "master.csv");
  const { added, total } = await mergeMaster(masterPath, rows);

  const mark = (n) => (n >= TARGET_PER_PHONE ? "✓ target met" : `${TARGET_PER_PHONE - n} short of ${TARGET_PER_PHONE}`);
  console.log(`\n  ─────────────────────────────`);
  console.log(`  This run: ${rows.length} posts`);
  console.log(`  S26: ${perPhone.S26}  (${mark(perPhone.S26)})`);
  console.log(`  A37: ${perPhone.A37}  (${mark(perPhone.A37)})`);
  console.log(`  A57: ${perPhone.A57}  (${mark(perPhone.A57)})`);
  console.log(`  Snapshot saved: ${file}`);
  console.log(`  Master: +${added} new, ${total} total → ${masterPath}\n`);
}

// Run only when invoked directly (so the helpers can be imported in tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("harvest.mjs")) {
  main().catch((e) => {
    console.error("Harvest failed:", e);
    process.exit(1);
  });
}

export { toCsv, parseCsv, mergeMaster, CSV_HEADERS };
