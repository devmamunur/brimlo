# Brimlo Research Tool

Our own free vidIQ. It finds keywords, outlier videos, competitor uploads, title and tag ideas, and tracks the channel. Claude Code can use it directly (MCP), you can use it in the terminal (CLI), and you can look at the same data in a dashboard.

| Way | How |
|---|---|
| **Claude Code (MCP)** | Registered in the repo's `.mcp.json`. Tools are named `brimlo_*`. Restart Claude Code once to load them. |
| **Terminal (CLI)** | `pnpm research:cli <command> "<text>" [--flag value] [--json]` |
| **Dashboard** | `pnpm research:dev` → http://localhost:5173 |

All three read and write one SQLite file in `data/`. What Claude finds shows up in the dashboard.

## Setup (once)

```bash
cd tools/research
pnpm install
cp .env.example .env        # then add your key, see "Get a YouTube API key"
pnpm test                   # 70+ tests
pnpm research:cli quota_status
```

Needs Node 24 or newer (uses the built-in `node:sqlite`).

### Get a YouTube API key

1. Open https://console.cloud.google.com and pick (or create) a project.
2. **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. In **API restrictions** choose **Restrict key** → tick only **YouTube Data API v3** (type `YouTube` in the filter). Leave application restrictions on **None**.
5. Put it in `tools/research/.env`: `YOUTUBE_API_KEY=your_key`.
6. `pnpm research:cli quota_status` must say `Mode: live`.

Never put the key in git or in a chat. `.env` is ignored by git.

### Demo mode

With an empty `YOUTUBE_API_KEY` the tool uses **fake** video/channel data and a separate file (`data/brimlo.demo.sqlite`), so fake numbers never mix with real ones. Every answer says `source: demo`. Autocomplete suggestions are still real. The dashboard shows a red banner.

### yt-dlp (only for transcripts)

The system yt-dlp is often too old and fails. Install a private copy (does not touch your system):

```bash
python3 -m venv .venv && .venv/bin/pip install -U yt-dlp
```

The tool uses `.venv/bin/yt-dlp` automatically (or the path in `YT_DLP_PATH`). Update it now and then with `.venv/bin/pip install -U yt-dlp`.

## Quota (important)

Free limit: **10,000 units per day**, reset at midnight Pacific time.

| Call | Cost |
|---|---|
| Search for videos (`search.list`) | **100** |
| Videos, channels, uploads, comments (`*.list`) | 1 per call (up to 50 items) |
| Autocomplete, transcripts, scoring titles | 0 |

- About **88 searches per day**. A keyword search is ~102 units. A channel check is ~3.
- The tool **warns at 70% and stops at 90%** (enforced in `quota/guard.ts`, with tests).
- Everything is cached for 24 hours. A cache hit costs 0. The same niche query is shared by `outliers`, `title_patterns`, `description_and_tags`, `trending` and `idea_engine`.
- Use `--estimate_only` (keyword_research, idea_engine) to see the cost first. The dashboard asks you to confirm before it spends units.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `quota_status` | Units used today, searches left | 0 |
| `keyword_research` | Autocomplete + top 50 videos + competition & opportunity scores | ~102 |
| `outliers` | Videos far above their channel's normal views. Modes: `query` (niche), `channels`, or tracked competitors | ~102 / ~3 per channel |
| `competitors_seed / _add / _remove / _list / _refresh` | Track channels; refresh = new uploads + outliers | ~3 per channel |
| `channel_stats`, `channel_videos` | One channel's numbers and recent uploads | ~3 |
| `video_stats`, `video_tags`, `video_comments` | One video | 1–4 |
| `video_transcript` | Captions with timestamps (yt-dlp) | 0 |
| `similar_videos`, `similar_channels` | By title words and tags. Local DB is free; `online` adds a search | 0 / 100 |
| `score_title` | Scores 1–5 titles 0–100 against `playbook/titles.md` | 0 |
| `title_patterns` | Which title shapes win in a niche | ~102 |
| `description_and_tags` | Common tags (≤500 chars), hashtags, description keywords | ~102 |
| `trending` | Fast-growing videos in a niche | ~102 |
| `idea_engine` | Evidence pack for a game/topic. Claude writes the ideas | ~204 cold |
| `ideas_list / idea_save / idea_update` | Saved ideas (idea → planned → recorded) | 0 |
| `own_channel` | Brimlo's own subs, views, recent uploads, YPP progress; watch hours with OAuth | ~3 |

Examples:

```bash
pnpm research:cli keyword_research "incremental game" --limit 10
pnpm research:cli outliers "idle mining game" --days 30 --max_subs 20000
pnpm research:cli score_title "The mining incremental game where you dig until the numbers BREAK"
pnpm research:seed                       # track everyone in research/competitors.md (~11 units)
pnpm research:cli competitors_refresh    # weekly check (~33 units)
pnpm research:demo "idle mining game"    # full session through the MCP server
```

