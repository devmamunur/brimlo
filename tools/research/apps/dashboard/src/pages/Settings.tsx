import { useQuery } from "@tanstack/react-query";
import { Download, KeyRound, Settings as SettingsIcon, ShieldCheck, Wrench } from "lucide-react";
import { api } from "../api";
import { Badge, Card, ErrorBox, Loading, PageTitle, Progress } from "../ui";

const TABLES = ["videos", "channels", "keywords", "competitors", "ideas", "searches", "quota"] as const;

export function Settings() {
  const { data: s, error } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings") });
  const { data: tools } = useQuery({ queryKey: ["tools"], queryFn: () => api<any[]>("/api/tools") });
  if (error) return <ErrorBox error={error} />;
  if (!s) return <Loading rows={4} />;
  const row = (k: string, v: React.ReactNode) => <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] py-3 last:border-0"><span className="text-ink2">{k}</span><span className="text-ink">{v}</span></div>;
  return (
    <>
      <PageTitle title="Settings" icon={SettingsIcon} sub="Read-only status. Keys live in tools/research/.env and are never shown here." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="YouTube Data API" icon={KeyRound}>
          {row("Mode", <Badge tone={s.mode === "live" ? "teal" : "bad"} dot>{s.mode === "live" ? "Live" : "Demo (fake data)"}</Badge>)}
          {row("API key", <Badge tone={s.youtube_api_key === "set" ? "teal" : "bad"} dot>{s.youtube_api_key}</Badge>)}
          {row("Database", <code className="text-sm text-ink2">{s.database}</code>)}
          <div className="mt-5"><Progress label="Quota today" value={s.quota.used} goal={s.quota.limit} unit="units" note={`warn ${s.quota.warn_at.toLocaleString("en-US")} · stop ${s.quota.stop_at.toLocaleString("en-US")}`} /></div>
          <div className="mt-4 grid gap-1.5 text-sm text-muted">
            {s.quota.by_endpoint.length ? s.quota.by_endpoint.map((e: any) => <div key={e.endpoint} className="flex justify-between tabular-nums"><span>{e.endpoint}</span><span>{e.units} units · {e.calls} calls</span></div>) : "No calls today."}
          </div>
        </Card>
        <Card title="Own channel (OAuth, optional)" icon={ShieldCheck}>
          {row("Channel", <code className="text-sm text-ink2">{s.oauth.own_channel_id}</code>)}
          {row("OAuth client in .env", <Badge tone={s.oauth.client_configured ? "teal" : "muted"} dot>{s.oauth.client_configured ? "set" : "not set"}</Badge>)}
          {row("Connected", <Badge tone={s.oauth.connected ? "teal" : "muted"} dot>{s.oauth.connected ? "yes" : "no"}</Badge>)}
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-ink2">
            <p>OAuth adds <b className="text-ink">watch hours</b> and per-video retention. Subscribers and views work without it.</p>
            <p>Connect in a terminal: <code className="rounded bg-white/[0.06] px-1.5 py-0.5">pnpm research:cli auth</code>, then pick the <b className="text-ink">Brimlo</b> channel. Steps: tools/research/README.md.</p>
            <p className="text-muted">Impressions and CTR are not available from any YouTube API. Read them in YouTube Studio.</p>
          </div>
        </Card>
        <Card title="Export data" icon={Download} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TABLES.map((t) => (
              <div key={t} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/[0.07]">
                <span className="font-medium capitalize text-ink">{t}</span>
                <span className="flex gap-1.5 text-sm">
                  <a className="rounded-lg px-2 py-1 no-underline hover:bg-white/[0.06]" href={`/api/export?table=${t}&format=csv`}>CSV</a>
                  <a className="rounded-lg px-2 py-1 no-underline hover:bg-white/[0.06]" href={`/api/export?table=${t}&format=json`}>JSON</a>
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Tools Claude can use" subtitle={`${tools?.length ?? "…"} brimlo_* MCP tools, also available in the CLI`} icon={Wrench} className="lg:col-span-2">
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">{tools?.map((t) => <div key={t.name} className="text-sm leading-relaxed"><code className="font-semibold text-gold">{t.name}</code> <span className="text-ink2">— {t.description.split(/(?<=\.)\s/)[0]}</span></div>)}</div>
        </Card>
      </div>
    </>
  );
}
