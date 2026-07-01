# Team Workflow

## Recommended Daily Flow

1. **Set your name in Settings.** Click the ⚙️ Settings button and enter your name. This auto-fills the Owner field on all new posts.
2. **Set your daily target.** In Settings, set how many posts you aim to draft/post per day (default: 10). Your progress is shown on the dashboard.
3. **Paste Reddit URLs into Batch Intake** or fetch individual URLs one at a time.
4. **For each post:** Fetch context, review auto-classification, generate drafts, select a final comment.
5. **Run QA:** Check the Quality Assurance warnings and fix any issues flagged.
6. **Save to tracker** when the post is ready.
7. **Track status:** Mark rows as Drafted, Needs review, Posted, or Skipped as you work.
8. **Check angle balance:** Make sure you are not overusing one response angle. The "Angle Balance" section shows how many posts use each angle.
9. **Export CSV** for manager reporting.
10. **Export JSON** at the end of the day as a backup or to hand off work to a teammate.

## Team Sharing

This app does not use a shared database. Each teammate's data stays in their browser.

Use this process when work needs to move between teammates:

1. Teammate A exports JSON.
2. Teammate B imports JSON.
3. Duplicate Reddit URLs merge automatically.

## Understanding QA Warnings

The QA Checker runs automatically and flags potential issues. Warnings are **informational only** — you can save or post even if warnings appear. Here's what each warning means and when to fix it:

### Danger-level warnings (usually fix these):
- **"Review 'X' because it can sound unsupported or fake"** — The comment contains words like "best phone", "guaranteed", "perfect", "I own", "I bought", or "must buy". These can make the comment sound like marketing or a fake personal claim. **Fix it** by removing or rephrasing the language.
- **"Avoid personal ownership or usage claims"** — The comment says "I have", "I use", "my phone", "my A37", or "my A57". Only include these if your teammate has actually verified that they own/use the device. **Ask first** before posting.

### Warning-level warnings (use your judgment):
- **"Comment may be too thin"** — The comment is under 90 words. Reddit replies this short can feel dismissive. **Fix it** by adding one useful reason or point from the post context.
- **"Comment is long"** — Over 650 words. Reddit replies this long feel unnatural and like blog posts. **Shorten it** to 100-150 words.
- **"Samsung is repeated often"** — The comment mentions Samsung 4+ times. **Reduce it** — use "the A37" or "it" instead of repeating "Samsung A37".
- **"Comment may read too sales-focused"** — Words like "buy", "purchase", "recommend", "shortlist" appear 4+ times. **Soften it** — use "could consider", "worth watching", or "might be worth looking at".
- **"Opening line is similar to another saved comment"** — You have used this opening in a previous comment. **Change it** to keep comments distinct and fresh.
- **"Speculation reply should use softer wording"** — For Launch/speculation posts, use "if", "could", "might", "worth watching". **Add softer language** instead of sounding certain.

### Info-level (no action needed):
- **"Looks ready after a human context check"** — Great! The comment passed all QA checks. Still do a final human review before posting.

## Quality Standard

- **Answer the Reddit post first.** Start by addressing what the user is actually asking or discussing.
- **Mention Samsung A37/A57 naturally.** Use it once or twice max, only when relevant.
- **Avoid fake personal ownership claims.** Never say "I own this" or "I use this" unless verified.
- **Avoid confirmed-spec claims unless official.** Use "could", "might", "if", "should" for unconfirmed specs.
- **Skip posts where a positive Samsung comment would feel forced.** Not every post needs a Samsung comment.
- **Keep comments short.** 100–150 words is ideal. Reddit users respect brevity.

## Account Safety

The workbench is intentionally a drafting and tracking tool. It does not auto-post, rotate accounts, or perform actions on Reddit. Use the final comment manually and follow subreddit rules.
