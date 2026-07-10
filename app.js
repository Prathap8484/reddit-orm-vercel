const options = {
  devices: ["A57", "A37", "Both"],
  topics: ["Buying advice", "Comparison", "Camera", "Battery", "Performance", "Price/value", "Launch/speculation", "Complaint", "General A-series"],
  angles: ["Battery", "Display", "Software updates", "Camera", "Price/value", "Reliability", "Samsung ecosystem", "Service availability"],
  statuses: ["Drafted", "Needs review", "Posted", "Skipped"],
  priorities: ["High", "Medium", "Low"]
};

const COMMENT_LABELS = ["Generated Comment"];

const reusableTemplates = [
  {
    label: "Price caveat",
    text: "nobody pays launch price for Samsung tbh. wait for Big Billion Days, always drops 30-40%. effective price after stacking discount changes the whole story"
  },
  {
    label: "Spec caution",
    text: "specs on paper mean nothing until real-world thermals are tested ngl. display, update policy, and service support matter more after 6 months"
  },
  {
    label: "Comparison",
    text: "S24 FE literally cheaper and has a better chip, hard to justify at launch. Pixel wins on stills ngl, I just wanted the battery"
  },
  {
    label: "Camera caution",
    text: "portraits over-process af, faces look plastic in close shots. daylight pics decent but low light is rough. wait for real samples before deciding"
  }
];

const storeKey = "samsungRedditOrmWorkbench.v2";
const recentPhrasesKey = "orm_recent_openings";
const apiBase = window.location.protocol === "file:" ? "http://127.0.0.1:4180" : "";
let currentPostIsIrrelevant = false;
// Scraped post fields â€” set when fetching, restored when loading from queue
let scrapedTitle = "";
let scrapedSelftext = "";
let scrapedTopComments = [];
const state = {
  posts: loadPosts(),
  currentSelectedPostId: null,
  queueFilter: "All",
  platformFilter: "All",
  activeCommentSlot: 0
};

const PLATFORM_LABELS = {
  reddit: "Reddit",
  quora: "Quora",
};

const PLATFORM_PASTE_ONLY = new Set(["quora"]);

function currentPlatform() {
  // Radio buttons (new UI)
  const radio = document.querySelector('input[name="platform"]:checked');
  if (radio) return radio.value;
  // Hidden input fallback (for restored queue items)
  const el = document.getElementById("platformSelect");
  return (el && el.value) || "reddit";
}

function setPlatform(value) {
  // Set radio button
  const radio = document.querySelector(`input[name="platform"][value="${value}"]`);
  if (radio) radio.checked = true;
  // Keep hidden input in sync
  const hidden = document.getElementById("platformSelect");
  if (hidden) hidden.value = value;
  // Update the visible chip
  const chip = document.getElementById("platformChip");
  if (chip) chip.textContent = PLATFORM_LABELS[value] || value;
}

const $ = (id) => document.getElementById(id);

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch {
    return [];
  }
}

function loadSetting(key, defaultValue) {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch { }
}

function savePosts() {
  localStorage.setItem(storeKey, JSON.stringify(state.posts));
}

function getRecentOpenings() {
  try {
    return JSON.parse(localStorage.getItem(recentPhrasesKey) || "[]");
  } catch {
    return [];
  }
}

function saveRecentOpenings(newOpenings) {
  try {
    const existing = getRecentOpenings();
    const merged = [...newOpenings, ...existing].slice(0, 20);
    localStorage.setItem(recentPhrasesKey, JSON.stringify(merged));
  } catch { }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// â”€â”€â”€ Phase 5: Operational Humanization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const weeklyBiasKey    = "orm_weekly_mood_bias";
const dailyBiasKey     = "orm_daily_writing_bias";
const accountTraitsKey = "orm_account_traits";

const MOOD_BIASES    = ["optimistic", "tired", "skeptical", "low-energy", "annoyed", "neutral", "neutral"];
const WRITING_BIASES = ["clean", "clean", "clean", "rushed", "messy", "distracted"];

function isoWeek() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(y, 0, 1));
  return `${y}-W${Math.ceil((((d - jan1) / 86400000) + 1) / 7)}`;
}

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getWeeklyMoodBias() {
  try {
    const s = JSON.parse(localStorage.getItem(weeklyBiasKey) || "null");
    const week = isoWeek();
    if (s && s.week === week) return s.bias;
    const bias = randFrom(MOOD_BIASES);
    localStorage.setItem(weeklyBiasKey, JSON.stringify({ week, bias }));
    return bias;
  } catch { return "neutral"; }
}

function getDailyWritingBias() {
  try {
    const s = JSON.parse(localStorage.getItem(dailyBiasKey) || "null");
    const day = today();
    if (s && s.day === day) return s.bias;
    const bias = randFrom(WRITING_BIASES);
    localStorage.setItem(dailyBiasKey, JSON.stringify({ day, bias }));
    return bias;
  } catch { return "clean"; }
}

function getAccountTraits() {
  try {
    const s = JSON.parse(localStorage.getItem(accountTraitsKey) || "null");
    if (s) return s;
    const lvl = ["low", "medium", "high"];
    const traits = {
      prefersBattery:           Math.random() > 0.6,
      prefersCompactPhones:     Math.random() > 0.7,
      skepticalOfChineseBrands: randFrom(lvl),
      casualGrammar:            randFrom(["low", "medium", "medium", "high"]),
      technicalDepth:           randFrom(["low", "low", "medium", "high"]),
      positivityBias:           randFrom(["low", "medium", "medium", "high"]),
      appleFriendly:            Math.random() > 0.75,
      samsungLoyalty:           randFrom(["low", "medium", "medium", "high"]),
    };
    localStorage.setItem(accountTraitsKey, JSON.stringify(traits));
    return traits;
  } catch { return {}; }
}

function buildTraitContext(traits) {
  if (!traits || typeof traits !== "object") return "";
  const parts = [];
  if (traits.prefersBattery)                     parts.push("tends to mention battery life");
  if (traits.prefersCompactPhones)               parts.push("prefers smaller form factors");
  if (traits.skepticalOfChineseBrands === "high") parts.push("skeptical of Chinese brand durability");
  if (traits.casualGrammar === "high")           parts.push("writes casually with minimal punctuation");
  if (traits.technicalDepth === "high")          parts.push("comfortable using technical terms naturally");
  else if (traits.technicalDepth === "low")      parts.push("avoids specs, speaks from experience");
  if (traits.positivityBias === "low")           parts.push("leans cautious or skeptical");
  if (traits.samsungLoyalty === "high")          parts.push("has prior Samsung ownership");
  return parts.join(", ");
}

function computeAccountBehaviorRisk() {
  if (state.posts.length < 5) return null;
  const warnings = [];
  const recent = state.posts.slice(0, 20);

  // Subreddit concentration
  const subs = recent.map(p => p.subreddit).filter(Boolean);
  if (subs.length > 3) {
    const counts = subs.reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
    const topRatio = Math.max(...Object.values(counts)) / subs.length;
    if (topRatio > 0.7) warnings.push("subreddit concentration");
  }

  // Burst today
  const todayCount = recent.filter(p => p.date === today()).length;
  if (todayCount > 6) warnings.push("posting burst today");

  // Topic repetition
  const topics = recent.map(p => p.topic).filter(Boolean);
  if (topics.length > 4) {
    const counts = topics.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {});
    const topRatio = Math.max(...Object.values(counts)) / topics.length;
    if (topRatio > 0.8) warnings.push("topic over-repetition");
  }

  return warnings.length ? `Behavior risk: ${warnings.join(", ")}. Consider skipping upcoming posts.` : null;
}

// â”€â”€â”€ Phase 6: Long-Term Operational Realism â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACCOUNT_PROFILE_KEY = "orm_account_profile";
const MOOD_HISTORY_KEY    = "orm_mood_history";

// Session-level tracking â€” resets on page reload
let _sessionCommentCount = 0;
let _sessionStartTs      = Date.now();

function incrementSessionCount() {
  if (Date.now() - _sessionStartTs > 3 * 60 * 60 * 1000) {
    _sessionCommentCount = 0;
    _sessionStartTs = Date.now();
  }
  _sessionCommentCount += 1;
}

function getSessionFatigue() {
  return Math.min(1, _sessionCommentCount / 20);
}

function _buildSubredditAffinity() {
  const subs = ["android", "samsunggalaxy", "smartphones", "pickanandroidforme", "gadgetsindia", "googlepixel", "india", "oneplus"];
  const affinity = {};
  for (const sub of subs) {
    affinity[sub] = Math.random() < 0.25 ? Math.random() * 0.4 + 0.6 : Math.random() * 0.4;
  }
  return affinity;
}

function getAccountProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(ACCOUNT_PROFILE_KEY) || "null");
    if (stored) {
      // Migrate profiles created before Phase 7
      let migrated = false;
      if (!stored.archetypeId)         { stored.archetypeId         = randFrom(ACCOUNT_ARCHETYPES); migrated = true; }
      if (!stored.languageQuirks)      { stored.languageQuirks      = [...LANGUAGE_QUIRKS_POOL].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.6 ? 1 : 2); migrated = true; }
      if (!stored.samsungSentimentTier){ stored.samsungSentimentTier = pickSentimentTier(); migrated = true; }
      if (migrated) { try { localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(stored)); } catch {} }
      return applyTemporalDrift(stored);
    }

    const lvl = ["low", "medium", "high"];
    const profile = {
      // Core traits (Phase 5 compatible)
      prefersBattery:           Math.random() > 0.6,
      prefersCompactPhones:     Math.random() > 0.7,
      skepticalOfChineseBrands: randFrom(lvl),
      casualGrammar:            randFrom(["low", "medium", "medium", "high"]),
      technicalDepth:           randFrom(["low", "low", "medium", "high"]),
      positivityBias:           randFrom(["low", "medium", "medium", "high"]),
      appleFriendly:            Math.random() > 0.75,
      samsungLoyalty:           randFrom(["low", "medium", "medium", "high"]),
      // Phase 6 extended
      postingStyle:       randFrom(["night_owl", "office_hours", "weekend_only", "irregular", "irregular"]),
      emotionalBaseline:  randFrom(["cynical", "neutral", "neutral", "positive", "tired"]),
      samsungAffinity:    randFrom(["skeptical", "neutral", "neutral", "familiar"]),
      activityLevel:      randFrom(["low", "medium", "medium", "high"]),
      inactivityProb:     Math.random() * 0.35,
      grammarQuality:     randFrom(["poor", "inconsistent", "inconsistent", "decent"]),
      favoriteTopics:     [...["Battery", "Camera", "Buying advice", "Comparison", "Performance"]].sort(() => Math.random() - 0.5).slice(0, 2),
      subredditAffinity:  _buildSubredditAffinity(),
      // Temporal metadata
      createdAt:         new Date().toISOString(),
      lastDriftMonth:    new Date().toISOString().slice(0, 7),
      // Phase 7: population simulation
      archetypeId:          randFrom(ACCOUNT_ARCHETYPES),
      languageQuirks:       [...LANGUAGE_QUIRKS_POOL].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.6 ? 1 : 2),
      samsungSentimentTier: pickSentimentTier(),
    };
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch { return {}; }
}

