#!/usr/bin/env python3
"""Mana watch: find new games on mana.gs (free browser games).

Why: KitGain made the FIRST YouTube video of Drink the Ocean (~1 day after
launch) and got 55K views. Being first on a new Mana game matters more
than polish (research 17 Nov 2026).

What it does:
- reads https://mana.gs/sitemap.xml (robots.txt allows it) and each game page
- status per game: "Play Now" (out) or "Coming Soon"
- compares with the last run (out/known.json) and prints:
  NEW GAME, NOW PLAYABLE (was Coming Soon), or "no change"

Run:  python3 -I tools/mana-watch/check.py          (normal)
      python3 -I tools/mana-watch/check.py --json   (machine output)
Exit code 0 always; the first line says CHANGE or NO CHANGE.
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://mana.gs"
NOT_GAMES = {"", "about", "support", "privacy", "terms", "login", "signup"}
OUT = Path(__file__).resolve().parent / "out"
STATE = OUT / "known.json"
UA = "Mozilla/5.0 (brimlo-mana-watch)"


def get(url: str) -> str:
    # curl, because python.org Python on this Mac has no SSL certificates
    r = subprocess.run(["curl", "-sfL", "--max-time", "20", "-A", UA, url],
                       capture_output=True, check=True)
    return r.stdout.decode("utf-8", "replace")


def page_status(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    if re.search(r"coming soon", text, re.I):
        return "coming_soon"
    if re.search(r"play now", text, re.I):
        return "playable"
    return "unknown"


def page_title(html: str, slug: str) -> str:
    m = re.search(r"<title>([^<]+)</title>", html)
    t = m.group(1).strip() if m else slug
    return re.sub(r"\s*[|\-–·]\s*Mana.*$", "", t).strip() or slug


def scan() -> dict:
    sitemap = get(f"{BASE}/sitemap.xml")
    games = {}
    for block in re.findall(r"<url>(.*?)</url>", sitemap, re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block).group(1)
        slug = loc.replace(BASE, "").strip("/")
        if slug in NOT_GAMES or "/" in slug:
            continue
        lastmod = re.search(r"<lastmod>([^<]+)</lastmod>", block)
        html = get(f"{BASE}/{slug}")
        games[slug] = {
            "name": page_title(html, slug),
            "url": f"{BASE}/{slug}",
            "status": page_status(html),
            "lastmod": lastmod.group(1)[:19] if lastmod else None,
        }
    return games


def main() -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    games = scan()
    old = json.loads(STATE.read_text()) if STATE.exists() else None
    changes = []
    if old is not None:
        prev = old.get("games", {})
        for slug, g in games.items():
            p = prev.get(slug)
            if p is None:
                changes.append(("NEW GAME", slug, g))
            elif p["status"] != "playable" and g["status"] == "playable":
                changes.append(("NOW PLAYABLE", slug, g))
    for slug, g in games.items():
        g.setdefault("first_seen", (old or {}).get("games", {}).get(slug, {}).get("first_seen", now))
    OUT.mkdir(exist_ok=True)
    STATE.write_text(json.dumps({"checked": now, "games": games}, indent=2))

    if "--json" in sys.argv:
        print(json.dumps({"checked": now, "first_run": old is None,
                          "changes": [{"type": t, "slug": s, **g} for t, s, g in changes],
                          "games": games}, indent=2))
        return
    if old is None:
        print(f"FIRST RUN ({now}): saved {len(games)} games as the baseline.")
    elif changes:
        print(f"CHANGE ({now}):")
        for t, s, g in changes:
            print(f"  {t}: {g['name']}  {g['url']}  status={g['status']}")
    else:
        print(f"NO CHANGE ({now})")
    for s, g in sorted(games.items()):
        print(f"  - {g['name']:<20} {g['status']:<12} first seen {g['first_seen']}")


if __name__ == "__main__":
    main()
