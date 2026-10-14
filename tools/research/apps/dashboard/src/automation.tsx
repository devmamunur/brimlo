import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bot, CalendarSync, Check, CircleCheck, CircleDashed, CircleX, DatabaseBackup, Eye, EyeOff, HeartPulse, LoaderCircle, Play, RefreshCw, Trash2, Zap } from "lucide-react";
import { api, ago, post, runTool } from "./api";
import { Badge, Btn, Card, cx, Empty, ErrorBox, Field, Input, Loading, useToast, useToolToast } from "./ui";

export const useAutomation = () =>
  useQuery({
    queryKey: ["automation"],
    queryFn: () => api<any>("/api/automation"),
    staleTime: 15_000,
    // poll fast while an update is running (also one started by the automatic schedule), slowly otherwise
    refetchInterval: (q) => (q.state.data?.runs?.[0]?.status === "running" ? 4000 : 60_000),
  });

const sameLocalDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/**
 * Top-bar button: shows if today's data is fresh, and updates everything with one click.
 * Asks for a second click before spending YouTube units (not in demo mode).
 */
export function UpdateDataButton() {
  const qc = useQueryClient();
  const toast = useToolToast();
  const plainToast = useToast();
  const { data: a } = useAutomation();
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings"), staleTime: 15_000 });
  const [armed, setArmed] = useState(false);
  const last = a?.runs?.[0];
  const running = last?.status === "running" && Date.now() - Date.parse(last.started_at) < 45 * 60_000;
  const updatedToday = Boolean(last && (last.status === "ok" || last.status === "partial") && sameLocalDay(last.started_at));
  const units = a?.plan?.estimated_units ?? 0;
  const free = s?.mode === "demo";
  const run = useMutation({
    mutationFn: () => runTool("daily_update", { force: updatedToday }),
    onSuccess: (env) => { toast("Data updated", env); invalidateAll(qc); },
    onError: (e) => {
      plainToast({ title: "Update failed", body: e instanceof Error ? e.message : String(e), tone: "bad" });
      qc.invalidateQueries({ queryKey: ["automation"] });
    },
  });
  const busy = running || run.isPending;
  const click = () => {
    if (busy) return;
    if (armed || free) {
      setArmed(false);
      run.mutate();
    } else {
      setArmed(true);
      setTimeout(() => setArmed(false), 6000);
    }
  };
  const label = busy ? "Updating…" : armed ? `${updatedToday ? "Run again" : "Update"} · ~${units} units` : updatedToday ? `Updated ${ago(last.started_at)}` : "Update data";
  const Icon = busy ? LoaderCircle : armed ? Zap : updatedToday ? CircleCheck : RefreshCw;
  return (
    <button
      onClick={click}
      disabled={busy}
      title={busy ? "Updating your channel, competitors, watched games and keywords (1–3 minutes)" : updatedToday ? `Data was updated today. Click to run again (~${units} units).` : `Update your channel, competitors, watched games and keywords now (~${units} units)`}
      className={cx(
        "flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium ring-1 ring-inset transition disabled:cursor-wait",
        armed ? "bg-bad/10 text-bad ring-bad/40" : busy ? "bg-white/[0.04] text-ink2 ring-white/10" : updatedToday ? "bg-teal/10 text-teal ring-teal/30 hover:bg-teal/15" : "bg-gradient-to-r from-gold to-gold2 text-bg ring-transparent shadow-lg shadow-gold2/20 hover:brightness-110",
      )}
    >
      <Icon className={cx("size-4", busy && "animate-spin")} aria-hidden />
      <span className={cx(!armed && "hidden sm:inline")}>{label}</span>
    </button>
  );
}