function applyTemporalDrift(profile) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (profile.lastDriftMonth === currentMonth) return profile;

  const mutated = { ...profile };
  const lvl = ["low", "medium", "high"];
  const affinities = ["skeptical", "neutral", "familiar"];

  // Drift samsungAffinity Â±1 step (opinion instability)
  const aIdx = affinities.indexOf(mutated.samsungAffinity || "neutral");
  if (Math.random() < 0.4) {
    mutated.samsungAffinity = affinities[Math.max(0, Math.min(2, aIdx + (Math.random() < 0.5 ? -1 : 1)))] || "neutral";
  }

  // Drift positivityBias
  const pIdx = lvl.indexOf(mutated.positivityBias || "medium");
  if (Math.random() < 0.35) {
    mutated.positivityBias = lvl[Math.max(0, Math.min(2, pIdx + (Math.random() < 0.5 ? -1 : 1)))] || "medium";
  }

  // Drift grammar quality (account quality inconsistency)
  if (Math.random() < 0.2) {
    const qualities = ["poor", "inconsistent", "decent"];
    const qIdx = qualities.indexOf(mutated.grammarQuality || "inconsistent");
    mutated.grammarQuality = qualities[Math.max(0, Math.min(2, qIdx + (Math.random() < 0.5 ? -1 : 1)))] || "inconsistent";
  }

  // Drift emotional baseline
  if (Math.random() < 0.3) {
    mutated.emotionalBaseline = randFrom(["cynical", "neutral", "positive", "tired"]);
  }

  mutated.lastDriftMonth = currentMonth;
  try { localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(mutated)); } catch {}
  return mutated;
}

function computeDormancy(profile) {
  const dailyLimits   = { low: 2, medium: 5, high: 10 };
  const weeklyLimits  = { low: 5, medium: 15, high: 30 };
  const level         = profile.activityLevel || "medium";
  const dailyLimit    = dailyLimits[level] || 5;
  const weeklyLimit   = weeklyLimits[level] || 15;

  const recentCount = state.posts.filter(p => p.date === today()).length;
  if (recentCount >= dailyLimit) {
    return { recommend: true, message: "Daily activity limit reached. Consider stopping for today." };
  }

  const now = Date.now();
  const weekCount = state.posts.filter(p => (now - new Date(p.date).getTime()) <= 7 * 86400000).length;
  if (weekCount >= weeklyLimit) {
    return { recommend: true, message: "Weekly activity limit reached. Dormancy recommended." };
  }

  if (Math.random() < (profile.inactivityProb || 0.2) * 0.08) {
    return { recommend: true, message: "Random dormancy signal. Consider skipping this session." };
  }

  return { recommend: false, message: null };
}

function computeClusteringLevel() {
  const posts = state.posts.slice(0, 100);
  if (posts.length < 5) return 0;
  let score = 0;

  const subs = posts.map(p => p.subreddit).filter(Boolean);
  if (subs.length > 3) {
    const counts = subs.reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
    const ratio = Math.max(...Object.values(counts)) / subs.length;
    score += ratio > 0.7 ? 0.4 : ratio > 0.5 ? 0.2 : 0;
  }

  const topics = posts.map(p => p.topic).filter(Boolean);
  if (topics.length > 5) {
    const counts = topics.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {});
    const ratio = Math.max(...Object.values(counts)) / topics.length;
    score += ratio > 0.8 ? 0.3 : ratio > 0.6 ? 0.15 : 0;
  }

  const dayCounts = posts.reduce((a, p) => { a[p.date] = (a[p.date] || 0) + 1; return a; }, {});
  const maxDay = Math.max(...Object.values(dayCounts));
  score += maxDay > 10 ? 0.3 : maxDay > 6 ? 0.15 : 0;

  return Math.min(1, score);
}

function getMoodSpillover(profile) {
  try {
    const history = JSON.parse(localStorage.getItem(MOOD_HISTORY_KEY) || "[]");
    if (history.length < 2) return getWeeklyMoodBias();
    const recent = history.slice(-3);
    const counts = recent.reduce((a, m) => { a[m] = (a[m] || 0) + 1; return a; }, {});
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    // 60% carry dominant recent mood, 40% use stored weekly
    return Math.random() < 0.6 ? dominant : getWeeklyMoodBias();
  } catch { return getWeeklyMoodBias(); }
}

function saveMoodToHistory(mood) {
  try {
    const h = JSON.parse(localStorage.getItem(MOOD_HISTORY_KEY) || "[]");
    h.push(mood);
    localStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(h.slice(-20)));
  } catch {}
}

function getPostingWindowAdvice(profile) {
  const windows = {
    night_owl:    "Best posting window: 10PMâ€“2AM. Avoid 9AMâ€“5PM blocks.",
    office_hours: "Best posting window: 12â€“2PM or 5â€“7PM.",
    weekend_only: "Best posting window: Saturday/Sunday afternoons.",
    irregular:    null,
  };
  return windows[profile.postingStyle || "irregular"] || null;
}

function shouldUseReactionMode(fatigue, clustering) {
  // Base 10% + up to +15% fatigue + up to +10% clustering
  return Math.random() < (0.10 + fatigue * 0.15 + clustering * 0.10);
}

// â”€â”€â”€ Phase 7: Multi-Account Population Simulation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACCOUNT_ARCHETYPES = [
  "casual_samsung_user",
  "tired_upgrader",
  "android_enthusiast",
  "practical_buyer",
  "deal_hunter",
  "battery_focused",
  "camera_casual",
  "ex_oneplus_user",
  "ex_xiaomi_user",
  "indifferent_normie",
];

const LANGUAGE_QUIRKS_POOL = [
  "overuses_tbh",
  "rarely_punctuates",
  "lowercase_always",
  "uses_ngl",
  "fragments_preferred",
  "hedges_always",
];

// Staggered opinion distribution â€” not all accounts like Samsung equally
const SENTIMENT_TIERS = [
  { tier: "mildly_skeptical",  weight: 0.20 },
  { tier: "neutral_positive",  weight: 0.40 },
  { tier: "casual_favorable",  weight: 0.25 },
  { tier: "highly_favorable",  weight: 0.10 },
  { tier: "indifferent",       weight: 0.05 },
];

function pickSentimentTier() {
  const r = Math.random();
  let cum = 0;
  for (const { tier, weight } of SENTIMENT_TIERS) {
    cum += weight;
    if (r < cum) return tier;
  }
  return "neutral_positive";
}

const USER_FEEDBACK_KEY = "orm_user_feedback";

function trackUserFeedback(type) {
  try {
    const fb = JSON.parse(localStorage.getItem(USER_FEEDBACK_KEY) || "{}");
    fb[type] = (fb[type] || 0) + 1;
    fb.lastAction = type;
    fb.lastTs = Date.now();
    localStorage.setItem(USER_FEEDBACK_KEY, JSON.stringify(fb));
  } catch {}
}

function getUserFeedbackHints() {
  try {
    const fb = JSON.parse(localStorage.getItem(USER_FEEDBACK_KEY) || "{}");
    const total = (fb.copy || 0) + (fb.regen || 0) + (fb.skip || 0);
    if (!total) return null;
    return {
      regenRate: Math.round(((fb.regen || 0) / total) * 100),
      skipRate:  Math.round(((fb.skip  || 0) / total) * 100),
    };
  } catch { return null; }
}

function computeOverlapLevel() {
  const posts = state.posts.slice(0, 30);
  const allTexts = [];
  for (const post of posts) {
    for (const c of (post.comments || [])) {
      const text = typeof c === "string" ? c : (c?.text || "");
      if (text.length > 10) allTexts.push(text);
    }
  }
  if (allTexts.length < 4) return 0;
  const wordFreq = {};
  for (const text of allTexts) {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 6);
    for (const w of words) wordFreq[w] = (wordFreq[w] || 0) + 1;
  }
  const repeated = Object.values(wordFreq).filter(v => v > 2).length;
  const total = Object.keys(wordFreq).length;
  return total > 0 ? Math.min(1, repeated / Math.max(total * 0.3, 1)) : 0;
}

function computeCoordinationRisk() {
  const posts = state.posts.slice(0, 20);
  if (posts.length < 5) return 0;
  let risk = 0;

  const recentSubs = posts.slice(0, 10).map(p => p.subreddit).filter(Boolean);
  if (recentSubs.length > 3) {
    const counts = recentSubs.reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
    const topRatio = Math.max(...Object.values(counts)) / recentSubs.length;
    if (topRatio > 0.6) risk += 0.35;
  }

  const recentTopics = posts.slice(0, 10).map(p => p.topic).filter(Boolean);
  if (recentTopics.length > 3) {
    const counts = recentTopics.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {});
    const topRatio = Math.max(...Object.values(counts)) / recentTopics.length;
    if (topRatio > 0.7) risk += 0.3;
  }

  const todayCount = posts.filter(p => p.date === today()).length;
  if (todayCount > 8) risk += 0.35;

  return Math.min(1, risk);
}

function getSocialEchoHint(subreddit) {
  const sub = (subreddit || "").toLowerCase().replace(/^r\//, "");
  if (sub.includes("android") || sub.includes("pixel") || sub.includes("oneplus")) return "technical";
  if (sub.includes("gadgetsindia") || sub.includes("india") || sub.includes("budget")) return "budget_conscious";
  if (sub.includes("samsunggalaxy")) return "frustrated";
  return "";
}

function computeAccountAgeDays(profile) {
  if (!profile.createdAt) return 0;
  return Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000);
}

function getArchetypeTraitContext(archetypeId) {
  const traitMap = {
    casual_samsung_user:  "casual Samsung user with unremarkable but positive experience",
    tired_upgrader:       "has upgraded many times, fatigued with mid-range promises",
    android_enthusiast:   "follows Android news, compares brands, mildly skeptical of marketing",
    practical_buyer:      "buys for specific daily needs, does not over-research specs",
    deal_hunter:          "bought during sale, very aware of effective price vs list price",
    battery_focused:      "battery life is primary concern above all other features",
    camera_casual:        "cares about camera for social media, not a photography purist",
    ex_oneplus_user:      "switched from OnePlus, occasionally nostalgic about performance",
    ex_xiaomi_user:       "switched from Xiaomi, values software support improvement",
    indifferent_normie:   "not a phone enthusiast, uses phone as utility, low engagement",
  };
  return traitMap[archetypeId] || "";
}

// â”€â”€â”€ Phase 8: Generation Telemetry & Subreddit Calibration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TELEMETRY_KEY = "orm_telemetry";
const SUB_CALIB_KEY = "orm_sub_calib";

function recordGenerationTelemetry(comments, params = {}) {
  try {
    const existing = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    const valid = comments.filter(c => typeof c === "string" && c.length > 0);
    const samsungCount = valid.reduce((n, c) => n + (c.toLowerCase().match(/\b(samsung|galaxy|a37|a57)\b/g) || []).length, 0);
    const avgLen = Math.round(valid.reduce((n, c) => n + c.split(/\s+/).length, 0) / Math.max(valid.length, 1));
    const hasOmission = valid.some(c => {
      const l = c.toLowerCase();
      return !l.includes("samsung") && !l.includes("galaxy") && !l.includes("a37") && !l.includes("a57");
    });
    const entry = {
      ts:         Date.now(),
      avgLen,
      samsung:    samsungCount,
      omission:   hasOmission ? 1 : 0,
      reaction:   params.wasReaction ? 1 : 0,
      sub:        (params.subreddit || "").replace(/^r\//, "").slice(0, 30),
      clustering: Math.round((params.clusteringLevel || 0) * 100),
    };
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify([entry, ...existing].slice(0, 300)));
  } catch {}
}

