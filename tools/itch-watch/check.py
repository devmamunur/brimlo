#!/usr/bin/env python3
"""itch watch: find NEW and POPULAR incremental games on itch.io.

Why (27 Nov 2026): after mana.gs, itch.io is where viral free incremental
games start (Find The Clover → Ridiculously Random 89K; Every Last Grain was
on itch.io before Mana hosted it). The "new and popular" list is itch.io's own
signal: a new game that players already like.

What it does:
- reads itch.io's public RSS feeds games/new-and-popular/tag-<tag>.xml for
  incremental, idle and clicker (robots.txt allows /games; /search is not used)
- keeps games published in the last 14 days that are free or cost ≤ $5
- compares with the last run (out/known.json) and prints NEW games

Run:  python3 -I tools/itch-watch/check.py          (normal)
      python3 -I tools/itch-watch/check.py --json   (machine output)
Exit code 0 always; the first line says CHANGE, NO CHANGE or FIRST RUN.
"""
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path

TAGS = ["incremental", "idle", "clicker"]
MAX_AGE_DAYS = 14
MAX_PRICE = 5.0
OUT = Path(__file__).resolve().parent / "out"
STATE = OUT / "known.json"
UA = "Mozilla/5.0 (brimlo-itch-watch)"


def get(url: str) -> str:
    # curl, because python.org Python on this Mac has no SSL certificates
    r = subprocess.run(["curl", "-sfL", "--max-time", "25", "-A", UA, url], capture_output=True, check=True)
    return r.stdout.decode("utf-8", "replace")


def field(item: str, name: str) -> str:
    m = re.search(rf"<{name}>(.*?)</{name}>", item, re.S)
    if not m:
        return ""
    return unescape(re.sub(r"^<!\[CDATA\[|\]\]>$", "", m.group(1).strip())).strip()


def price_usd(text: str) -> float | None:
    m = re.search(r"([\d.]+)", text or "")
    return float(m.group(1)) if m else None


def scan() -> dict:
    now = datetime.now(timezone.utc)
    games = {}
    for tag in TAGS:
        try:
            xml = get(f"https://itch.io/games/new-and-popular/tag-{tag}.xml")
        except subprocess.CalledProcessError as e:
            print(f"WARNING: could not read tag {tag} (HTTP error, maybe rate limit): {e}", file=sys.stderr)
            continue
        for rank, item in enumerate(re.findall(r"<item>(.*?)</item>", xml, re.S), 1):
            url = field(item, "link")
            if not url:
                continue
            pub = field(item, "pubDate")
            try:
                published = parsedate_to_datetime(pub).astimezone(timezone.utc) if pub else None
            except (TypeError, ValueError):
                published = None
            if published is None or now - published > timedelta(days=MAX_AGE_DAYS):
                continue
            p = price_usd(field(item, "price"))
            if p is not None and p > MAX_PRICE:
                continue
            plat = re.search(r"<platforms>(.*?)</platforms>", item, re.S)
            platforms = re.findall(r"<(\w+)>yes</\1>", plat.group(1)) if plat else []
            g = games.setdefault(url, {
                "name": field(item, "plainTitle") or field(item, "title"),
                "url": url,
                "price": field(item, "price") or "?",
                "browser": "html" in platforms,
                "platforms": platforms,
                "published": published.strftime("%Y-%m-%d %H:%M UTC"),
                "age_days": round((now - published).total_seconds() / 86400, 1),
                "tags": [],
                "best_rank": rank,
                "about": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", field(item, "description")))[:200],
            })
            g["tags"].append(tag)
            g["best_rank"] = min(g["best_rank"], rank)
    return games


def main() -> None:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    games = scan()
    old = json.loads(STATE.read_text()) if STATE.exists() else None
    seen = set((old or {}).get("seen", []))
    new = [g for url, g in games.items() if url not in seen] if old is not None else []
    new.sort(key=lambda g: (g["best_rank"], g["age_days"]))
    OUT.mkdir(exist_ok=True)
    STATE.write_text(json.dumps({"checked": now, "seen": sorted(seen | set(games)), "games": games}, indent=2))

    if "--json" in sys.argv:
        print(json.dumps({"checked": now, "first_run": old is None, "new": new, "games": list(games.values())}, indent=2))
        return
    if old is None:
        print(f"FIRST RUN ({now}): saved {len(games)} new-and-popular games as the baseline.")
    elif new:
        print(f"CHANGE ({now}): {len(new)} new game(s) on itch.io new-and-popular (incremental / idle / clicker, ≤ {MAX_AGE_DAYS} days, ≤ ${MAX_PRICE:.0f}):")
        for g in new:
            print(f"  NEW: {g['name']}  {g['url']}  price={g['price']} browser={'yes' if g['browser'] else 'no'} age={g['age_days']} d rank={g['best_rank']} tags={','.join(g['tags'])}")
    else:
        print(f"NO CHANGE ({now})")
    for g in sorted(games.values(), key=lambda g: g["best_rank"]):
        print(f"  - {g['name'][:40]:<40} {g['price']:<6} {'browser' if g['browser'] else 'download':<8} {g['age_days']:>4} d  rank {g['best_rank']}")


if __name__ == "__main__":
    main()
