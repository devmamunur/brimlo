import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CircleCheck, Download, MessagesSquare, ExternalLink, KeyRound, LogIn, MonitorPlay, RefreshCw, RotateCcw, Save, Settings as SettingsIcon, ShieldCheck, Unlink, Wrench } from "lucide-react";
import { api, compact, post, runTool } from "../api";
import { Badge, Btn, Card, CostButton, ErrorBox, Field, Input, Loading, PageTitle, Progress, useToast, useToolToast, Warnings } from "../ui";

const TABLES = ["videos", "channels", "keywords", "competitors", "ideas", "searches", "quota"] as const;
const PROJECT = "brimlo"; // your Google Cloud project id
const STEPS: [string, string, string][] = [
  ["Enable YouTube Analytics API", "Same project as your API key.", `https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com?project=${PROJECT}`],
  ["Consent screen: add yourself as a Test user", "Google Auth Platform → Audience → Test users → add your Gmail.", `https://console.cloud.google.com/auth/audience?project=${PROJECT}`],
  ["Create an OAuth client → type “Desktop app”", "Credentials → Create credentials → OAuth client ID. Copy the Client ID and Client secret.", `https://console.cloud.google.com/apis/credentials?project=${PROJECT}`],
];

export function Settings() {
  const qc = useQueryClient();
  const toast = useToast();
  const toolToast = useToolToast();
  const { data: s, error } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings") });
  const { data: tools } = useQuery({ queryKey: ["tools"], queryFn: () => api<any[]>("/api/tools") });
  const [channel, setChannel] = useState("");
  const [cid, setCid] = useState("");
  const [secret, setSecret] = useState("");
  const [rid, setRid] = useState("");
  const [rsecret, setRsecret] = useState("");
  const refreshAll = () => ["settings", "overview"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // Result of the Google login (the API redirects back here with ?oauth=ok|error).
  useEffect(() => {
    const q = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const r = q.get("oauth");
    if (!r) return;
    if (r === "ok") toast({ title: "Google connected", body: q.get("channel") ? `${q.get("channel")} is now your channel.` : undefined, tone: "ok" });
    else toast({ title: "Google connection failed", body: q.get("msg") ?? undefined, tone: "bad" });
    history.replaceState(null, "", "#/settings");
    refreshAll();
  }, []);

  const setMine = useMutation({ mutationFn: () => runTool("own_channel_set", { channel: channel.trim() }), onSuccess: (env) => { toolToast(env.summary, env); setChannel(""); refreshAll(); } });
  const updateMine = useMutation({ mutationFn: () => runTool("own_channel", {}), onSuccess: (env) => { toolToast("Channel stats updated", env); refreshAll(); } });
  const saveClient = useMutation({ mutationFn: () => post("/api/oauth/client", { client_id: cid, client_secret: secret }), onSuccess: () => { toast({ title: "OAuth client saved", body: "Now press Connect with Google.", tone: "ok" }); setCid(""); setSecret(""); refreshAll(); } });
  const removeClient = useMutation({ mutationFn: () => api("/api/oauth/client", { method: "DELETE" }), onSuccess: refreshAll });
  const connect = useMutation({ mutationFn: () => post<{ url: string }>("/api/oauth/start", {}), onSuccess: ({ url }) => { location.href = url; } });
  const disconnect = useMutation({ mutationFn: () => post<any>("/api/oauth/disconnect", {}), onSuccess: (r) => { toast({ title: "Disconnected", body: r.revoked ? "Access was also revoked at Google." : "Tokens deleted here.", tone: "info" }); refreshAll(); } });

  const saveReddit = useMutation({ mutationFn: () => post("/api/reddit/client", { client_id: rid, client_secret: rsecret }), onSuccess: () => { toast({ title: "Reddit app saved", body: "Try reddit_search, or Games → Check a game.", tone: "ok" }); setRid(""); setRsecret(""); refreshAll(); } });
  const removeReddit = useMutation({ mutationFn: () => api("/api/reddit/client", { method: "DELETE" }), onSuccess: refreshAll });

  if (error) return <ErrorBox error={error} />;
  if (!s) return <Loading rows={4} />;
  const own = s.own_channel;
  const o = s.oauth;
  const row = (k: string, v: React.ReactNode) => <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] py-3 last:border-0"><span className="text-ink2">{k}</span><span className="text-ink">{v}</span></div>;
  const err = setMine.error ?? updateMine.error ?? saveClient.error ?? removeClient.error ?? connect.error ?? disconnect.error ?? saveReddit.error ?? removeReddit.error;

  return (
    <>
      <PageTitle title="Settings" icon={SettingsIcon} sub="Your channel, the Google connection, quota and exports. Secrets are saved on this computer only and are never shown again." />
      {err && <div className="mb-5"><ErrorBox error={err} /></div>}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------- my channel ---------- */}
        <Card title="My channel" subtitle="Used for YPP progress and your own stats" icon={MonitorPlay}>
          <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold2 text-xl font-bold text-bg" aria-hidden>{(own.title ?? "?").slice(0, 1)}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-semibold text-ink">{own.title ?? "Not loaded yet · press Update stats"}</div>
              <div className="truncate text-sm text-muted">{own.handle ?? own.id}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {own.subscribers !== null && <Badge>{compact(own.subscribers)} subs</Badge>}
                {own.videos !== null && <Badge>{own.videos} videos</Badge>}
                <Badge tone={own.source === "env" ? "gold" : "muted"}>{{ env: "from .env", chosen: "chosen by you", default: "default" }[own.source as string]}</Badge>
              </div>
            </div>
          </div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <Input icon={MonitorPlay} value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="@handle or channel link" className="flex-1" aria-label="Your channel" />
            <CostButton cost={1} icon={Save} variant="secondary" loading={setMine.isPending} disabled={setMine.isPending || channel.trim().length < 2} onRun={() => setMine.mutate()}>Set as my channel</CostButton>
          </form>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Connecting Google (right) sets this automatically to the channel you pick.</p>
            <CostButton cost={3} icon={RefreshCw} variant="secondary" loading={updateMine.isPending} disabled={updateMine.isPending} onRun={() => updateMine.mutate()}>Update stats</CostButton>
          </div>
          {own.source === "env" && <div className="mt-3"><Warnings list={["YOUTUBE_OWN_CHANNEL in .env overrides this choice. Remove it from .env to pick here."]} /></div>}
        </Card>

        {/* ---------- google connection ---------- */}
        <Card title="Google connection" subtitle="Optional · adds watch hours and retention" icon={ShieldCheck} right={o.connected ? <Badge tone="teal" dot>connected</Badge> : o.client_configured ? <Badge tone="gold" dot>ready to connect</Badge> : <Badge dot>not set up</Badge>}>
          {o.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-teal/[0.07] p-4 ring-1 ring-inset ring-teal/25">
                <CircleCheck className="size-6 shrink-0 text-teal" aria-hidden />
                <div><div className="font-semibold text-ink">Connected{o.connected_channel ? ` to ${o.connected_channel.title}` : ""}</div><div className="text-sm text-ink2">{o.connected_channel?.handle ?? "Read-only access to YouTube Analytics."}</div></div>
              </div>
              {o.mismatch && <Warnings list={[`Google is connected to ${o.connected_channel?.title}, but your channel is ${own.title ?? own.id}. Watch hours are skipped until they match. Reconnect and pick the right channel.`]} />}
              <div className="flex flex-wrap gap-2">
                <Btn icon={RotateCcw} loading={connect.isPending} onClick={() => connect.mutate()}>Reconnect</Btn>
                <Btn variant="danger" icon={Unlink} loading={disconnect.isPending} onClick={() => confirm("Disconnect Google? Watch hours will stop updating.") && disconnect.mutate()}>Disconnect</Btn>
              </div>
            </div>
          ) : o.client_configured ? (
            <div className="space-y-4">
              {row("OAuth client", <code className="text-sm text-ink2">{o.client_id_hint}</code>)}
              {row("Saved in", o.client_source === "env" ? ".env" : "this computer (data/oauth-client.json)")}
              <div className="rounded-2xl bg-white/[0.03] p-4 text-sm leading-relaxed text-ink2 ring-1 ring-inset ring-white/[0.06]">
                Google will ask you to pick an account and a channel. <b className="text-ink">Pick Brimlo</b>, not your personal channel. You may see “Google hasn’t verified this app”: that is normal for your own app in testing. Click <b className="text-ink">Continue</b>.
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="primary" icon={LogIn} loading={connect.isPending} onClick={() => connect.mutate()}>Connect with Google</Btn>
                {o.client_source === "dashboard" && <Btn variant="ghost" onClick={() => confirm("Remove the saved OAuth client?") && removeClient.mutate()}>Remove client</Btn>}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <ol className="space-y-3">
                {STEPS.map(([title, body, href], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm font-bold text-gold ring-1 ring-gold/25">{i + 1}</span>
                    <div>
                      <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium">{title}<ExternalLink className="size-3.5" aria-hidden /></a>
                      <p className="text-sm text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveClient.mutate(); }}>
                <Field label="Client ID"><Input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="123456-abc.apps.googleusercontent.com" autoComplete="off" spellCheck={false} /></Field>
                <Field label="Client secret"><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="GOCSPX-…" autoComplete="off" /></Field>
                <Btn variant="primary" type="submit" icon={KeyRound} loading={saveClient.isPending} disabled={!cid.trim() || !secret.trim() || saveClient.isPending}>Save client</Btn>
                <p className="text-xs text-muted">Saved only on this computer, in tools/research/data/oauth-client.json (not in git). Never paste it in a chat.</p>
              </form>
            </div>
          )}
          <p className="mt-4 text-sm text-muted">Impressions and CTR are not in any YouTube API. Read them in YouTube Studio.</p>
        </Card>

        {/* ---------- reddit ---------- */}
        <Card title="Reddit" subtitle="Optional · community posts and mood (official API only)" icon={MessagesSquare} right={s.reddit.configured ? <Badge tone="teal" dot>connected</Badge> : <Badge dot>not set up</Badge>} className="lg:col-span-2">
          {s.reddit.configured ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink2">Reddit app saved ({s.reddit.source === "env" ? ".env" : "this computer"}). Claude can use <code className="text-gold">reddit_search</code>; the Games page shows posts about each game.</p>
              {s.reddit.source === "dashboard" && <Btn variant="ghost" onClick={() => confirm("Remove the Reddit app?") && removeReddit.mutate()}>Remove</Btn>}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <ol className="space-y-3 text-sm text-ink2">
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm font-bold text-gold ring-1 ring-gold/25">1</span><div>Open <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noreferrer noopener">reddit.com/prefs/apps</a> → <b className="text-ink">create another app</b>.</div></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm font-bold text-gold ring-1 ring-gold/25">2</span><div>Type <b className="text-ink">script</b>. Redirect URI: <code>http://localhost:8080</code> (required by the form, not used).</div></li>
                <li className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm font-bold text-gold ring-1 ring-gold/25">3</span><div>Copy the short code under the app name (client id) and the <b className="text-ink">secret</b>.</div></li>
                <li className="text-muted">Free for personal, non-commercial use (about 100 requests/minute). Reddit may ask you to request API access first. Reddit does not allow scraping, so there is no workaround.</li>
              </ol>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveReddit.mutate(); }}>
                <Field label="Client id"><Input value={rid} onChange={(e) => setRid(e.target.value)} placeholder="e.g. a1B2c3D4e5F6g7" autoComplete="off" spellCheck={false} /></Field>
                <Field label="Secret"><Input type="password" value={rsecret} onChange={(e) => setRsecret(e.target.value)} autoComplete="off" /></Field>
                <Btn variant="primary" type="submit" icon={KeyRound} loading={saveReddit.isPending} disabled={!rid.trim() || !rsecret.trim()}>Save Reddit app</Btn>
              </form>
            </div>
          )}
        </Card>

        {/* ---------- data api ---------- */}
        <Card title="YouTube Data API" icon={KeyRound}>
          {row("Mode", <Badge tone={s.mode === "live" ? "teal" : "bad"} dot>{s.mode === "live" ? "Live" : "Demo (fake data)"}</Badge>)}
          {row("API key", <Badge tone={s.youtube_api_key === "set" ? "teal" : "bad"} dot>{s.youtube_api_key}</Badge>)}
          {row("Database", <code className="text-sm text-ink2">{s.database}</code>)}
          <div className="mt-5"><Progress label="Quota today" value={s.quota.used} goal={s.quota.limit} unit="units" note={`warn ${s.quota.warn_at.toLocaleString("en-US")} · stop ${s.quota.stop_at.toLocaleString("en-US")}`} /></div>
          <div className="mt-4 grid gap-1.5 text-sm text-muted">
            {s.quota.by_endpoint.length ? s.quota.by_endpoint.map((e: any) => <div key={e.endpoint} className="flex justify-between tabular-nums"><span>{e.endpoint}</span><span>{e.units} units · {e.calls} calls</span></div>) : "No calls today."}
          </div>
        </Card>

        <Card title="Export data" icon={Download}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TABLES.map((t) => (
              <div key={t} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 ring-1 ring-inset ring-white/[0.07]">
                <span className="font-medium capitalize text-ink">{t}</span>
                <span className="flex gap-1 text-sm">
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