function getTelemetrySummary() {
  try {
    const data = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    if (data.length < 5) return null;
    const avg = arr => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
    const last100 = data.slice(0, 100);
    const now = Date.now();
    const last30d = data.filter(e => now - e.ts < 30 * 86400000);
    return {
      total: data.length,
      last100: {
        avgCommentLen:  Math.round(avg(last100.map(e => e.avgLen))),
        omissionRate:   Math.round(avg(last100.map(e => e.omission)) * 100),
        reactionRate:   Math.round(avg(last100.map(e => e.reaction)) * 100),
        samsungPerGen:  +avg(last100.map(e => e.samsung)).toFixed(1),
      },
      last30d: {
        count:        last30d.length,
        omissionRate: Math.round(avg((last30d.length ? last30d : last100).map(e => e.omission)) * 100),
      },
    };
  } catch { return null; }
}

function recordSubredditOutcome(subreddit, type) {
  if (!subreddit) return;
  try {
    const calib = JSON.parse(localStorage.getItem(SUB_CALIB_KEY) || "{}");
    const sub = subreddit.toLowerCase().replace(/^r\//, "");
    if (!calib[sub]) calib[sub] = { success: 0, regen: 0, skip: 0 };
    calib[sub][type] = (calib[sub][type] || 0) + 1;
    localStorage.setItem(SUB_CALIB_KEY, JSON.stringify(calib));
  } catch {}
}

function getSubredditDegradationBias(subreddit) {
  if (!subreddit) return 0;
  try {
    const calib = JSON.parse(localStorage.getItem(SUB_CALIB_KEY) || "{}");
    const sub = subreddit.toLowerCase().replace(/^r\//, "");
    const d = calib[sub];
    if (!d) return 0;
    const total = (d.success || 0) + (d.regen || 0) + (d.skip || 0);
    if (total < 4) return 0;
    const regenRate = (d.regen || 0) / total;
    if (regenRate > 0.5) return -0.15;  // too much regen = reduce degradation
    if (regenRate < 0.1) return  0.10;  // low regen = tolerate more
    return 0;
  } catch { return 0; }
}

function getPopulationHealth() {
  try {
    const data = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    if (data.length < 10) return null;
    const recent = data.slice(0, 50);
    const avg = arr => arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
    const subCounts = recent.reduce((a, e) => { if (e.sub) a[e.sub] = (a[e.sub] || 0) + 1; return a; }, {});
    const topEntry = Object.entries(subCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      omissionRate: Math.round(avg(recent.map(e => e.omission)) * 100),
      reactionRate: Math.round(avg(recent.map(e => e.reaction)) * 100),
      avgLen:       Math.round(avg(recent.map(e => e.avgLen))),
      topSub:       topEntry ? topEntry[0] : "â€”",
      topSubRatio:  topEntry ? Math.round(topEntry[1] / recent.length * 100) : 0,
    };
  } catch { return null; }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2600);
}

function stripDashes(text) {
  return String(text || "")
    .replace(/\s*â€”\s*/g, ", ")
    .replace(/\s*â€“\s*/g, ", ")
    .replace(/,,+/g, ",");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fillSelect(id, values) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function inferSubreddit(url) {
  const match = String(url || "").match(/reddit\.com\/r\/([^/]+)/i);
  return match ? `r/${match[1]}` : "";
}

function normalizeTrackerUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    if (host === "redd.it") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.reddit.com/comments/${id}` : "";
    }
    if (!host.endsWith("reddit.com") || !url.pathname.includes("/comments/")) return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function detect(urlOrContext, rules, fallback) {
  const text = String(urlOrContext || "").toLowerCase();
  const item = rules.find(([needle]) => text.includes(needle));
  return item ? item[1] : fallback;
}

function classifyText(value, currentTopic = "Buying advice", currentAngle = "Price/value") {
  const text = String(value || "").toLowerCase();
  let device = "-";
  if (text.includes("a37") && text.includes("a57")) device = "Both";
  else if (text.includes("a37")) device = "A37";
  else if (text.includes("a57")) device = "A57";

  const topic = detect(text, [
    ["camera", "Camera"],
    ["battery", "Battery"],
    ["worth", "Price/value"],
    ["price", "Price/value"],
    ["budget", "Price/value"],
    ["buy", "Buying advice"],
    ["recommend", "Buying advice"],
    [" vs ", "Comparison"],
    ["compare", "Comparison"],
    ["gaming", "Performance"],
    ["performance", "Performance"],
    ["issue", "Complaint"],
    ["problem", "Complaint"],
    ["launch", "Launch/speculation"]
  ], currentTopic);

  const angle = detect(text, [
    ["battery", "Battery"],
    ["display", "Display"],
    ["screen", "Display"],
    ["update", "Software updates"],
    ["software", "Software updates"],
    ["camera", "Camera"],
    ["price", "Price/value"],
    ["budget", "Price/value"],
    ["service", "Service availability"],
    ["repair", "Service availability"],
    ["ecosystem", "Samsung ecosystem"]
  ], currentAngle);

  return { device, topic, angle };
}

function autoClassify() {
  const classification = classifyText(`${$("urlInput").value} ${$("contextInput").value}`, $("topicInput").value, $("angleInput").value);
  if (classification.device !== "-") $("deviceBadge").textContent = classification.device;
  $("topicInput").value = classification.topic;
  $("angleInput").value = classification.angle;
}

function phoneName(device) {
  return device === "Both" ? "A37/A57" : device;
}


function wordCount(text) {
  return text.trim().split(/\s+/).length;
}

function firstWords(text) {
  return String(text || "").trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
}

function calculateWordSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

function showIrrelevantBanner(show) {
  const banner = $("irrelevantBanner");
  if (banner) banner.style.display = show ? "flex" : "none";
}

async function generateAllComments(post, replyOpts = {}) {
  const recentOpenings   = getRecentOpenings();
  const profile          = getAccountProfile();
  const weeklyMoodBias   = getMoodSpillover(profile);   // Phase 6: spillover-aware mood
  const dailyWritingBias = getDailyWritingBias();
  const accountTraitCtx  = buildTraitContext(profile);
  const sessionFatigue   = getSessionFatigue();
  const clusteringLevel  = computeClusteringLevel();
  const replyMode        = !!replyOpts.replyMode;
  const parentComment    = replyOpts.parentComment || "";
  const reactionMode     = !replyMode && shouldUseReactionMode(sessionFatigue, clusteringLevel);

  // Phase 8: subreddit-calibrated degradation bias
  const subDegBias   = getSubredditDegradationBias((post.subreddit || "").replace(/^r\//, ""));
  const antiPerfNoise = Math.max(0.10, Math.min(0.65, 0.25 + clusteringLevel * 0.25 + subDegBias));

  // Phase 7 population variables
  const archetypeId       = profile.archetypeId || "";
  const languageQuirks    = profile.languageQuirks || [];
  const accountAgeDays    = computeAccountAgeDays(profile);
  const overlapLevel      = computeOverlapLevel();
  const coordinationRisk  = computeCoordinationRisk();
  const socialEchoHint    = getSocialEchoHint((post.subreddit || "").replace(/^r\//, ""));
  const feedbackHints     = getUserFeedbackHints();
  const archetypeTraitCtx = getArchetypeTraitContext(archetypeId);
  const fullTraitCtx      = [accountTraitCtx, archetypeTraitCtx].filter(Boolean).join(", ");

  const requestBody = {
    url:                 post.url || post.permalink || "",
    platform:            post.platform || currentPlatform(),
    subreddit:           (post.subreddit || "").replace(/^r\//, ""),
    title:               post.title || scrapedTitle || "",
    body:                post.selftext || scrapedSelftext || "",
    context:             post.context || $("contextInput").value.trim() || "",
    topComments:         post.topComments || scrapedTopComments || [],
    topic:               post.topic || "General A-series",
    relevance:           post.device || "A37/A57",
    recentOpenings,
    weeklyMoodBias,
    dailyWritingBias,
    accountTraitContext: fullTraitCtx,
    replyMode,
    parentComment,
    sessionFatigue,
    clusteringLevel,
    reactionMode,
    antiPerfectionNoise: antiPerfNoise,
    // Phase 7
    archetypeId,
    languageQuirks,
    accountAgeDays,
    overlapLevel,
    coordinationRisk,
    socialEchoHint,
    feedbackHints,
  };

  try {
    const passcode = localStorage.getItem("appPasscode") || "";
    const response = await fetch(`${apiBase}/api/generate-comments`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-password": passcode },
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json();

    if (payload.skipped) {
      recordSubredditOutcome(post.subreddit || "", "skip");
      return { comments: [], skipped: true };
    }

    const comments = Array.isArray(payload.comments)
      ? payload.comments.map(c => stripDashes(c)).filter(Boolean)
      : [];

    if (comments.length > 0) {
      const openings = comments.map(c => c.split(/[.!?]/)[0].trim().slice(0, 80)).filter(Boolean);
      saveRecentOpenings(openings);
      saveMoodToHistory(weeklyMoodBias);
      incrementSessionCount();
      // Phase 8 telemetry + calibration
      recordGenerationTelemetry(comments, { subreddit: post.subreddit || "", clusteringLevel, wasReaction: reactionMode });
      recordSubredditOutcome(post.subreddit || "", "success");
      // Log telemetry summary every 10 generations
      const telSum = getTelemetrySummary();
      if (telSum && telSum.total % 10 === 0) console.log("[p8] Telemetry:", JSON.stringify(telSum.last100));
    } else {
      recordSubredditOutcome(post.subreddit || "", "regen");
    }

    return { comments, skipped: false, fallback: !!payload.fallback, behaviorWarning: payload.behaviorWarning || null };
  } catch {
    return { comments: [], skipped: false, fallback: true };
  }
}

async function generateCommentsForPost(post) {
  const { comments, skipped } = await generateAllComments(post);
  return {
    results: comments.map(text => ({ text })),
    isIrrelevant: skipped,
  };
}

function buildRedditJsonUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error("Invalid Reddit URL."); }
  const host = url.hostname.toLowerCase();
  if (host === "redd.it") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) throw new Error("Could not extract post ID from redd.it link.");
    return `/reddit-proxy/comments/${id}.json?raw_json=1`;
  }
  if (!host.endsWith("reddit.com")) throw new Error("Only Reddit post URLs are supported.");
  url.search = ""; url.hash = "";
  let pathname = url.pathname.replace(/\/$/, "");
  if (!pathname.includes("/comments/")) throw new Error("Use a Reddit post URL that contains /comments/.");
  if (!pathname.endsWith(".json")) pathname += ".json";
  return `/reddit-proxy${pathname}?raw_json=1`;
}

function cleanRedditText(value, limit = 700) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").replace(/\[deleted\]|\[removed\]/gi, "")
    .trim().slice(0, limit);
}

function buildBlockedRedditFallback(url, reason = "") {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  const subredditIndex = parts.findIndex(part => part.toLowerCase() === "r");
  const commentsIndex = parts.findIndex(part => part.toLowerCase() === "comments");
  const subreddit = subredditIndex >= 0 && parts[subredditIndex + 1] ? `r/${parts[subredditIndex + 1]}` : inferSubreddit(url);
  const slug = commentsIndex >= 0 && parts[commentsIndex + 2] ? parts[commentsIndex + 2] : "";
  const title = slug
    ? slug.replace(/[-_]+/g, " ").replace(/\b\w/g, char => char.toUpperCase())
    : "Reddit post";
  const permalink = `${parsed.origin}${parsed.pathname}`;
  const note = reason ? `Fetch note: ${reason}` : "Fetch note: Reddit blocked automatic context fetching.";
  return {
    title,
    subreddit,
    selftext: "",
    permalink,
    comments: [],
    context: [
      `Subreddit: ${subreddit || "-"}`,
      `Title: ${title}`,
      note,
      "Paste the post body or top comments here if you need a more specific reply.",
    ].join("\n\n"),
    degraded: true,
  };
}

async function scrapeRedditPost(url) {
  const redditUrl = buildRedditJsonUrl(url);
  let response;
  try {
    response = await fetch(redditUrl, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new Error("Network error â€” check your connection and try again.");
  }
  if (!response.ok) {
    throw new Error(`Reddit returned ${response.status}. The post may be private or the URL may be wrong.`);
  }
  const data = await response.json();
  const post = data?.[0]?.data?.children?.[0]?.data;
  if (!post) throw new Error("Could not read the Reddit post. The JSON format may have changed.");

  const title = cleanRedditText(post.title, 300);
  const subreddit = post.subreddit ? `r/${post.subreddit}` : "";
  const selftext = cleanRedditText(post.selftext, 2000);
  const permalink = post.permalink ? `https://www.reddit.com${post.permalink}` : url;
  const topComments = (data?.[1]?.data?.children || [])
    .filter((c) => c?.kind === "t1" && c?.data?.body)
    .slice(0, 8)
    .map((c) => ({ author: cleanRedditText(c.data.author, 80), score: Number(c.data.score || 0), body: cleanRedditText(c.data.body, 700) }))
    .filter((c) => c.body);

  const commentLines = topComments.map((c, i) => `Comment ${i + 1} (u/${c.author}, score ${c.score}): ${c.body}`).join("\n\n");
  const context = [`Subreddit: ${subreddit}`, `Title: ${title}`, selftext ? `Post body:\n${selftext}` : "", commentLines ? `Top comments:\n${commentLines}` : ""].filter(Boolean).join("\n\n");
  const topCommentTexts = topComments.map(c => c.body);

  return { title, subreddit, selftext, context, permalink, comments: topComments, topCommentTexts };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchContext() {
  const url = $("urlInput").value.trim();
  const platform = currentPlatform();
  const errorEl = $("fetchError");
  const loadingEl = $("fetchLoading");

  errorEl.style.display = "none";
  errorEl.textContent = "";

  if (platform === "reddit") {
    if (!url) {
      errorEl.textContent = "Paste a Reddit URL first.";
      errorEl.style.display = "block";
      return;
    }
    if (!/reddit\.com|redd\.it/i.test(url)) {
      errorEl.textContent = "Invalid URL â€” must be a reddit.com or redd.it link.";
      errorEl.style.display = "block";
      return;
    }
    loadingEl.style.display = "block";
    $("fetchBtn").disabled = true;
    try {
      // Try the Next.js proxy or corsproxy fallback directly via scrapeRedditPost
      let payload = null;
      try {
        payload = await scrapeRedditPost(url);
        payload.comments = (payload.topCommentTexts || []).map(t => ({ body: t }));
      } catch (err) {
        payload = buildBlockedRedditFallback(url, err.message);
        if (!payload) {
          errorEl.textContent = err.message;
          errorEl.style.display = "block";
          loadingEl.style.display = "none";
          $("fetchBtn").disabled = false;
          return;
        }
      }      scrapedTitle = payload.title || "";
      scrapedSelftext = payload.selftext || "";
      scrapedTopComments = (payload.comments || []).map(c => c.body || c).filter(Boolean);
      $("subredditInput").textContent = payload.subreddit || inferSubreddit(url);
      $("contextInput").value = payload.context || "";
      if (payload.permalink) $("urlInput").value = payload.permalink;
      autoClassify();
      toast(payload.degraded ? "Reddit blocked auto-fetch, so a fallback context was created." : "Reddit context fetched.");
      renderCommentStudio();
    } catch (error) {
      errorEl.textContent = error.message || "Could not fetch Reddit post. Try pasting the post text manually in the context box.";
      errorEl.style.display = "block";
    } finally {
      loadingEl.style.display = "none";
      $("fetchBtn").disabled = false;
    }
    return;
  }

  // Non-Reddit: paste-only platforms skip the fetch endpoint
  if (PLATFORM_PASTE_ONLY.has(platform)) {
    errorEl.textContent = `${PLATFORM_LABELS[platform]} is paste-only. Paste the thread / tweet text in the Post Context box below.`;
    errorEl.style.display = "block";
    return;
  }


}

function getCommentValue(index) {
  const card = document.querySelector(`.comment-card[data-slot="${index}"]`);
  return card ? card.querySelector("textarea").value.trim() : "";
}

function setCommentValue(index, text, perspective = null) {
  const card = document.querySelector(`.comment-card[data-slot="${index}"]`);
  if (card) {
    const textarea = card.querySelector("textarea");
    textarea.value = text;
    textarea.dispatchEvent(new Event("input"));
    if (perspective) {
      const select = card.querySelector("select");
      if (select) select.value = perspective;
    }
  }
}

async function renderCommentStudio(postOverride = null) {
  const post = postOverride || currentPost();
  const studio = $("commentStudio");

  if (!post.context && !post.title) {
    studio.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <p>Fetch a Reddit post, then click Generate to create 3 comment drafts.</p>
      </div>
    `;
    return;
  }

  studio.innerHTML = COMMENT_LABELS.map((label, index) => `
    <div class="comment-card" data-slot="${index}">
      <div class="comment-card-header">
        <div class="comment-label">${escapeHtml(label)}</div>
        <button type="button" class="comment-copy-btn btn-copy">Copy</button>
      </div>
      <textarea class="comment-textarea" placeholder="Comment will appear here after generation..."></textarea>
      <div class="comment-footer">
        <span class="char-count">0 chars</span>
        <label class="final-radio-label" style="margin-left: auto;">
          <input type="radio" name="final-comment" value="${index}" class="final-comment-radio" />
          Mark as final
        </label>
      </div>
    </div>
  `).join("");

  // Load saved comments if available
  const savedComments = post.comments || [];
  [0].forEach((index) => {
    const saved = savedComments[index];
    const text = typeof saved === "string" ? saved : (saved?.text || "");
    setCommentValue(index, text);
  });

  // Restore final comment selection
  if (post.finalCommentIndex >= 0 && post.finalCommentIndex < 3) {
    const radio = studio.querySelector(`input[name="final-comment"][value="${post.finalCommentIndex}"]`);
    if (radio) radio.checked = true;
  }

  // Event listeners
  studio.querySelectorAll("textarea").forEach((textarea, index) => {
    textarea.addEventListener("input", () => {
      const card = textarea.closest(".comment-card");
      const len = textarea.value.length;
      card.querySelector(".char-count").textContent = `${len} chars`;
    });
    textarea.addEventListener("focus", () => {
      state.activeCommentSlot = index;
      runQa();
    });
  });

  studio.querySelectorAll(".btn-copy").forEach((btn, index) => {
    btn.addEventListener("click", async () => {
      const text = getCommentValue(index);
      if (!text) {
        toast("No comment to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("Copied.");
        trackUserFeedback("copy");
      } catch {
        toast("Could not copy to clipboard.");
      }
    });
  });

  runQa();
}

function runQa() {
  const comment = getCommentValue(state.activeCommentSlot);
  const items = [];

  if (!comment) {
    $("qaSummary").textContent = `Comment ${state.activeCommentSlot + 1} empty`;
    $("qaList").innerHTML = "";
    return;
  }

  const lower = comment.toLowerCase();

  const riskyWords = ["best phone", "guaranteed", "confirmed", "perfect", "i own", "i bought", "no issues", "must buy", "hands down", "officially confirmed"];
  riskyWords.forEach((phrase) => {
    if (lower.includes(phrase)) {
      items.push({ level: "danger", text: `Review "${phrase}" because it can sound unsupported or fake.` });
    }
  });

  if (wordCount(comment) < 12) {
    items.push({ level: "warn", text: "Too short â€” comment may be incomplete." });
  }
  if (wordCount(comment) > 60) {
    items.push({ level: "warn", text: "Getting long. AI targets 15-40 words; Reddit users tune out walls of text." });
  }

  const promotionalWords = ["great", "excellent", "perfect", "amazing", "best", "top", "outstanding"];
  let promotionalCount = 0;
  promotionalWords.forEach((word) => {
    if (lower.includes(word)) promotionalCount += 1;
  });
  if (promotionalCount > 2) {
    items.push({ level: "warn", text: "Draft sounds too promotional for Reddit." });
  }

  const specPattern = /\b(108mp|5000mah|120hz|240hz|512gb|8gb|amoled)\b/i;
  if (specPattern.test(comment) && !/(reportedly|expected|based on leaks|if specs are accurate|allegedly|rumored)/i.test(comment)) {
    items.push({ level: "warn", text: "Unverified spec mentioned without soft language." });
  }

  if (/\b(as an official|as a samsung ambassador|as a brand partner|sponsored|paid promotion)\b/i.test(lower)) {
    items.push({ level: "danger", text: "Disclosure or shill language detected. Remove." });
  }

  if ((lower.match(/samsung/g) || []).length > 3) {
    items.push({ level: "warn", text: "Samsung is repeated often. Reduce brand-heavy wording." });
  }

  if ((lower.match(/\b(buy|purchase|recommend|shortlist)\b/g) || []).length > 3) {
    items.push({ level: "warn", text: "Comment may read too sales-focused. Make it more helpful and less promotional." });
  }

  if (!items.length) items.push({ level: "ok", text: "Looks ready after a human context check." });

  const slotLabel = `Comment ${state.activeCommentSlot + 1}`;
  $("qaSummary").textContent = items.some((item) => item.level === "danger")
    ? `${slotLabel}: needs careful review`
    : items.some((item) => item.level === "warn")
    ? `${slotLabel}: review suggested`
    : `${slotLabel}: looks good`;
  $("qaList").innerHTML = items.map((item) => `<div class="qa-item ${item.level === "ok" ? "" : item.level}">${escapeHtml(item.text)}</div>`).join("");
}

function formPostValues() {
  const finalRadio = document.querySelector('input[name="final-comment"]:checked');
  return {
    url:              $("urlInput").value.trim(),
    platform:         currentPlatform(),
    context:          $("contextInput").value.trim(),
    subreddit:        $("subredditInput").textContent || inferSubreddit($("urlInput").value),
    device:           $("deviceBadge").textContent || "-",
    topic:            $("topicInput").value || "Buying advice",
    angle:            $("angleInput").value || "Price/value",
    status:           $("statusInput").value || "Drafted",
    priority:         $("priorityInput").value || "Medium",
    owner:            $("ownerInput").value.trim(),
    title:            scrapedTitle,
    selftext:         scrapedSelftext,
    topComments:      scrapedTopComments,
    comments:         [0, 1, 2].map((i) => {
      const text = getCommentValue(i);
      if (text) return { text };
      if (state.currentSelectedPostId) {
        const existingPost = state.posts.find(p => p.id === state.currentSelectedPostId);
        if (existingPost && existingPost.comments && existingPost.comments[i]) {
          return existingPost.comments[i];
        }
      }
      return { text: "" };
    }),
    finalCommentIndex: finalRadio ? Number(finalRadio.value) : -1,
    isIrrelevant:     currentPostIsIrrelevant,
    updatedAt:        new Date().toISOString()
  };
}

function currentPost() {
  const values = formPostValues();
  if (!state.currentSelectedPostId) {
    return {
      id: generateId(),
      date: today(),
      ...values
    };
  }

  const post = state.posts.find(p => p.id === state.currentSelectedPostId);
  if (!post) return null;

  return {
    ...post,
    ...values
  };
}
function savePost(event) {
  if (event) event.preventDefault();

  const post = currentPost();
  if (!post.url && !post.context) {
    toast("Add a URL or post context first.");
    return;
  }

  if (state.currentSelectedPostId) {
    const index = state.posts.findIndex(p => p.id === state.currentSelectedPostId);
    if (index >= 0) state.posts[index] = post;
  } else {
    const duplicate = state.posts.find((item) => post.url && normalizeTrackerUrl(item.url) === normalizeTrackerUrl(post.url));
    if (duplicate) {
      toast("This URL is already in the tracker.");
      return;
    }
    state.posts.unshift(post);
    state.currentSelectedPostId = post.id;
  }

  savePosts();
  renderTracker();
  renderQueue();
  renderMetrics();
  toast("Post saved.");
}

function selectQueueItem(postId) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  state.currentSelectedPostId = postId;

  // Restore scraped fields for API reuse
  scrapedTitle = post.title || "";
  scrapedSelftext = post.selftext || "";
  scrapedTopComments = Array.isArray(post.topComments) ? post.topComments : [];

  // Load form fields
  $("urlInput").value = post.url || "";
  $("contextInput").value = post.context || "";
  setPlatform(post.platform || "reddit");
  $("subredditInput").textContent = post.subreddit || PLATFORM_LABELS[post.platform || "reddit"] || "-";
  $("deviceBadge").textContent = post.device || "-";
  $("topicInput").value = post.topic || "Buying advice";
  $("angleInput").value = post.angle || "Price/value";
  $("statusInput").value = post.status || "Drafted";
  $("priorityInput").value = post.priority || "Medium";
  $("ownerInput").value = post.owner || "";

  currentPostIsIrrelevant = !!post.isIrrelevant;
  showIrrelevantBanner(currentPostIsIrrelevant);

  // Render comment studio with saved comments before reading textarea state.
  renderCommentStudio(post);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deletePost(id) {
  state.posts = state.posts.filter((item) => item.id !== id);
  if (state.currentSelectedPostId === id) {
    state.currentSelectedPostId = null;
    resetForm();
  }
  savePosts();
  renderTracker();
  renderQueue();
  renderMetrics();
  toast("Post removed.");
}

function resetForm() {
  state.currentSelectedPostId = null;
  currentPostIsIrrelevant = false;
  showIrrelevantBanner(false);
  $("urlInput").value = "";
  $("contextInput").value = "";
  setPlatform("reddit");
  $("subredditInput").textContent = "-";
  $("deviceBadge").textContent = "-";
  $("topicInput").value = "Buying advice";
  $("angleInput").value = "Price/value";
  $("statusInput").value = "Drafted";
  $("priorityInput").value = "Medium";
  $("ownerInput").value = loadSetting("orm_user_name", "");
  $("qaSummary").textContent = "No comment selected";
  $("qaList").innerHTML = "";
}

function renderQueue() {
  const searchTerm = $("queueSearch").value.trim().toLowerCase();
  let filtered = state.posts;

  if (searchTerm) {
    filtered = filtered.filter(post =>
      JSON.stringify(post).toLowerCase().includes(searchTerm)
    );
  }

  if (state.queueFilter !== "All") {
    filtered = filtered.filter(post => post.status === state.queueFilter);
  }

  if (state.platformFilter && state.platformFilter !== "All") {
    filtered = filtered.filter(post => (post.platform || "reddit") === state.platformFilter);
  }

  const queueList = $("queueList");
  if (!queueList) return;
  if (!filtered.length) {
    queueList.innerHTML = `<div style="text-align:center;padding:28px 12px;color:#94a3b8;font-size:12px;line-height:1.6;">${state.posts.length ? "No posts match this filter." : "No posts yet.<br>Paste URLs in Batch Import below."}</div>`;
    return;
  }
  queueList.innerHTML = filtered.map(post => {
    const isSelected = post.id === state.currentSelectedPostId;
    const comments = post.comments || [];
    const commentCount = comments.filter(c => {
      if (typeof c === 'string') return c.trim().length > 0;
      return c.text && c.text.trim().length > 0;
    }).length;
    const commentStatus = `${commentCount}/3`;
    const shortTitle = (post.context || post.subreddit || "Untitled").split('\n')[0].slice(0, 40);

    const platformLbl = PLATFORM_LABELS[post.platform] || PLATFORM_LABELS.reddit;
    const statusCls = post.status === "Posted" ? "posted" : post.status === "Needs review" ? "review" : "drafted";
    return `
      <div class="queue-item ${isSelected ? 'selected' : ''}" data-post-id="${post.id}">
        <div class="qi-title">${escapeHtml(shortTitle)}</div>
        <div class="qi-meta">
          <span class="qi-plat">${escapeHtml(platformLbl)}</span>
          ${post.subreddit ? escapeHtml(post.subreddit) : ""}
          <span class="qi-status ${statusCls}">${escapeHtml(post.status)}</span>
        </div>
      </div>
    `;
  }).join("");

  queueList.querySelectorAll(".queue-item").forEach(item => {
    item.addEventListener("click", () => {
      selectQueueItem(item.dataset.postId);
    });
  });
}

function renderMetrics() {
  const todayDate = today();
  const todayPosts = state.posts.filter((post) => post.date === todayDate && (post.status === "Drafted" || post.status === "Posted"));
  const dailyTarget = parseInt(loadSetting("orm_daily_target", "10"), 10);
  const progress = Math.min(todayPosts.length, dailyTarget);

  if ($("metricTotal"))         $("metricTotal").textContent = state.posts.length;
  if ($("metricDrafted"))       $("metricDrafted").textContent = state.posts.filter((post) => post.status === "Drafted").length;
  if ($("metricPosted"))        $("metricPosted").textContent = state.posts.filter((post) => post.status === "Posted").length;
  if ($("metricReview"))        $("metricReview").textContent = state.posts.filter((post) => post.status === "Needs review").length;
  if ($("metricTodayProgress")) $("metricTodayProgress").textContent = `${todayPosts.length} / ${dailyTarget}`;
  // New UI: today pill
  const todayPill = $("todayPill");
  if (todayPill) todayPill.innerHTML = `${todayPosts.length}/<span id="metricDailyTarget">${dailyTarget}</span> today`;
}

function renderTracker() {
  const term = $("searchInput").value.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    const matchesTerm = JSON.stringify(post).toLowerCase().includes(term);
    return matchesTerm;
  });

  $("trackerCount").textContent = `${posts.length} posts`;
  $("trackerBody").innerHTML = posts.map((post) => {
    const statusClass = post.status === "Posted" ? "status-posted" : post.status === "Needs review" ? "status-review" : post.status === "Skipped" ? "status-skipped" : "";
    const comments = post.comments || [];
    const commentCount = comments.filter(c => {
      if (typeof c === 'string') return c.trim().length > 0;
      return c.text && c.text.trim().length > 0;
    }).length;
    const shortContext = (post.context || post.url || "Untitled").split('\n')[0].slice(0, 60);
    const isSelected = post.id === state.currentSelectedPostId;
    const actionLabel = commentCount === 3 ? "Review" : "Select";

    const platformLbl = PLATFORM_LABELS[post.platform] || PLATFORM_LABELS.reddit;
    return `
      <tr class="${isSelected ? "selected-row" : ""}">
        <td>${escapeHtml(post.date)}</td>
        <td><span class="plat-tag">${escapeHtml(platformLbl)}</span></td>
        <td>${post.url ? `<a href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">${escapeHtml(shortContext)}</a>` : escapeHtml(shortContext)}</td>
        <td>${escapeHtml(post.topic || "")}</td>
        <td>${escapeHtml(post.owner || "")}</td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(post.status)}</span></td>
        <td style="text-align: center;"><span class="comments-count ${commentCount === 3 ? "ready" : ""}">${commentCount}/3</span></td>
        <td class="row-actions">
          <button type="button" class="btn-ghost" data-edit="${post.id}">${actionLabel}</button>
          <button type="button" class="btn-ghost" data-delete="${post.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => selectQueueItem(button.dataset.edit));
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deletePost(button.dataset.delete));
  });
}