const statusTone = (s: string) => (s === "ok" ? "teal" : s === "partial" || s === "running" ? "gold" : "bad") as "teal" | "gold" | "bad";
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  ["automation", "overview", "settings", "competitors", "outliers", "keywords"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/** Watch / unwatch button for a keyword or a Steam game. */
export function WatchButton({ kind, value, label }: { kind: "keyword" | "game"; value: string; label?: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useAutomation();
  const watched = (data?.watchlist ?? []).some((w: any) => w.kind === kind && w.value.toLowerCase() === value.toLowerCase());
  const m = useMutation({
    mutationFn: () => runTool(watched ? "watch_remove" : "watch_add", { kind, value, ...(label && !watched ? { label } : {}) }),
    onSuccess: (env) => { toast({ title: watched ? "Stopped watching" : "Watching", body: env.summary, tone: "ok" }); qc.invalidateQueries({ queryKey: ["automation"] }); },
  });
  return (
    <Btn variant={watched ? "ghost" : "secondary"} icon={watched ? EyeOff : Eye} loading={m.isPending} onClick={() => m.mutate()} title={kind === "keyword" ? "Refreshed weekly by the daily update (~102 units)" : "Refreshed daily by the daily update (free)"}>
      {watched ? "Watching" : "Watch"}
    </Btn>
  );
}

function RunNow({ size = "md" }: { size?: "sm" | "md" }) {
  const qc = useQueryClient();
  const toast = useToolToast();
  const run = useMutation({ mutationFn: () => runTool("daily_update", { force: true }), onSuccess: (env) => { toast("Daily update finished", env); invalidateAll(qc); } });
  return (
    <>
      <Btn size={size} icon={Play} loading={run.isPending} disabled={run.isPending} onClick={() => run.mutate()}>{run.isPending ? "Running… (1–3 min)" : "Run now"}</Btn>
      {run.error && <div className="mt-2 w-full"><ErrorBox error={run.error} /></div>}
    </>
  );
}

function RunReport({ run }: { run: any }) {
  if (!run?.report) return null;
  return (
    <div className="space-y-3">
      {run.report.highlights?.length > 0 && (
        <ul className="space-y-1.5 rounded-xl bg-gold/[0.06] p-3.5 text-sm text-ink ring-1 ring-inset ring-gold/20">
          {run.report.highlights.map((h: string) => <li key={h}>★ {h}</li>)}
        </ul>
      )}
      <ul className="divide-y divide-white/[0.05] rounded-xl ring-1 ring-inset ring-white/[0.07]">
        {run.report.steps.map((s: any) => (
          <li key={s.step} className="flex gap-3 px-3.5 py-2.5 text-sm">
            {s.status === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-label="ok" /> : s.status === "failed" ? <CircleX className="mt-0.5 size-4 shrink-0 text-bad" aria-label="failed" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-label="skipped" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap justify-between gap-2"><span className="font-medium text-ink">{s.step}</span>{s.units > 0 && <span className="tabular-nums text-muted">{s.units} units</span>}</div>
              <div className="line-clamp-2 text-ink2">{s.summary}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Overview card. */
export function DailyCard() {
  const { data: a, error } = useAutomation();
  const last = a?.runs?.[0];
  return (
    <Card title="Daily update" subtitle={a ? (a.auto_daily ? `By itself once a day when the dashboard is open (after ${hourLabel(a.daily_hour)}) · max ${a.budget_units} units` : "Manual: press Update data in the top bar") : undefined} icon={CalendarSync} right={<RunNow size="sm" />}>
      {error ? <ErrorBox error={error} /> : !a ? <Loading rows={2} /> : !last ? (
        <Empty icon={Bot}>Never ran yet. It runs by itself each day while the dashboard is open, or press <b className="text-ink">Run now</b>. Next plan: about {a.plan.estimated_units} units.</Empty>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={statusTone(last.status)} dot>{last.status}</Badge>
            <span className="text-ink2">{ago(last.started_at)} · {last.units} units · {last.trigger}</span>
          </div>
          <RunReport run={last} />
        </div>
      )}
    </Card>
  );
}

/** Settings cards. */
export function AutomationSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: a, error } = useAutomation();
  const save = useMutation({ mutationFn: (b: any) => post("/api/automation", b, "PATCH"), onSuccess: () => qc.invalidateQueries({ queryKey: ["automation"] }) });
  const unwatch = useMutation({ mutationFn: (w: any) => runTool("watch_remove", { kind: w.kind, value: w.value }), onSuccess: () => qc.invalidateQueries({ queryKey: ["automation"] }) });
  const health = useMutation({ mutationFn: () => runTool("health_check", {}), onSuccess: (env) => { toast({ title: "Source health", body: env.summary, tone: (env.data as any).failed ? "bad" : "ok" }); qc.invalidateQueries({ queryKey: ["automation"] }); } });
  const backup = useMutation({ mutationFn: () => runTool("backup_now", {}), onSuccess: (env) => { toast({ title: "Backup saved", body: env.summary, tone: "ok" }); qc.invalidateQueries({ queryKey: ["automation"] }); } });
  if (error) return <ErrorBox error={error} />;
  if (!a) return <Loading rows={3} />;
  const checks: any[] = health.data?.data.checks ?? [];
  return (
    <>
      <Card title="Automation" subtitle="The daily update keeps every trend chart filling by itself" icon={CalendarSync} className="lg:col-span-2" right={<RunNow size="sm" />}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.07]">
              <span><span className="block font-medium text-ink">Update by itself once a day</span><span className="text-sm text-muted">The first time you open the dashboard each day (after the time below). Off = only when you press <b className="text-ink">Update data</b>.</span></span>
              <button role="switch" aria-checked={a.auto_daily} onClick={() => save.mutate({ auto_daily: !a.auto_daily })} className={cx("relative h-7 w-12 shrink-0 rounded-full transition", a.auto_daily ? "bg-gold" : "bg-white/15")}>
                <span className={cx("absolute top-1 size-5 rounded-full bg-white shadow transition-all", a.auto_daily ? "left-6" : "left-1")} />
              </button>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Time (this computer)">
                <select value={a.daily_hour} onChange={(e) => save.mutate({ daily_hour: Number(e.target.value) })} className="min-h-11 w-full rounded-xl border border-white/10 bg-bg/60 px-3 text-ink">
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
              </Field>
              <Field label="Max units per day"><Input type="number" min={10} max={3000} step={10} defaultValue={a.budget_units} onBlur={(e) => Number(e.target.value) !== a.budget_units && save.mutate({ budget_units: Number(e.target.value) })} /></Field>
            </div>
            {save.error && <ErrorBox error={save.error} />}
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Next run · about {a.plan.estimated_units} units</div>
              <ul className="space-y-1.5 text-sm">
                {a.plan.steps.map((s: any) => <li key={s.step} className="flex justify-between gap-3"><span className="text-ink2"><b className="font-medium text-ink">{s.step}</b> — {s.note}</span><span className="shrink-0 tabular-nums text-muted">{s.units ? `~${s.units}` : "free"}</span></li>)}
              </ul>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Recent runs</div>
            {!a.runs.length ? <Empty>No runs yet.</Empty> : (
              <ul className="space-y-2">
                {a.runs.slice(0, 5).map((r: any, i: number) => (
                  <li key={r.id}>
                    <details open={i === 0} className="rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.07]">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3.5 py-2.5 text-sm"><Badge tone={statusTone(r.status)} dot>{r.status}</Badge><span className="text-ink2">{new Date(r.started_at).toLocaleString()} · {r.units} units · {r.trigger}</span></summary>
                      <div className="px-3 pb-3"><RunReport run={r} /></div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <Card title="Watchlist" subtitle="Press Watch on a keyword or a game to add it" icon={Eye}>
        {!a.watchlist.length ? <Empty icon={Eye}>Nothing watched yet. Use the <b className="text-ink">Watch</b> button on a keyword (Keywords page) or a game (Games page).</Empty> : (
          <ul className="divide-y divide-white/[0.05]">
            {a.watchlist.map((w: any) => (
              <li key={w.kind + w.value} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0"><Badge tone={w.kind === "game" ? "teal" : "gold"}>{w.kind}</Badge> <span className="ml-1 text-ink">{w.label ?? w.value}</span><span className="ml-2 text-xs text-muted">{w.kind === "game" ? "daily, free" : "weekly, ~102 units"}</span></span>
                <Btn size="sm" variant="ghost" icon={Trash2} aria-label={`Stop watching ${w.label ?? w.value}`} onClick={() => unwatch.mutate(w)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Source health" subtitle={a.health_last ? `Last check ${ago(a.health_last.at)}${a.health_last.failed.length ? ` · failing: ${a.health_last.failed.join(", ")}` : " · all OK"}` : "Never checked"} icon={HeartPulse} right={<Btn size="sm" icon={HeartPulse} loading={health.isPending} onClick={() => health.mutate()}>Check now</Btn>}>
        {health.error && <ErrorBox error={health.error} />}
        {!checks.length ? <p className="text-ink2">Tests every source (Steam, itch.io, YouTube, SteamSpy, yt-dlp…) and the page parsers. If Steam changes its pages, this is where you see it first. Uses 1 YouTube unit.</p> : (
          <ul className="divide-y divide-white/[0.05]">
            {checks.map((c) => (
              <li key={c.name} className="flex gap-3 py-2 text-sm">
                {c.ok === true ? <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-label="ok" /> : c.ok === false ? <CircleX className="mt-0.5 size-4 shrink-0 text-bad" aria-label="failed" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted" aria-label="skipped" />}
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="font-medium text-ink">{c.name}</span>{c.ms > 0 && <span className="tabular-nums text-muted">{c.ms} ms</span>}</div><div className={cx("text-ink2", c.ok === false && "text-bad")}>{c.detail}</div></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Backups" subtitle="Daily copy of the database · newest 10 kept" icon={DatabaseBackup} className="lg:col-span-2" right={<Btn size="sm" icon={DatabaseBackup} loading={backup.isPending} onClick={() => backup.mutate()}>Backup now</Btn>}>
        {!a.backups.length ? <Empty>No backups yet. The daily update makes one, or press Backup now.</Empty> : (
          <ul className="grid gap-2 sm:grid-cols-2">{a.backups.map((b: any) => <li key={b.file} className="flex justify-between gap-3 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-sm ring-1 ring-inset ring-white/[0.07]"><code className="truncate text-ink2">{b.file}</code><span className="shrink-0 tabular-nums text-muted">{(b.bytes / 1e6).toFixed(1)} MB</span></li>)}</ul>
        )}
        <p className="mt-3 text-sm text-muted">Restore: stop the dashboard and Claude Code, then copy a file from tools/research/data/backups over tools/research/data/brimlo.sqlite.</p>
      </Card>
    </>
  );
}
