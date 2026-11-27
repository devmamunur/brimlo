# itch watch

Finds **new and popular** incremental / idle / clicker games on [itch.io](https://itch.io).

**Why (27 Nov 2026):** after mana.gs, itch.io is where viral free incremental games start (Find The Clover → Ridiculously Random 89K; Every Last Grain was on itch.io before Mana hosted it). Other portals (CrazyGames, Poki, Newgrounds, Kongregate, Armor Games) had no viral examples in our data. itch.io's "new and popular" list is its own quality signal: new games players already like.

## Run

```bash
python3 -I tools/itch-watch/check.py
```

- First line: `FIRST RUN`, `CHANGE` or `NO CHANGE`. `--json` gives machine output.
- Keeps games from the last 14 days that are free or cost ≤ $5; shows price, browser/download, age and rank.
- Reads only the public RSS feeds `games/new-and-popular/tag-<tag>.xml` (robots.txt allows them; `/search` is not used). Uses `curl` (python.org Python on this Mac has no SSL certificates).
- State: `out/known.json` (not in git).

## Where it is used

- `/pick-game` Step 1: a fitting new game with an English YouTube video that has outlier views = GO; without videos = "Watch".
- Scheduled task `itch-watch` (Claude desktop app): 9:30 AM + 7:30 PM Dhaka, alerts on new fitting games.