function commentText(comment) {
  return typeof comment === "string" ? comment : (comment?.text || "");
}

function renderBatchCommentsReview(posts) {
  const el = $("batchCommentsReview");
  if (!el) return;
  const readyPosts = posts.filter((post) => (post.comments || []).some((comment) => commentText(comment)));
  if (!readyPosts.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = readyPosts.map((post) => {
    const title = (post.context || post.url || "Untitled").split("\n")[0].replace(/^Title:\s*/i, "");
    const comments = (post.comments || []).slice(0, 3);
    return `
      <div class="batch-review-card">
        <div class="batch-review-header">
          <div class="batch-review-title">${escapeHtml(title)}</div>
          <button type="button" class="btn-ghost" data-edit="${post.id}">Review</button>
        </div>
        <div class="batch-review-grid">
          ${comments.map((comment, index) => `
            <div class="batch-review-comment">
              <strong>Comment ${index + 1}</strong>
              ${escapeHtml(commentText(comment))}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  el.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => selectQueueItem(button.dataset.edit));
  });
}

function renderAngleBars() {
  const counts = Object.fromEntries(options.angles.map((angle) => [angle, 0]));
  state.posts.forEach((post) => {
    if (counts[post.angle] !== undefined) counts[post.angle] += 1;
  });
  const max = Math.max(1, ...Object.values(counts));

  const barHtml = options.angles.map((angle) => {
    const count = counts[angle];
    const percent = Math.round((count / max) * 100);
    return `
      <div class="bar-row">
        <label>${escapeHtml(angle)}</label>
        <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      </div>
    `;
  }).join("");

  const angleBarsEl = $("angleBars");
  if (angleBarsEl) {
    angleBarsEl.innerHTML = barHtml;
  }
}

