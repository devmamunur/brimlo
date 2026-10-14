# Brimlo Research Tool

My own free vidIQ for the Brimlo channel. One core, three ways to use it:

| Way | How |
|---|---|
| **Claude Code (MCP)** | Registered in `/.mcp.json`. Tools are named `brimlo_*`. |
| **Terminal (CLI)** | `pnpm research:cli <command> "<text>" [--flag value] [--json]` |
| **Dashboard** | Coming in slice 4. |

All data goes into one SQLite file (`data/`). What Claude finds will show in the dashboard later.

## Status

| Slice | What | State |
|---|---|---|
| 1 | Core, quota guard, cache, `keyword_research`, `quota_status`, CLI, MCP | **Done** |
| 2 | Channels, outliers, competitors, video tools | **Done and tested live** |
| 3 | Title scoring, patterns, tags, trending, ideas | Planned |
| 4 | API + dashboard | Planned |
| 5 | Own-channel OAuth, update agents/skills | Planned |

## Setup

```bash
cd tools/research
pnpm install
cp .env.example .env      # then add your key (see below)
pnpm test
pnpm research:cli quota_status
```

Needs Node 24 or newer (uses the built-in `node:sqlite`).

### Demo mode

If `YOUTUBE_API_KEY` is empty, the tool runs in **demo mode**:
- YouTube video and channel data is **fake** (same input = same fake output).
- Autocomplete suggestions are **real** (they are free and need no key).
- It uses a separate file, `data/brimlo.demo.sqlite`. Your real data is never mixed with demo data.
- Every answer says `source: demo` and shows a warning.

When you add a key, it switches to live mode on its own.

### Get a YouTube API key

1. Open https://console.cloud.google.com and sign in.
2. Click the project name at the top, then **New project**. Name it `brimlo-research`. Click **Create**.
3. Open **APIs & Services → Library**. Search **YouTube Data API v3**. Click **Enable**.
4. Open **APIs & Services → Credentials**. Click **Create credentials → API key**.
5. Click **Edit API key**. Under **API restrictions**, choose **Restrict key** and pick **YouTube Data API v3**. Save.
6. Put the key in `tools/research/.env`:
   `YOUTUBE_API_KEY=your_key_here`
7. Run `pnpm research:cli quota_status`. It should say `Mode: live`.

Never put the key in git. `.env` is in `.gitignore`.

### yt-dlp (transcripts only)

`video_transcript` needs a current yt-dlp. The system one (2024.04) is too old and fails. Install a private copy in this folder (it does not touch your system):

```bash
cd tools/research
python3 -m venv .venv && .venv/bin/pip install -U yt-dlp
```

The tool uses `tools/research/.venv/bin/yt-dlp` automatically, or the path in `YT_DLP_PATH`. Update it now and then: `.venv/bin/pip install -U yt-dlp`.

## Quota (important)

The free limit is **10,000 units per day**. It resets at midnight Pacific time.

| Call | Cost |
|---|---|
| `search.list` (search for videos) | **100** |
| `videos.list`, `channels.list`, `playlistItems.list` | 1 |
| Autocomplete suggestions | 0 (not part of the API) |

- One `keyword_research` costs about **102 units**. That is about **88 searches a day**.
- The tool warns at **70%** and **stops at 90%** (the stop is enforced in code, `quota/guard.ts`).
- Every answer is cached for 24 hours. A cached answer costs 0.
- Use `--estimate_only` to see the cost before you spend it.

## Scores (estimates)

Both scores come from the top 50 search results. They are **not** real search volume. The exact formula is returned with every score. The code is in `packages/core/src/scoring/keyword.ts`.

- **Competition (0–100):** how strong the ranking channels and videos are. Higher is harder.
- **Opportunity (0–100):** demand (views per day), small channels that beat their size, and fresh videos. Higher is better.

## Commands

| Command | Example |
|---|---|
| `keyword_research` | `pnpm research:cli keyword_research "incremental game" --limit 10` |
| `quota_status` | `pnpm research:cli quota_status` |

Add `--json` for JSON only. Add `--estimate_only` to see the cost first.

## How Claude should use this

- Use `brimlo_*` tools first. They are free. Use the vidIQ MCP only when this tool cannot answer.
- The vidIQ credit rule in `CLAUDE.md` applies to vidIQ only.
- Call `brimlo_quota_status` before big research. Call tools with `estimate_only: true` when unsure about cost.
- Read the `source` field. If it says `demo`, the numbers are fake. Never use them for decisions.
- Results are capped at the top 20 by default. Use `limit` for more.
- Scores are estimates. Say so when you report them.

## Code map

```
packages/core/src/
  tools.ts        the one tool list (CLI, MCP and API all read it)
  features/       one file per feature
  providers/      youtube-api.ts (real), demo.ts (fake), autocomplete.ts
  quota/guard.ts  unit costs, 70% warn, 90% stop
  cache.ts        24h cache in SQLite
  scoring/        pure score functions (tested)
  db/             schema.sql, client, repo
packages/cli/     terminal
packages/mcp/     MCP server (stdio)
```

To add a feature: write it in `features/`, add it to `tools.ts`. It appears in the CLI and MCP automatically.
