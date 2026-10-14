import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";
import { Badge } from "./ui";
import { Competitors } from "./pages/Competitors";
import { Ideas } from "./pages/Ideas";
import { Keywords } from "./pages/Keywords";
import { Outliers } from "./pages/Outliers";
import { Overview } from "./pages/Overview";
import { Settings } from "./pages/Settings";
import { TitleLab } from "./pages/TitleLab";
import { VideoDetail } from "./pages/VideoDetail";

const NAV = [
  ["", "Overview"],
  ["keywords", "Keywords"],
  ["outliers", "Outliers"],
  ["competitors", "Competitors"],
  ["titles", "Title Lab"],
  ["ideas", "Ideas"],
  ["settings", "Settings"],
] as const;

function useHash() {
  const [h, setH] = useState(() => location.hash.replace(/^#\/?/, ""));
  useEffect(() => {
    const on = () => setH(location.hash.replace(/^#\/?/, ""));
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return h;
}

export function App() {
  const hash = useHash();
  const [root, arg] = hash.split("/");
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings"), staleTime: 15_000 });
  const page =
    root === "keywords" ? <Keywords selected={arg ? Number(arg) : undefined} /> :
    root === "outliers" ? <Outliers /> :
    root === "competitors" ? <Competitors /> :
    root === "titles" ? <TitleLab /> :
    root === "video" && arg ? <VideoDetail id={arg} /> :
    root === "ideas" ? <Ideas /> :
    root === "settings" ? <Settings /> :
    <Overview />;
  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col md:flex-row">
      <aside className="shrink-0 border-b border-line p-4 md:w-60 md:border-b-0 md:border-r md:p-6">
        <a href="#/" className="mb-1 block bg-gradient-to-r from-gold to-gold2 bg-clip-text text-2xl font-extrabold text-transparent">Brimlo Research</a>
        <p className="mb-4 hidden text-sm text-muted md:block">where the numbers only go up.</p>
        <nav className="flex flex-wrap gap-1 md:flex-col" aria-label="Main">
          {NAV.map(([k, label]) => (
            <a key={k} href={`#/${k}`} aria-current={root === k ? "page" : undefined} className={`rounded-xl px-3 py-2 text-base no-underline ${root === k ? "bg-panel2 font-semibold text-gold" : "text-ink2 hover:bg-panel hover:text-ink"}`}>
              {label}
            </a>
          ))}
        </nav>
        {s && (
          <div className="mt-6 hidden space-y-2 text-sm md:block">
            <Badge tone={s.mode === "demo" ? "bad" : "teal"}>{s.mode === "demo" ? "DEMO mode (fake data)" : "Live data"}</Badge>
            <div className="text-muted">Quota {s.quota.used.toLocaleString("en-US")} / {s.quota.limit.toLocaleString("en-US")} ({s.quota.percent}%)</div>
          </div>
        )}
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {s?.mode === "demo" && <div className="mb-4 rounded-xl border border-bad/50 bg-bad/10 p-3 text-ink2">DEMO mode: videos, channels and scores are fake. Add YOUTUBE_API_KEY to tools/research/.env and restart.</div>}
        {page}
      </main>
    </div>
  );
}