function renderTemplates() {
  $("templateList").innerHTML = reusableTemplates.map((template, index) => `
    <button type="button" class="template-btn" data-template="${index}">
      <strong>${escapeHtml(template.label)}</strong>
      <span>${escapeHtml(template.text.slice(0, 40))}...</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = reusableTemplates[Number(button.dataset.template)];
      const textarea = document.querySelector(`.comment-card[data-slot="${state.activeCommentSlot}"] textarea`);
      if (textarea) {
        const current = textarea.value.trim();
        textarea.value = current ? `${current}\n\n${template.text}` : template.text;
        textarea.dispatchEvent(new Event("input"));
        toast(`Template added to comment ${state.activeCommentSlot + 1}.`);
      }
    });
  });
}

function addBatchUrls() {
  const rawLines = $("batchInput").value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const existing = new Set(state.posts.map((post) => normalizeTrackerUrl(post.url)).filter(Boolean));
  const created = [];
  let duplicates = 0;
  let invalid = 0;

  rawLines.forEach((rawUrl) => {
    const url = normalizeTrackerUrl(rawUrl);
    if (!url) {
      invalid += 1;
      return;
    }
    if (existing.has(url)) {
      duplicates += 1;
      return;
    }
    created.push({
      id: generateId(),
      date: today(),
      url,
      context: "",
      subreddit: inferSubreddit(url),
      device: "-",
      topic: "General A-series",
      angle: "Price/value",
      status: "Needs review",
      priority: "Medium",
      owner: "",
      comments: [{}, {}, {}],
      updatedAt: new Date().toISOString()
    });
    existing.add(url);
  });

  state.posts.unshift(...created);
  $("batchInput").value = "";

  const summary = `${created.length} added${duplicates > 0 ? `, ${duplicates} duplicate skipped` : ""}${invalid > 0 ? `, ${invalid} invalid skipped` : ""}`;
  $("batchSummary").textContent = summary;

  if (created.length > 0) {
    state.currentSelectedPostId = created[0].id;
  }

  savePosts();
  renderTracker();
  renderQueue();
  renderMetrics();

  if (created.length > 0) {
    selectQueueItem(created[0].id);
  }

  toast(`${created.length} URL${created.length === 1 ? "" : "s"} added to tracker.`);
}

function batchDelay() {
  const r = Math.random();
  if (r < 0.40) return 1500;
  if (r < 0.68) return 3000;
  if (r < 0.83) return 5500;
  if (r < 0.93) return 9000;
  return 13000;
}

function shuffleSlightly(arr) {
  // Partial Fisher-Yates: swap each element with a neighbour at most 2 positions away
  const a = [...arr];
  for (let i = 0; i < a.length; i++) {
    const j = Math.min(a.length - 1, i + Math.floor(Math.random() * 3));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function scrapeBatchUrls() {
  const rawLines = $("batchInput").value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const batchSummary = $("batchSummary");
  const batchResults = $("batchResults");
  const batchCommentsReview = $("batchCommentsReview");
  const scrapeBtn = $("batchScrapeBtn");

  if (!rawLines.length) {
    batchSummary.textContent = "Paste up to 10 Reddit post URLs first.";
    return;
  }

  const urls = shuffleSlightly(rawLines.slice(0, 10));
  const extra = Math.max(0, rawLines.length - urls.length);
  const existingByUrl = new Map(state.posts.map((post, index) => [normalizeTrackerUrl(post.url), index]).filter(([url]) => url));
  const createdByUrl = new Map();
  const created = [];
  let updated = 0;
  let duplicates = 0;
  let invalid = 0;
  let failed = 0;
  const results = [];

  scrapeBtn.disabled = true;
  $("batchAddBtn").disabled = true;
  scrapeBtn.textContent = "Working...";
  batchResults.innerHTML = "";
  batchCommentsReview.innerHTML = "";

  try {
    for (let i = 0; i < urls.length; i++) {
      const rawUrl = urls[i];
      const normalizedUrl = normalizeTrackerUrl(rawUrl);
      batchSummary.textContent = `Scraping ${i + 1}/${urls.length}...`;

      if (!normalizedUrl) {
        invalid += 1;
        results.push({ title: rawUrl, detail: "Invalid Reddit post URL" });
        continue;
      }

      try {
        const payload = await scrapeRedditPost(rawUrl);
        const url = normalizeTrackerUrl(payload.permalink || normalizedUrl) || normalizedUrl;
        const classification = classifyText(`${url} ${payload.context || ""}`, "General A-series", "Price/value");
        const existingIndex = existingByUrl.has(url) ? existingByUrl.get(url) : existingByUrl.get(normalizedUrl);
        const createdPost = createdByUrl.get(url) || createdByUrl.get(normalizedUrl);
        if (createdPost) {
          duplicates += 1;
          results.push({ title: url, detail: "Duplicate in this batch skipped" });
          continue;
        }
        const post = {
          ...(existingIndex !== undefined ? state.posts[existingIndex] : {}),
          id: existingIndex !== undefined ? state.posts[existingIndex].id : generateId(),
          date: existingIndex !== undefined ? state.posts[existingIndex].date : today(),
          url,
          context:     payload.context || "",
          title:       payload.title || "",
          selftext:    payload.selftext || "",
          topComments: payload.topCommentTexts || [],
          subreddit:   payload.subreddit || inferSubreddit(url),
          device:      classification.device,
          topic:       classification.topic,
          angle:       classification.angle,
          status:      "Needs review",
          priority:    "Medium",
          owner:       $("ownerInput").value.trim(),
          comments:    [{}, {}, {}],
          updatedAt:   new Date().toISOString()
        };

        batchSummary.textContent = `Writing comments for ${i + 1}/${urls.length}...`;
        const { results: generatedComments, isIrrelevant } = await generateCommentsForPost(post);
        post.comments = isIrrelevant ? [{}, {}, {}] : generatedComments;
        post.isIrrelevant = isIrrelevant;
        const detailSuffix = isIrrelevant ? " (skipped â€” post is irrelevant)" : "";
        if (existingIndex !== undefined) {
          state.posts[existingIndex] = post;
          updated += 1;
          results.push({ title: post.context.split("\n")[0] || post.url, detail: `Updated with comments${detailSuffix}` });
        } else {
          created.push(post);
          createdByUrl.set(url, post);
          results.push({ title: post.context.split("\n")[0] || post.url, detail: `Added with comments${detailSuffix}` });
        }
      } catch (error) {
        console.error("[batch] Failed to scrape post:", rawUrl, error.message);
        failed += 1;
        results.push({ title: rawUrl, detail: error.message || "Failed" });
      }

      if (i < urls.length - 1) await wait(batchDelay());
    }

    if (created.length) {
      state.posts.unshift(...created);
      state.currentSelectedPostId = created[0].id;
      selectQueueItem(created[0].id);
    } else if (updated) {
      const firstUpdated = state.posts.find((post) => urls.some((url) => normalizeTrackerUrl(url) === normalizeTrackerUrl(post.url)));
      if (firstUpdated) selectQueueItem(firstUpdated.id);
    }

    $("batchInput").value = rawLines.slice(10).join("\n");
    savePosts();
    renderTracker();
    renderQueue();
    renderMetrics();

    batchSummary.textContent = `${created.length} added, ${updated} updated${duplicates ? `, ${duplicates} duplicate skipped` : ""}${invalid ? `, ${invalid} invalid skipped` : ""}${failed ? `, ${failed} failed` : ""}${extra ? `, ${extra} left for next batch` : ""}`;
    batchResults.innerHTML = results.map((item) => `
      <div class="batch-result-item">
        <strong>${escapeHtml(item.title.replace(/^Title:\s*/i, "").slice(0, 80) || "Untitled")}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
    `).join("");
    renderBatchCommentsReview([
      ...created,
      ...urls
        .map((url) => state.posts.find((post) => normalizeTrackerUrl(url) === normalizeTrackerUrl(post.url)))
        .filter(Boolean)
    ]);
    toast(`${created.length + updated} post${created.length + updated === 1 ? "" : "s"} scraped and written.`);
    if (created.length || updated) {
      $("commentStudio").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } finally {
    scrapeBtn.disabled = false;
    $("batchAddBtn").disabled = false;
    scrapeBtn.textContent = "Scrape + Generate";
  }
}

function findNextUnreviewed() {
  const next = state.posts.find(post => {
    if (post.status === "Posted") return false;
    const comments = post.comments || [];
    const commentCount = comments.filter(c => {
      if (typeof c === "string") return c.trim().length > 0;
      return c.text && c.text.trim().length > 0;
    }).length;
    return commentCount < 3;
  });

  if (next) {
    selectQueueItem(next.id);
  } else {
    toast("No posts need review.");
  }
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const headers = ["date", "url", "subreddit", "device", "topic", "angle", "priority", "owner", "status", "context", "comment_a", "comment_b", "comment_c", "final_comment"];
  const rows = [headers, ...state.posts.map((post) => {
    const comments = post.comments || [];
    return headers.map((key) => {
      if (key.startsWith("comment_")) {
        const idx = { comment_a: 0, comment_b: 1, comment_c: 2 }[key] ?? -1;
        if (idx < 0) return "";
        const comment = comments[idx];
        if (typeof comment === "string") return comment;
        return comment?.text || "";
      }
      if (key === "final_comment") {
        return post.finalCommentIndex >= 0 ? `Comment ${post.finalCommentIndex + 1}` : "";
      }
      return post[key] || "";
    });
  })];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  trackUserFeedback("export");
  download(`samsung-reddit-orm-${today()}.csv`, csv, "text/csv");
}

function exportJson() {
  trackUserFeedback("export");
  download(`samsung-reddit-orm-${today()}.json`, JSON.stringify(state.posts, null, 2), "application/json");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error("JSON must be an array export from this tool.");
    const byUrlOrId = new Map(state.posts.map((post) => [post.url || post.id, post]));
    imported.forEach((post) => {
      if (!post || typeof post !== "object") return;
      const id = post.id || generateId();
      byUrlOrId.set(post.url || id, {
        id,
        date: post.date || today(),
        url: post.url || "",
        context: post.context || "",
        subreddit: post.subreddit || inferSubreddit(post.url),
        device: post.device || "A57",
        topic: post.topic || "General A-series",
        angle: post.angle || "Price/value",
        status: post.status || "Needs review",
        priority: post.priority || "Medium",
        owner: post.owner || "",
        comments: post.comments?.length ? post.comments.slice(0, 3) : [{}, {}, {}],
        updatedAt: post.updatedAt || new Date().toISOString()
      });
    });
    state.posts = [...byUrlOrId.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    savePosts();
    renderTracker();
    renderMetrics();
    toast("JSON imported.");
  } catch (error) {
    toast(error.message || "Import failed.");
  } finally {
    event.target.value = "";
  }
}

function init() {
  fillSelect("topicInput", options.topics);
  fillSelect("angleInput", options.angles);
  fillSelect("statusInput", options.statuses);
  fillSelect("priorityInput", options.priorities);

  const savedTarget = loadSetting("orm_daily_target", "10");
  const savedName = loadSetting("orm_user_name", "");
  $("dailyTargetInput").value = savedTarget;
  $("userNameInput").value = savedName;
  $("ownerInput").value = savedName;
  if ($("passcodeInput")) $("passcodeInput").value = localStorage.getItem("appPasscode") || "";

  resetForm();
  renderTracker();
  renderQueue();
  renderMetrics();
  renderAngleBars();
  renderTemplates();

  // Initialize Phase 5 + 6 + 7 persistent state on load
  getWeeklyMoodBias();
  getDailyWritingBias();
  getAccountProfile();
  console.log("[ORM] Phase 7 active â€” archetype:", getAccountProfile().archetypeId || "unset");

  // â”€â”€ Platform radio buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const PLATFORM_HINTS = {
    reddit: "ðŸ’¡ Paste a Reddit URL and click Fetch. The post will automatically be loaded.",
    quora:  "ðŸ’¡ Quora is paste-only. Skip the URL and simply paste the text directly into the box below.",
  };

  document.querySelectorAll('input[name="platform"]').forEach(radio => {
    radio.addEventListener("change", () => {
      const p = radio.value;
      setPlatform(p);
      const hintEl = $("platformHint");
      const hint = PLATFORM_HINTS[p] || "";
      hintEl.textContent = hint;
      hintEl.style.display = hint ? "block" : "none";
    });
  });
  // Set initial chip
  setPlatform(currentPlatform());

  // â”€â”€ Fetch button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("fetchBtn").addEventListener("click", fetchContext);

  // â”€â”€ Generate button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("generateCommentsBtn").addEventListener("click", async () => {
    const post = currentPost();
    const replyMode = !!($("replyModeCheck") && $("replyModeCheck").checked);
    const parentComment = replyMode && $("parentCommentInput") ? $("parentCommentInput").value.trim() : "";

    if (!post.context && !post.title && !parentComment) {
      toast("Add some post context first â€” fetch a URL or paste text.");
      return;
    }
    if (replyMode && !parentComment) {
      toast("Paste the comment you're replying to.");
      return;
    }

    // Phase 5â€“8 advisory checks (non-blocking)
    const behaviorRisk = computeAccountBehaviorRisk();
    if (behaviorRisk) toast(behaviorRisk);
    const profile6 = getAccountProfile();
    const dormancy = computeDormancy(profile6);
    if (dormancy.recommend) toast(dormancy.message);
    const clustering = computeClusteringLevel();
    if (clustering > 0.6) console.warn("[ORM] Clustering:", clustering.toFixed(2));
    const coordRisk = computeCoordinationRisk();
    const overlapLvl = computeOverlapLevel();
    if (coordRisk > 0.6) console.warn("[ORM] Coordination risk:", coordRisk.toFixed(2));
    if (overlapLvl > 0.5) console.warn("[ORM] Phrase overlap:", overlapLvl.toFixed(2));
    const popHealth = getPopulationHealth();
    if (popHealth) console.log("[p8] Population health:", JSON.stringify(popHealth));

    const btn = $("generateCommentsBtn");
    btn.disabled = true;
    btn.textContent = "Generatingâ€¦";
    showIrrelevantBanner(false);
    currentPostIsIrrelevant = false;
    try {
      const { comments, skipped, behaviorWarning } = await generateAllComments(post, { replyMode, parentComment });
      if (behaviorWarning) console.warn("[ORM] Server behavior warning:", behaviorWarning);
      if (skipped) {
        currentPostIsIrrelevant = true;
        showIrrelevantBanner(true);
        trackUserFeedback("skip");
        toast("Post isn't relevant to Samsung A37/A57 â€” no comments generated.");
      } else if (comments.length > 0) {
        if (!document.querySelector(".comment-card")) {
          await renderCommentStudio(post);
        }
        comments.forEach((text, i) => setCommentValue(i, text));
        toast(replyMode ? "Replies generated." : "Comments generated. Pick the best one!");
      } else {
        trackUserFeedback("regen");
        toast("Could not generate. Try again.");
      }
    } catch {
      toast("Generation failed â€” check your connection.");
    } finally {
      btn.disabled = false;
      btn.textContent = "âœ¦ Generate Comments";
    }
  });

  // â”€â”€ Save button (replaces form submit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const saveBtn = $("saveBtn");
  if (saveBtn) saveBtn.addEventListener("click", savePost);
  // Keep legacy form submit wired in case anything calls it
  const wf = $("workForm");
  if (wf) wf.addEventListener("submit", (e) => { e.preventDefault(); savePost(e); });

  $("newBtn").addEventListener("click", resetForm);
  $("nextUnreviewedBtn").addEventListener("click", findNextUnreviewed);

  // â”€â”€ Reply mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("replyModeCheck").addEventListener("change", (e) => {
    $("parentCommentWrap").style.display = e.target.checked ? "block" : "none";
  });

  // â”€â”€ Queue filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("queueSearch").addEventListener("input", renderQueue);
  document.querySelectorAll(".fchip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.queueFilter = btn.dataset.filter;
      document.querySelectorAll(".fchip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderQueue();
    });
  });

  const platformFilter = $("platformFilter");
  if (platformFilter) {
    platformFilter.addEventListener("change", () => {
      state.platformFilter = platformFilter.value;
      renderQueue();
    });
  }

  $("contextInput").addEventListener("input", autoClassify);

  // â”€â”€ Tracker search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("searchInput").addEventListener("input", renderTracker);
  $("queueSearch").addEventListener("input", () => {
    $("searchInput").value = $("queueSearch").value;
    renderTracker();
  });

  // â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("settingsToggle").addEventListener("click", () => {
    const panel = $("settingsPanel");
    const overlay = $("settingsOverlay");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    overlay.style.display = isHidden ? "block" : "none";
  });
  const closeSettings = () => {
    $("settingsPanel").style.display = "none";
    $("settingsOverlay").style.display = "none";
  };
  $("settingsOverlay").addEventListener("click", closeSettings);
  $("settingsCloseBtn").addEventListener("click", closeSettings);
  $("dailyTargetInput").addEventListener("change", (e) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 10));
    saveSetting("orm_daily_target", value);
    e.target.value = value;
    renderMetrics();
  });
  $("userNameInput").addEventListener("change", (e) => {
    saveSetting("orm_user_name", e.target.value.trim());
  });
  if ($("passcodeInput")) {
    $("passcodeInput").addEventListener("change", (e) => {
      localStorage.setItem("appPasscode", e.target.value.trim());
    });
  }
  $("clearAllBtn").addEventListener("click", () => {
    if (confirm("Delete all tracked posts? This cannot be undone.")) {
      state.posts = [];
      savePosts();
      resetForm();
      renderTracker();
      renderQueue();
      renderMetrics();
      toast("All posts deleted.");
    }
  });

  // â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tabs = document.querySelectorAll(".nav-tab");
  const tabContents = document.querySelectorAll(".tab-content");
  
  const switchTab = (tabId) => {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
    tabContents.forEach(tc => tc.classList.toggle("active", tc.id === `tab-${tabId}`));
  };
  
  tabs.forEach(tab => {
    if (tab.dataset.tab) {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    }
  });

  // â”€â”€ Lead Finder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let currentLeads = [];

  const fetchLeads = async (query) => {
    $("leadLoading").style.display = "block";
    $("leadError").style.display = "none";
    $("leadResults").innerHTML = "";
    $("copyToSheetsBtn").style.display = "none";
    currentLeads = [];
    
    let finalQuery = query;
    if ($("intentFilterCheckbox") && $("intentFilterCheckbox").checked) {
      finalQuery += ' (buy OR buying OR upgrade OR worth OR "should i" OR review OR switch)';
    }
    
    try {
      let res;
      try {
        const url = `/reddit-proxy/search.json?q=${encodeURIComponent(finalQuery)}&sort=new&t=month&limit=100`;
        res = await fetch(url);
        if (!res.ok) throw new Error("Next.js proxy failed");
      } catch (err) {
        // Fallback to corsproxy.io client-side proxy
        const fallbackUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com/search.json?q=${encodeURIComponent(finalQuery)}&sort=new&t=month&limit=100`)}`;
        res = await fetch(fallbackUrl);
      }
      if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
      const data = await res.json();
      const posts = data.data.children;
      if (posts.length === 0) {
        $("leadResults").innerHTML = `<div class="empty-state" style="margin-top: 40px;"><div class="empty-icon">ðŸ¤·</div><p>No recent posts found for this query.</p></div>`;
        return;
      }
      
      currentLeads = posts;
      $("copyToSheetsBtn").style.display = "block";
      
      try {
        const cached = currentLeads.map(child => ({
          url: `https://www.reddit.com${child.data.permalink}`,
          selftext: child.data.selftext || ""
        }));
        // Merge with existing cache to keep historical leads, keeping the newest 500
        const existingCache = JSON.parse(localStorage.getItem('reddit_cached_leads') || '[]');
        const merged = [...cached, ...existingCache].slice(0, 500);
        localStorage.setItem('reddit_cached_leads', JSON.stringify(merged));
      } catch (e) {
        console.error("Failed to cache leads", e);
      }
      
      posts.forEach(child => {
        const p = child.data;
        const card = document.createElement("div");
        card.className = "lead-card";
        
        const permalink = `https://www.reddit.com${p.permalink}`;
        const titleText = (p.title || "").substring(0, 150);
        const bodyText = (p.selftext || "").substring(0, 200) + (p.selftext && p.selftext.length > 200 ? "..." : "");
        
        const commentsBadge = (p.num_comments === null || p.num_comments === undefined)
          ? ""
          : `<span class="lead-comments">ðŸ’¬ ${p.num_comments}</span>`;
        const dateStr = p.created_utc ? new Date(p.created_utc * 1000).toLocaleDateString() : "";

        card.innerHTML = `
          <div class="lead-card-header">
            <span class="lead-subreddit">r/${p.subreddit}</span>
            <span class="lead-author">u/${p.author}</span>
            ${commentsBadge}
            ${dateStr ? `<span class="lead-date">${dateStr}</span>` : ""}
          </div>
          <div class="lead-title"><a href="${permalink}" target="_blank" style="color: inherit; text-decoration: none;">${titleText}</a></div>
          <div class="lead-body">${bodyText}</div>
          <div class="lead-actions">
            <button class="hdr-btn load-lead-btn" data-url="${permalink}" style="color: var(--blue); border-color: var(--blue);">Load Post</button>
            <button class="hdr-btn add-batch-btn" data-url="${permalink}">Add to Batch</button>
          </div>
        `;
        
        card.querySelector(".load-lead-btn").addEventListener("click", (e) => {
           $("urlInput").value = e.target.dataset.url;
           const redditRadio = document.querySelector('input[name="platform"][value="reddit"]');
           if (redditRadio) redditRadio.checked = true;
           setPlatform("reddit");
           switchTab("studio");
           fetchContext();
           toast("Post loaded into generator.");
           window.scrollTo(0, 0);
        });
        
        card.querySelector(".add-batch-btn").addEventListener("click", (e) => {
           const batchArea = $("batchInput");
           const val = batchArea.value.trim();
           const url = e.target.dataset.url;
           if (!val.includes(url)) {
             batchArea.value = val ? val + "\\n" + url : url;
             toast("Added to Batch Import.");
             e.target.innerText = "Added âœ“";
             e.target.disabled = true;
           }
        });

        $("leadResults").appendChild(card);
      });
    } catch (err) {
      $("leadError").style.display = "block";
      $("leadError").textContent = err.message;
    } finally {
      $("leadLoading").style.display = "none";
    }
  };

  const fetchPriorityLeads = async () => {
    $("leadLoading").style.display = "block";
    $("leadError").style.display = "none";
    $("leadResults").innerHTML = "";
    $("copyToSheetsBtn").style.display = "none";
    try {
      const passcode = localStorage.getItem("appPasscode") || "";
      const res = await fetch(`${apiBase}/api/leads`, { headers: { "x-app-password": passcode } });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const leads = data.leads || [];
      if (leads.length === 0) {
        $("leadResults").innerHTML = `<div class="empty-state" style="margin-top: 40px;"><div class="empty-icon">ðŸ“­</div><p>${data.message || "No harvested leads yet. Run the harvester locally first."}</p></div>`;
        return;
      }

      const summary = document.createElement("div");
      summary.className = "msg-hint";
      summary.style.marginBottom = "12px";
      summary.textContent = `Showing ${leads.length} harvested leads, ranked by priority` +
        (data.counts && data.counts.scored ? ` (${data.counts.scored} AI-scored)` : "") + ".";
      $("leadResults").appendChild(summary);

      leads.forEach(p => {
        const card = document.createElement("div");
        card.className = "lead-card";

        const tier = p.priorityScore >= 70 ? "hot" : p.priorityScore >= 45 ? "warm" : "cold";
        const scoreBadge = p.aiScore != null ? `<span class="lead-comments">Intent ${p.aiScore}/5</span>` : "";
        const commentsBadge = (p.comments === null || p.comments === undefined) ? "" : `<span class="lead-comments">ðŸ’¬ ${p.comments}</span>`;
        const upvotesBadge = (p.upvotes === null || p.upvotes === undefined) ? "" : `<span class="lead-comments">â–² ${p.upvotes}</span>`;

        card.innerHTML = `
          <div class="lead-card-header">
            <span class="lead-priority lead-priority-${tier}">â˜… ${p.priorityScore}</span>
            <span class="lead-subreddit">r/${p.subreddit}</span>
            ${p.phone ? `<span class="lead-comments">${p.phone}</span>` : ""}
            ${scoreBadge}
            ${commentsBadge}
            ${upvotesBadge}
            ${p.date ? `<span class="lead-date">${p.date}</span>` : ""}
          </div>
          <div class="lead-title"><a href="${p.link}" target="_blank" style="color: inherit; text-decoration: none;">${(p.title || "").substring(0, 150)}</a></div>
          ${p.reason ? `<div class="lead-body">${p.reason}</div>` : ""}
          <div class="lead-actions">
            <button class="hdr-btn load-lead-btn" data-url="${p.link}" style="color: var(--blue); border-color: var(--blue);">Load Post</button>
            <button class="hdr-btn add-batch-btn" data-url="${p.link}">Add to Batch</button>
          </div>
        `;

        card.querySelector(".load-lead-btn").addEventListener("click", (e) => {
           $("urlInput").value = e.target.dataset.url;
           const redditRadio = document.querySelector('input[name="platform"][value="reddit"]');
           if (redditRadio) redditRadio.checked = true;
           setPlatform("reddit");
           switchTab("studio");
           fetchContext();
           toast("Post loaded into generator.");
           window.scrollTo(0, 0);
        });
        card.querySelector(".add-batch-btn").addEventListener("click", (e) => {
           const batchArea = $("batchInput");
           const val = batchArea.value.trim();
           const url = e.target.dataset.url;
           if (!val.includes(url)) {
             batchArea.value = val ? val + "\\n" + url : url;
             toast("Added to Batch Import.");
             e.target.innerText = "Added âœ“";
             e.target.disabled = true;
           }
        });

        $("leadResults").appendChild(card);
      });
    } catch (err) {
      $("leadError").style.display = "block";
      $("leadError").textContent = err.message;
    } finally {
      $("leadLoading").style.display = "none";
    }
  };

  $("priorityDashBtn").addEventListener("click", fetchPriorityLeads);

  $("searchS26Btn").addEventListener("click", () => {
    $("leadSearchInput").value = 'galaxy s26';
    fetchLeads($("leadSearchInput").value);
  });
  $("searchA37Btn").addEventListener("click", () => {
    $("leadSearchInput").value = '("galaxy a37" OR "galaxy a57")';
    fetchLeads($("leadSearchInput").value);
  });
  $("leadSearchBtn").addEventListener("click", () => {
    if ($("leadSearchInput").value.trim()) {
      fetchLeads($("leadSearchInput").value.trim());
    }
  });

  $("copyToSheetsBtn").addEventListener("click", () => {
    if (!currentLeads || currentLeads.length === 0) return;
    
    let tsv = "";
    currentLeads.forEach(child => {
      const p = child.data;
      const title = (p.title || "").replace(/\t/g, " ").replace(/\n/g, " ");
      const url = `https://www.reddit.com${p.permalink}`;
      const commentCol = ""; // Empty column C
      // Show blank (not a misleading 0) when Reddit didn't expose the number.
      const upvotes = (p.ups === null || p.ups === undefined) ? "" : p.ups;
      const numComments = (p.num_comments === null || p.num_comments === undefined) ? "" : p.num_comments;
      
      // Convert Reddit UTC timestamp to local date string
      const date = new Date(p.created_utc * 1000).toLocaleDateString();
      const cleanSelftext = (p.selftext || "").replace(/\t/g, " ").replace(/\n/g, " ");
      
      tsv += `${title}\t${url}\t${commentCol}\t${upvotes}\t${numComments}\t${date}\t${cleanSelftext}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      toast("Copied to clipboard! Paste directly into Google Sheets.");
    }).catch(err => {
      toast("Failed to copy to clipboard.");
      console.error(err);
    });
  });

  $("startFilterBtn").addEventListener("click", startAIFilter);
  $("exportFilteredBtn").addEventListener("click", exportFilteredCsv);

  // â”€â”€ Batch + export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  $("batchAddBtn").addEventListener("click", addBatchUrls);
  $("batchScrapeBtn").addEventListener("click", scrapeBatchUrls);
  $("exportCsvBtn").addEventListener("click", exportCsv);
  $("exportJsonBtn").addEventListener("click", exportJson);
  $("importJsonInput").addEventListener("change", importJson);
}

// â”€â”€ AI Filter Studio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let filterAcceptedLeads = [];

async function startAIFilter() {
  const text = $("filterInput").value.trim();
  if (!text) {
    toast("Please paste some raw CSV data first.");
    return;
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const postsToFilter = [];
  
  const cachedLeads = JSON.parse(localStorage.getItem('reddit_cached_leads') || '[]');

  for (const line of lines) {
    if (line.toLowerCase().startsWith("title")) continue;
    
    let cols = line.split("\t");
    if (cols.length < 2) cols = line.split(",");
    
    let title = cols[0];
    let url = cols[1];
    
    if (url && url.startsWith('"')) url = url.replace(/"/g, '');
    if (title && title.startsWith('"')) title = title.replace(/"/g, '');
    
    if (cols.length >= 8 && cols[7] && cols[7].startsWith('http')) {
       url = cols[7];
       title = cols[3];
    }

    if (url && url.includes("reddit.com")) {
      const subMatch = url.match(/\/r\/([^/]+)/);
      const subreddit = subMatch ? subMatch[1] : "unknown";
      
      let selftext = "";
      if (cols.length >= 7 && cols[6] && !cols[6].startsWith('http')) {
         selftext = cols[6];
      }
      
      if (!selftext) {
        const matchedCache = cachedLeads.find(c => c.url === url || url.includes(c.url) || c.url.includes(url));
        if (matchedCache) {
          selftext = matchedCache.selftext;
        }
      }
      
      postsToFilter.push({ title, url, subreddit, selftext });
    }
  }

  if (postsToFilter.length === 0) {
    toast("No valid Reddit URLs found in the pasted text.");
    return;
  }

  $("filterProgressCard").style.display = "block";
  $("filterResultsCard").style.display = "block";
  $("filterResultsArea").innerHTML = "";
  $("filterProgressBar").style.width = "0%";
  $("filterAcceptedText").textContent = "0 Accepted";
  filterAcceptedLeads = [];

  let processed = 0;
  let accepted = 0;
  $("startFilterBtn").disabled = true;

  for (const post of postsToFilter) {
    $("filterCurrentPost").textContent = `Evaluating: ${post.title}`;
    
    try {
      const passcode = localStorage.getItem("appPasscode") || "";
      const res = await fetch("/api/filter-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-password": passcode },
        body: JSON.stringify(post)
      });
      
      if (res.ok) {
        const evaluation = await res.json();
        
        if (evaluation.decision === "ACCEPT" && evaluation.score >= 4) {
          accepted++;
          $("filterAcceptedText").textContent = `${accepted} Accepted`;
          filterAcceptedLeads.push({ post, evaluation });
          
          const div = document.createElement("div");
          div.className = "lead-card";
          div.innerHTML = `
            <div class="lead-header">
              <span class="lead-sub">r/${post.subreddit}</span>
              <span style="background: var(--green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold;">Score: ${evaluation.score}</span>
            </div>
            <div class="lead-title"><a href="${post.url}" target="_blank">${post.title}</a></div>
            <div style="font-size: 0.85em; color: var(--text-2); margin-top: 5px;">
              <strong>Theme:</strong> ${evaluation.primary_theme} <br>
              <strong>Pitch Feature:</strong> ${evaluation.feature_to_mention} <br>
              <em style="color: var(--amber); margin-top: 5px; display: inline-block;">${evaluation.reason}</em>
            </div>
          `;
          $("filterResultsArea").appendChild(div);
        }
      } else {
        const errText = await res.text();
        console.error("API Error for", post.url, res.status, errText);
        $("filterCurrentPost").textContent = `Error ${res.status} for ${post.title.substring(0,20)}...`;
        await new Promise(r => setTimeout(r, 1000)); // Pause briefly to show the error
      }
    } catch (err) {
      console.error("Filter failed for", post.url, err);
      $("filterCurrentPost").textContent = `Crash: ${err.message}`;
      await new Promise(r => setTimeout(r, 1000));
    }

    processed++;
    $("filterProgressText").textContent = `${processed} / ${postsToFilter.length} Processed`;
    $("filterProgressBar").style.width = `${(processed / postsToFilter.length) * 100}%`;
  }
  
  $("filterCurrentPost").textContent = "Evaluation Complete!";
  $("startFilterBtn").disabled = false;
}

function exportFilteredCsv() {
  if (filterAcceptedLeads.length === 0) return;
  
  let csv = "Decision,Score,Theme,Feature,Country,Reason,Subreddit,Title,Link\n";
  for (const item of filterAcceptedLeads) {
    const ev = item.evaluation;
    const p = item.post;
    const cleanTitle = (p.title || "").replace(/"/g, '""');
    const cleanReason = (ev.reason || "").replace(/"/g, '""');
    
    csv += `"ACCEPT",${ev.score},"${ev.primary_theme}","${ev.feature_to_mention}","${ev.country_context}","${cleanReason}","${p.subreddit}","${cleanTitle}","${p.url}"\n`;
  }
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `golden-leads-${today()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

