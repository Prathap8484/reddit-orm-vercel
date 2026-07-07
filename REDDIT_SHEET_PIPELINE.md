# Reddit Sheet Pipeline

This pipeline finds Reddit buying-intent posts without Reddit API keys and creates a Google-Sheet-ready CSV.

## Requirements

Create `.env` or `.env.local` with:

```text
ANTHROPIC_API_KEY=your_key_here
```

## Run

Double-click:

```text
run-reddit-sheet.cmd
```

Or run:

```bash
node broad-harvest.mjs --days 90 --out .
node sheet-pipeline.mjs master.csv reddit_sheet_output.csv
```

## Output

The final file is:

```text
reddit_sheet_output.csv
```

Columns:

```text
Title, URL, Comment, Upvotes, No. of comments, Date published
```

## Notes

- No Reddit API key is used.
- Upvotes are enriched from old.reddit pages when available.
- Anthropic is used only for buying-intent filtering and comment writing.
- Broad searches include exact model posts plus segment-based buying posts where S26, A37, or A57 can fit naturally.
