/**
 * Smoke test: generate one comment-set per new platform.
 *
 * Usage:  node test-platforms.mjs
 * Needs:  ANTHROPIC_API_KEY in .env
 */
import dotenv from "dotenv";
import fs from "fs";
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();
import handler from "./api/generate-comments.js";

const cases = [
  {
    platform: "youtube",
    url: "https://www.youtube.com/watch?v=example",
    title: "Samsung Galaxy A57 Long-Term Review — 3 Months Later",
    context:
      "Channel: TechBurner. Title: Samsung Galaxy A57 Long-Term Review. Description: Three months with the A57. Battery still holds 6 hours SOT, camera processing has improved with the May update, 120Hz AMOLED is still buttery. Vapor chamber keeps it cool. Price still hovering around 32k after bank offers.",
  },
  {
    platform: "gsmarena",
    url: "https://www.gsmarena.com/samsung_galaxy_a57-13190.php",
    title: "Samsung Galaxy A57",
    context:
      "Phone: Samsung Galaxy A57. Key specs: 6.5\" Super AMOLED+ 120Hz, Exynos 1580, 8/12GB RAM, 50MP OIS main + 12MP UW, 5000mAh 45W, IP68, Gorilla Glass Victus+, 6 years of OS updates. Launch price ~₹34,999. Recent user opinions: many praise the battery and updates window, some complain about the in-display fingerprint sensor being slow after MIUI-like One UI 7 update.",
  },
  {
    platform: "samsung_members",
    title: "A57 — sudden battery drain after One UI 7 update?",
    context:
      "Hi all, my A57 was easily doing 1.5 days on one charge before the One UI 7 update. After updating, drops to ~10 hours screen-off in 1 day. Nothing else changed. Is anyone else seeing this? Have I missed a Modes & Routines setting?",
  },
  {
    platform: "twitter",
    title: "Tweet",
    context:
      'Tweet from @MrMobileTech: "Spent 2 weeks with the Galaxy A57. The vapor chamber genuinely works — gaming temps are 6°C cooler than the A55. Battery still the same 5000mAh though. Worth it at 32k?"',
  },
  {
    platform: "techenclave",
    url: "https://techenclave.com/threads/galaxy-a57-vs-pixel-8a-india.198234/",
    title: "Galaxy A57 vs Pixel 8a — India, ~35k budget",
    context:
      "Thread: Galaxy A57 vs Pixel 8a — India, ~35k budget. Recent posts: OP says he's deciding between A57 and Pixel 8a. Wants long updates, good daily camera, decent battery. Reply 1: Pixel 8a camera is in another league but battery is mediocre. Reply 2: A57 has IP68 + 6yr updates + better battery. Pixel wins purely on image processing.",
  },
];

function makeRes() {
  return {
    statusCode: 200,
    _payload: null,
    status(c) { this.statusCode = c; return this; },
    json(p) { this._payload = p; return this; },
  };
}

(async () => {
  for (const c of cases) {
    console.log("\n" + "═".repeat(74));
    console.log(`▶ Platform: ${c.platform.toUpperCase()}`);
    console.log("═".repeat(74));
    const res = makeRes();
    try {
      await handler({ method: "POST", body: c }, res);
      if (res.statusCode >= 400) {
        console.log(`✗ HTTP ${res.statusCode}:`, res._payload);
        continue;
      }
      const p = res._payload;
      if (p?.skipped) {
        console.log("→ Marked as irrelevant.");
        continue;
      }
      if (Array.isArray(p?.comments)) {
        p.comments.forEach((cmt, i) => {
          console.log(`\nComment ${String.fromCharCode(65 + i)}:\n${cmt}`);
        });
      } else {
        console.log("Unexpected payload:", p);
      }
    } catch (err) {
      console.log("✗ Threw:", err.message);
    }
  }
  console.log("\n" + "═".repeat(74) + "\nDone.\n");
})();
