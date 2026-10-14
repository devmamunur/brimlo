import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Badge, Card, ErrorBox, Loading, PageTitle, Progress } from "../ui";

const TABLES = ["videos", "channels", "keywords", "competitors", "ideas", "searches", "quota"] as const;

export function Settings() {
  const { data: s, error } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings") });
  const { data: tools } = useQuery({ queryKey: ["tools"], queryFn: () => api<any[]>("/api/tools") });
  if (error) return <ErrorBox error={error} />;
  if (!s) return <Loading />;
  const row = (k: string, v: React.ReactNode) => <div className="flex flex-wrap justify-between gap-2 border-b border-line py-2.5 last:border-0"><span className="text-ink2">{k}</span><span className="text-ink">{v}</span></div>;
  return (
    <>
      <PageTitle title="Settings" sub="Read-only status. Keys live in tools/research/.env and are never shown here." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="YouTube Data API">
          {row("Mode", <Badge tone={s.mode === "live" ? "teal" : "bad"}>{s.mode === "live" ? "Live" : "Demo (fake data)"}</Badge>)}
          {row("API key", <Badge tone={s.youtube_api_key === "set" ? "teal" : "bad"}>{s.youtube_api_key}</Badge>)}
          {row("Database", <code className="text-sm">{s.database}</code>)}
          {s.mode === "demo" && <p className="mt-3 text-sm text-ink2">Add <code>YOUTUBE_API_KEY=…</code> to <code>tools/research/.env</code>, then restart the dashboard.</p>}
          <div className="mt-5"><Progress label="Quota today" value={s.quota.used} goal={s.quota.limit} unit="units" note={`stop at ${s.quota.stop_at.toLocaleString("en-US")}`} /></div>
          <div className="mt-4 text-sm text-muted">
            {s.quota.by_endpoint.length ? s.quota.by_endpoint.map((e: any) => <div key={e.endpoint}>{e.endpoint}: {e.units} units in {e.calls} calls</div>) : "No calls today."}
          </div>
        </Card>
        <Card title="Own channel (OAuth, optional)">
          {row("Channel", <code className="text-sm">{s.oauth.own_channel_id}</code>)}
          {row("OAuth client in .env", <Badge tone={s.oauth.client_configured ? "teal" : "muted"}>{s.oauth.client_configured ? "set" : "not set"}</Badge>)}
          {row("Connected", <Badge tone={s.oauth.connected ? "teal" : "muted"}>{s.oauth.connected ? "yes" : "no"}</Badge>)}
          <div className="mt-3 space-y-2 text-sm text-ink2">
            <p>OAuth adds <b>watch hours</b> and per-video retention. Subscribers and views work without it.</p>
            <p>To connect, run in a terminal: <code>pnpm research:cli auth</code>. Pick the <b>Brimlo</b> channel when Google asks. Setup steps are in tools/research/README.md.</p>
            <p>Impressions and CTR are not available from any YouTube API. Read them in YouTube Studio.</p>
          </div>
        </Card>
        <Card title="Export data" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TABLES.map((t) => (
              <div key={t} className="flex items-center justify-between rounded-xl border border-line p-3">
                <span className="capitalize text-ink">{t}</span>
                <span className="flex gap-3 text-sm"><a href={`/api/export?table=${t}&format=csv`}>CSV</a><a href={`/api/export?table=${t}&format=json`}>JSON</a></span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={`Tools Claude can use (${tools?.length ?? "…"})`} className="lg:col-span-2">
          <p className="mb-3 text-sm text-ink2">The same list is available as <code>brimlo_*</code> MCP tools in Claude Code and as CLI commands.</p>
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">{tools?.map((t) => <div key={t.name} className="text-sm"><code className="text-gold">{t.name}</code> <span className="text-ink2">{t.description.split(/(?<=\.)\s/)[0]}</span></div>)}</div>
        </Card>
      </div>
    </>
  );
}
