# Deploy To Vercel

## Folder To Deploy

Deploy this folder:

`reddit-orm-vercel`

## Files Included

- `index.html` - app page
- `styles.css` - visual design
- `app.js` - tracker, drafts, QA, import/export
- `api/reddit.js` - serverless Reddit context fetcher
- `api/generate-comments.js` - optional server-side Gemini draft generator
- `package.json` - Vercel/Node metadata
- `vercel.json` - deployment headers

## Vercel Settings

Use Vercel defaults:

- Framework preset: Other
- Build command: leave empty
- Output directory: leave empty
- Install command: leave empty

## After Deployment

Open the Vercel URL and test:

1. Paste a Reddit post URL.
2. Click Fetch Context.
3. Confirm context appears.
4. Generate drafts.
5. Save a tracker row.
6. Export CSV.

No API keys or environment variables are required. The tool works fully with safe local drafts.

### Optional: Claude AI Drafting

To enable AI-powered comment drafting using Claude Haiku:

1. Get an API key from [Anthropic Console](https://console.anthropic.com)
2. In Vercel project settings, add an environment variable:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** (paste your Anthropic API key)
3. Redeploy your project

With the API key configured, the "Generate Drafts" button will offer Claude AI-generated drafts for review. Without it, the tool uses 3 safe, natural local draft templates. The tool functions fully either way — Claude integration is completely optional.

## Optional Gemini Drafting

To enable Gemini-powered drafts, add this Vercel environment variable:

```text
GEMINI_API_KEY=your_google_ai_studio_key
```

Optional model override:

```text
GEMINI_MODEL=gemini-2.5-flash
```

Keep API keys in Vercel environment variables only. Do not paste keys into `app.js` or any browser file.
