# Mana watch

Finds new free browser games on [mana.gs](https://mana.gs) (Drink the Ocean, Big Ice…).

**Why (17 Nov 2026):** KitGain (~200 subs) made the first YouTube video of Drink the Ocean, about 1 day after launch, and got 55K views. Our video came about 2 days later and got about 900. For Big Ice, nobody posted for 7 days; then KitGain posted first and got 13K. With Mana games, **being first beats polish**.

## Run

```bash
python3 -I tools/mana-watch/check.py
```

- The first line says `FIRST RUN`, `CHANGE` or `NO CHANGE`.
- `CHANGE` lists `NEW GAME` (new page on mana.gs) or `NOW PLAYABLE` (was "Coming Soon").
- `--json` gives machine output.
- The state is saved in `out/known.json` (not in git).
- It uses `curl`, because python.org Python on this Mac has no SSL certificates. It reads only `sitemap.xml` and the public game pages, which robots.txt allows.

## Where it is used

- `/pick-game` Step 1 **M**: Mana check first; a fitting new Mana game = ⭐ BEST.
- Scheduled task `mana-watch` (Claude desktop app): runs twice a day and alerts on a new game.
- Launch dates: Mana posts "X is out now" on x.com/playonmana.

## Known Mana games (17 Nov 2026)

| Game | Type | Out | Brimlo |
|---|---|---|---|
| Big Ice | Incremental | Sun 8 Nov 2026 | ✅ Tue 17 Nov |
| Tornado Watch | Co-op survival | Mon 9 Nov 2026 | skip (no upgrade loop, guess) |
| Drink the Ocean | Incremental | Thu 12 Nov 2026 | ✅ Sun 15 Nov |
| Pawn It! | Simulation | ~14 Nov 2026 (guess, sitemap date) | not checked yet |
| Motel 9 / Feeding Time | Horror | ~14–16 Nov 2026 | skip (not our niche) |
| Butterfingers | ? | Coming Soon | watch |
