import fs from "node:fs/promises";
import path from "node:path";
import { mergeMaster, toCsv } from "./harvest.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const QUERIES = [
  { phone: "S26", q: 'galaxy s26 (buy OR buying OR upgrade OR worth OR "should i" OR recommend OR suggestion)' },
  { phone: "S26", q: 's26 ultra OR s26 plus (buy OR buying OR upgrade OR worth OR "should i")' },
  { phone: "S26", q: 'best flagship android (buy OR upgrade OR camera OR battery OR recommend)' },
  { phone: "S26", q: '"upgrade from s22" OR "upgrade from s23" OR "upgrade from pixel 7"' },
  { phone: "S26", q: '"samsung vs pixel" flagship (buy OR upgrade OR recommend)' },

  { phone: "A37", q: 'galaxy a37 OR samsung a37 (buy OR buying OR upgrade OR worth OR "should i")' },
  { phone: "A37", q: '"best phone under 40000" (buy OR camera OR battery OR recommend)' },
  { phone: "A37", q: '"best phone under 500" android (buy OR camera OR battery OR recommend)' },
  { phone: "A37", q: '"upgrade from a34" OR "upgrade from a35" OR "upgrade from redmi note"' },
  { phone: "A37", q: '"samsung a series" (buy OR worth OR recommend OR camera OR battery)' },

  { phone: "A57", q: 'galaxy a57 OR samsung a57 (buy OR buying OR upgrade OR worth OR "should i")' },
  { phone: "A57", q: '"best phone under 60000" (buy OR camera OR battery OR recommend)' },
  { phone: "A57", q: '"best phone around 500" android (buy OR camera OR battery OR recommend)' },
  { phone: "A57", q: '"a series vs pixel" (buy OR worth OR camera OR battery)' },
  { phone: "A57", q: '"a series vs poco" (buy OR worth OR camera OR battery)' },
];

const DEFAULT_DAYS = 90;
const MAX_PAGES_PER_QUERY = 12;
const REQUEST_DELAY_MS = 1200;
const ENRICH_DELAY_MS = 700;
const ENRICH_CAP = 800;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { days: DEFAULT_DAYS, out: "." };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days") out.days = Number(args[++i]) || out.days;
    else if (args[i] === "--out") out.out = args[++i] || out.out;
  }
  return out;
}

function timeFilter(days) {
  if (days <= 1) return "day";
  if (days <= 7) return "week";
  if (days <= 31) return "month";
  return "year";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      await wait(5000 * Math.pow(2, attempt));
      continue;
    }
    return null;
  }
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&#x2F;|&#47;/g, "/");
}

function parseSearch(html, phone) {
  const posts = [];
  const blocks = String(html || "").split("search-result search-result-link").slice(1);
  for (const block of blocks) {
    const permalink = (block.match(/href="(https:\/\/old\.reddit\.com\/r\/[^"]+\/comments\/[^"]+)"/) || [])[1];
    const id = (permalink || "").match(/\/comments\/([a-z0-9]+)\//i)?.[1];
    if (!permalink || !id) continue;

    const title = decodeEntities((block.match(/class="search-title[^"]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;

    const comments = Number(((block.match(/class="search-comments[^"]*"[^>]*>([\d,]+)\s*comment/) || [])[1] || "0").replace(/,/g, ""));
    const datetime = (block.match(/datetime="([^"]+)"/) || [])[1];
    const created = datetime && !Number.isNaN(new Date(datetime).getTime()) ? new Date(datetime).getTime() : 0;
    const author = decodeEntities((block.match(/class="search-author">[\s\S]*?<a[^>]*>([^<]+)</) || [])[1] || "");
    const subreddit = (permalink.match(/\/r\/([^/]+)\//) || [])[1] || "";

    posts.push({
      id: `t3_${id}`,
      phone,
      subreddit,
      title,
      upvotes: "",
      comments,
      author,
      link: permalink,
      created,
    });
  }
  const after = html.match(/after=(t3_[a-z0-9]+)/i)?.[1] || null;
  return { posts, after };
}

async function searchQuery({ q, phone }, cutoffMs, t) {
  const collected = [];
  let after = null;
  for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
    const url =
      `https://old.reddit.com/search?q=${encodeURIComponent(q)}&sort=new&t=${t}` +
      `&count=${page * 25}` +
      (after ? `&after=${after}` : "");
    const html = await fetchText(url);
    if (!html) break;

    const { posts, after: next } = parseSearch(html, phone);
    if (!posts.length) break;

    let reachedOld = false;
    for (const post of posts) {
      if (post.created && post.created < cutoffMs) {
        reachedOld = true;
        continue;
      }
      collected.push(post);
    }

    if (reachedOld || !next) break;
    after = next;
    await wait(REQUEST_DELAY_MS);
  }
  return collected;
}

async function enrichUpvotes(row) {
  const html = await fetchText(row.link, 2);
  if (!html) return "";
  return html.match(/data-fullname="t3_[^"]*"[\s\S]{0,600}?data-score="(\d+)"/)?.[1] ||
    html.match(/data-score="(\d+)"/)?.[1] ||
    "";
}

function fmtDate(ms) {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function run() {
  const { days, out } = parseArgs();
  const cutoffMs = Date.now() - days * 24 * 3600 * 1000;
  const t = timeFilter(days);
  const rows = [];
  const seen = new Set();
  const perPhone = { S26: 0, A37: 0, A57: 0 };

  console.log(`\nBroad Reddit harvest without API`);
  console.log(`Window: ${days} day(s) | Queries: ${QUERIES.length}\n`);

  for (const query of QUERIES) {
    const posts = await searchQuery(query, cutoffMs, t);
    let kept = 0;
    for (const post of posts) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      rows.push({
        date: fmtDate(post.created),
        phone: post.phone,
        subreddit: `r/${post.subreddit}`,
        title: post.title,
        upvotes: post.upvotes,
        comments: post.comments,
        author: post.author,
        link: post.link,
        _created: post.created,
      });
      perPhone[post.phone] = (perPhone[post.phone] || 0) + 1;
      kept++;
    }
    console.log(`  ${query.phone}: ${kept} from "${query.q}"`);
    await wait(REQUEST_DELAY_MS);
  }

  const toEnrich = rows.slice(0, ENRICH_CAP);
  if (toEnrich.length) console.log(`\nEnriching upvotes for ${toEnrich.length} post(s)...`);
  for (let i = 0; i < toEnrich.length; i++) {
    toEnrich[i].upvotes = await enrichUpvotes(toEnrich[i]);
    if ((i + 1) % 25 === 0) console.log(`  enriched ${i + 1}/${toEnrich.length}`);
    await wait(ENRICH_DELAY_MS);
  }

  rows.sort((a, b) => b._created - a._created);
  rows.forEach((row) => delete row._created);

  await fs.mkdir(out, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const snapshot = path.join(out, `broad-harvest-${stamp}.csv`);
  await fs.writeFile(snapshot, toCsv(rows), "utf8");

  const masterPath = path.join(out, "master.csv");
  const { added, total } = await mergeMaster(masterPath, rows);

  console.log(`\nThis run: ${rows.length} posts`);
  console.log(`S26: ${perPhone.S26 || 0} | A37: ${perPhone.A37 || 0} | A57: ${perPhone.A57 || 0}`);
  console.log(`Snapshot: ${snapshot}`);
  console.log(`Master: +${added} new, ${total} total -> ${masterPath}\n`);
}

run().catch((err) => {
  console.error("Broad harvest failed:", err);
  process.exit(1);
});
