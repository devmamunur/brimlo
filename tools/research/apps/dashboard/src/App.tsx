import { useQuery } from "@tanstack/react-query";
import { Command, Flame, Gamepad2, LayoutDashboard, Lightbulb, Menu, Search, Settings as SettingsIcon, Users, WandSparkles, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, compact } from "./api";
import { Competitors } from "./pages/Competitors";
import { Games } from "./pages/Games";
import { Ideas } from "./pages/Ideas";
import { Keywords } from "./pages/Keywords";
import { Outliers } from "./pages/Outliers";
import { Overview } from "./pages/Overview";
import { Settings } from "./pages/Settings";
import { TitleLab } from "./pages/TitleLab";
import { VideoDetail } from "./pages/VideoDetail";
import { UpdateDataButton } from "./automation";
import { Badge, cx } from "./ui";

const NAV: [string, string, LucideIcon][] = [
  ["", "Overview", LayoutDashboard],
  ["keywords", "Keywords", Search],
  ["outliers", "Outliers", Flame],
  ["competitors", "Competitors", Users],
  ["games", "Games", Gamepad2],
  ["titles", "Title Lab", WandSparkles],
  ["ideas", "Ideas", Lightbulb],
  ["settings", "Settings", SettingsIcon],
];

/** "#/keywords/3?q=idle" → { parts: ["keywords","3"], q: URLSearchParams } */
function useHash() {
  const read = () => {
    const [path = "", query = ""] = location.hash.replace(/^#\/?/, "").split("?");
    return { parts: path.split("/"), q: new URLSearchParams(query) };
  };
  const [h, setH] = useState(read);
  useEffect(() => {
    const on = () => {
      setH(read());
      window.scrollTo({ top: 0 });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return h;
}

function Logo() {
  return (
    <a href="#/" className="flex items-center gap-3 no-underline">
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold2 shadow-lg shadow-gold2/25">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="#0b1023" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 18l5-6 4 3 7-9" /><path d="M15 6h5v5" /></svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-bold tracking-tight text-ink">Brimlo</span>
        <span className="block text-xs font-medium uppercase tracking-[0.18em] text-gold">Research</span>
      </span>
    </a>
  );
}

function QuotaPill({ q }: { q: any }) {
  const pct = Math.min(1, q.used / q.limit);
  const r = 9;
  const c = 2 * Math.PI * r;
  const color = q.level === "stop" ? "var(--color-bad)" : q.level === "warn" ? "var(--color-gold2)" : "var(--color-teal)";
  return (
    <a href="#/settings" className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-ink2 no-underline ring-1 ring-inset ring-white/10 hover:bg-white/[0.07]" title={`YouTube quota: ${q.used} of ${q.limit} units used today (${q.level})`}>
      <svg width="22" height="22" className="-rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="3" />
        <circle cx="11" cy="11" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      </svg>
      <span className="tabular-nums"><b className="text-ink">{compact(q.used)}</b> / {compact(q.limit)}</span>
      <span className="hidden text-muted sm:inline">units</span>
    </a>
  );
}

function Nav({ active, onPick }: { active: string; onPick?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Main">
      {NAV.map(([k, label, Icon]) => {
        const on = active === k;
        return (
          <a key={k} href={`#/${k}`} onClick={onPick} aria-current={on ? "page" : undefined} className={cx("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] no-underline transition", on ? "bg-gradient-to-r from-gold/15 to-transparent font-semibold text-ink" : "text-ink2 hover:bg-white/[0.04] hover:text-ink")}>
            {on && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-gold to-gold2" aria-hidden />}
            <Icon className={cx("size-[18px]", on ? "text-gold" : "text-muted group-hover:text-ink2")} aria-hidden />
            {label}
          </a>
        );
      })}
    </nav>
  );
}

export function App() {
  const { parts, q } = useHash();
  const [root = "", arg] = parts;
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings"), staleTime: 15_000, refetchInterval: 60_000 });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setDrawer(false);
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  const page =
    root === "keywords" ? <Keywords selected={arg ? Number(arg) : undefined} initialQuery={q.get("q") ?? ""} /> :
    root === "outliers" ? <Outliers /> :
    root === "competitors" ? <Competitors /> :
    root === "titles" ? <TitleLab /> :
    root === "games" ? <Games key={arg ?? "d"} appid={arg} /> :
    root === "video" && arg ? <VideoDetail id={arg} /> :
    root === "ideas" ? <Ideas /> :
    root === "settings" ? <Settings /> :
    <Overview />;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-bg/40 px-4 py-6 backdrop-blur lg:flex">
        <div className="px-2"><Logo /></div>
        <div className="mt-8 flex-1"><Nav active={root} /></div>
        <div className="space-y-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
          {s && <Badge tone={s.mode === "demo" ? "bad" : "teal"} dot>{s.mode === "demo" ? "Demo data" : "Live data"}</Badge>}
          <p className="text-xs leading-relaxed text-muted">“where the numbers only go up.”</p>
        </div>
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-label="Close menu" />
          <div className="animate-in absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-panel p-5">
            <div className="mb-6 flex items-center justify-between"><Logo /><button onClick={() => setDrawer(false)} className="rounded-lg p-2 text-ink2 hover:bg-white/5" aria-label="Close menu"><X className="size-5" /></button></div>
            <Nav active={root} onPick={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
            <button className="rounded-xl p-2 text-ink2 ring-1 ring-inset ring-white/10 hover:bg-white/5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="size-5" /></button>
            <form
              className="flex-1"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim().length < 2) return;
                location.hash = `#/keywords?q=${encodeURIComponent(search.trim())}`;
                setSearch("");
                searchRef.current?.blur();
              }}
            >
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Research a keyword or game…" aria-label="Quick keyword research" className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-14 text-ink placeholder:text-muted/80 transition focus:border-gold/50 focus:bg-bg focus:outline-none focus:ring-4 focus:ring-gold/10" />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-muted sm:flex"><Command className="size-3" />K</kbd>
              </div>
            </form>
            <UpdateDataButton />
            {s && <QuotaPill q={s.quota} />}
          </div>
        </div>
        <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-10">
          {s?.mode === "demo" && (
            <div className="mb-6 rounded-2xl bg-bad/10 p-4 text-ink2 ring-1 ring-inset ring-bad/30">
              <b className="text-bad">Demo mode.</b> Videos, channels and scores are fake. Add <code>YOUTUBE_API_KEY</code> to <code>tools/research/.env</code> and restart.
            </div>
          )}
          <div key={root + (arg ?? "")}>{page}</div>
        </main>
      </div>
    </div>
  );
}
