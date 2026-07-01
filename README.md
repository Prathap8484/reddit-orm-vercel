# Samsung A37/A57 Reddit ORM Workbench

A Vercel-ready team workbench for finding Reddit context, drafting natural comments, reviewing quality, and exporting daily work.

## What This Tool Does

- Fetches Reddit post title, subreddit, body, and top comments from a post URL with inline error handling.
- Generates editable draft comments (3 safe local drafts, or 4-5 Claude AI drafts if configured).
- Tracks posts with full metadata: device, topic, angle, priority, status, owner, and comments.
- Auto-classifies posts by device, topic, and angle based on post context.
- Flags risky wording, unsupported claims, repetition, and overly promotional tone with inline QA warnings.
- Displays daily progress toward a configurable daily target (default: 10 posts/day).
- Shows angle balance summary to avoid overusing any single response angle.
- Exports CSV or JSON for reporting and team handoff.
- Imports JSON backups so teammates can move work between browsers with automatic deduplication.
- Persists settings (daily target, team member name) to browser localStorage.
- Copies selected comment to clipboard with inline confirmation.
- Optionally uses Claude Haiku API server-side to generate AI-drafted comment options when `ANTHROPIC_API_KEY` is configured (fully optional).

## What It Does Not Do

- It does not auto-post to Reddit.
- It does not log into or manage Reddit accounts.
- It does not bypass subreddit rules.

Those limits are intentional so the tool stays useful for drafting and QA without creating account-safety problems.

## Deploy To Vercel

1. Upload or import the `reddit-orm-vercel` folder into Vercel.
2. Use the default Vercel settings.
3. Deploy.

No database or environment variables are required. Data is stored in each user's browser. Use JSON export/import when teammates need to share a work file.

### Optional Claude AI Drafting

Claude AI is optional. Without it, the app uses safe local draft templates.

To enable AI drafting on Vercel, add this environment variable:

```text
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Get an API key from [Anthropic Console](https://console.anthropic.com).

The key is only used by the serverless API and is never exposed in browser JavaScript.

## Local Preview

If Node is available:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:4180
```