Tip: `pnpm` can break arguments that contain an apostrophe. For those, run `node_modules/.bin/tsx packages/cli/src/index.ts <command> ...` directly.

## How the scores work (all estimates)

The exact formula comes back with every score. Code: `packages/core/src/scoring/`.

- **Competition (0–100)**: how strong the ranking videos and channels are. Higher = harder. 40% share of channels with 100K+ subs, 30% median views, 30% median channel size.
- **Opportunity (0–100)**: 40% demand (median views per day), 40% small channels (<50K subs) whose video has 3× more views than they have subs, 20% fresh videos (<90 days).
- **Outlier ×** = views ÷ channel baseline. Baseline = median of the channel's last ~20 long-form uploads, or (rough fallback in niche search) total views ÷ video count. Videos under 3 days old are flagged `young`. Shorts are excluded by default.
- **Title score**: a checklist from `playbook/titles.md` (length 15, template A–I 15, keyword 15, CAPS 10, rules 10, power words 15, clarity 10, autocomplete demand 5, shape vs stored high-view titles 5). It also flags emoji, creator names and "part 1" wording. It is **not** a prediction of views.

Search volume does not exist in the free YouTube API. These are proxies built from what ranks and how it performs.

## Dashboard

```bash
pnpm research:dev        # API on :8787 + dashboard on :5173 (development)
pnpm research:build      # build the dashboard, then pnpm research:api serves everything on :8787
```

Pages: Overview (YPP progress, quota, subscriber trend, new outliers), Keywords, Outliers (sortable, save as idea), Competitors, Title Lab (compare up to 5 titles), Video detail, Ideas (idea → planned → recorded), Settings (status, CSV/JSON export). Anything that spends quota asks you to confirm first. The API only accepts requests from your own computer.

## Connect your own channel (optional)

Without this, `own_channel` gives subscribers, views and recent uploads (no setup beyond the API key). OAuth adds **watch hours (365 days)** and per-video average view duration/percentage.

1. Google Cloud Console → **APIs & Services → Library** → enable **YouTube Analytics API** (and Data API v3).
2. **OAuth consent screen**: user type External, add yourself as a **Test user**.
3. **Credentials → Create credentials → OAuth client ID → Desktop app**.
4. Put `YOUTUBE_OAUTH_CLIENT_ID` and `YOUTUBE_OAUTH_CLIENT_SECRET` in `.env`.
5. `pnpm research:cli auth` → open the link → **choose the Brimlo channel** (not your personal one) → allow.
6. `pnpm research:cli own_channel`.

Scopes are read-only. Tokens are saved in `data/oauth.json` (ignored by git, mode 600). **Not tested against real Google yet**: the logic is tested with a mocked Google (PKCE, token refresh, report parsing), so expect to fix small things on the first real run.

**Not available anywhere:** impressions and click-through rate (CTR). The YouTube Analytics API does not offer them. Read them in YouTube Studio.

## How Claude should use this

- Use `brimlo_*` tools first. They are free. Use the vidIQ MCP only when these cannot answer. The vidIQ credit rule in `CLAUDE.md` is for vidIQ only.
- Start big jobs with `brimlo_quota_status`. Ask before spending more than 300 units in one task.
- Read `source`. `demo` means fake numbers: never use them for decisions.
- Say that scores are estimates.
- Lists are capped (top 20 by default). Use `limit` for more. Long texts (transcripts) come in parts.
- Never put other creators' names in titles, tags or descriptions.

## Code map

```
packages/core/src/
  tools.ts          the one tool list (CLI, MCP and API all read it)
  features/         one file per feature
  providers/        youtube-api.ts (real), demo.ts (fake), autocomplete.ts, oauth.ts
  quota/guard.ts    unit costs, 70% warn, 90% stop
  cache.ts          24h cache in SQLite
  scoring/          pure score functions (tested)
  dashboard.ts      read-only queries for the dashboard
  db/               schema.sql, client, repo
packages/cli/       terminal
packages/mcp/       MCP server (stdio) and the demo
packages/api/       local HTTP API (Fastify)
apps/dashboard/     React + Vite + Tailwind + Recharts + TanStack
```

To add a feature: write it in `features/`, add it to `tools.ts`. It appears in the CLI, MCP and API automatically.

## Known limits

- OAuth against real Google is untested (see above). YouTube Analytics access may need your OAuth app to be verified or in "testing" mode with you as a test user.
- Query-mode outliers use a rough baseline (channel average). Use `channels` mode or competitors for a median baseline.
- The first-week view count is not available; `views_per_day` is total views ÷ age (minimum 6 hours).
- `description_and_tags` can pick up sponsor or affiliate text and game names from other videos. The first description lines are only a draft.
- The API quota counter counts calls made through this tool only. Other uses of the same key are not counted.
