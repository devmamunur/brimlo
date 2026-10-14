import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Clock, Database, Flame, Gauge, LayoutDashboard, Lightbulb, RefreshCw, Search, Target, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, compact, n, runTool } from "../api";
import { DailyCard } from "../automation";
import { Badge, Card, ChartTip, CostButton, DataTable, Empty, ErrorBox, Loading, PageTitle, Progress, Ring, Stat, Thumb, useToolToast, VideoLink, Warnings } from "../ui";

export function Overview() {
  const qc = useQueryClient();
  const toast = useToolToast();
  const { data: o, error } = useQuery({ queryKey: ["overview"], queryFn: () => api<any>("/api/overview") });
  const refresh = useMutation({
    mutationFn: () => runTool("own_channel", {}),
    onSuccess: (env) => {
      toast("Channel updated", env);
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  if (error) return <ErrorBox error={error} />;
  if (!o) return <><PageTitle title="Overview" icon={LayoutDashboard} /><Loading rows={4} /></>;
  const q = o.quota;
  const latest = o.own_latest;
  const series = o.own_last_7_days.map((r: any) => ({ day: r.taken_at.slice(5), subscribers: r.subscribers }));
  const subs = o.ypp.subs.value;
  const hours = o.ypp.watch_hours.value;
  return (
    <>
      <PageTitle
        title="Overview"
        icon={LayoutDashboard}
        sub="Where Brimlo is, how much research quota is left today, and what is new in the niche."
        actions={<CostButton cost={3} icon={RefreshCw} variant="secondary" loading={refresh.isPending} disabled={refresh.isPending} onRun={() => refresh.mutate()}>Update my channel</CostButton>}
      />
      {refresh.error && <div className="mb-5"><ErrorBox error={refresh.error} /></div>}
      {refresh.data?.warnings.length ? <div className="mb-5"><Warnings list={refresh.data.warnings} /></div> : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Subscribers" icon={Users} value={subs === null ? "–" : n(subs)} sub={subs === null ? "press “Update my channel”" : `${Math.max(0, 1000 - subs).toLocaleString("en-US")} to 1,000`} />
        <Stat label="Watch hours (365 d)" icon={Clock} tone="teal" value={hours === null ? "–" : n(hours)} sub={hours === null ? "needs OAuth (Settings)" : `${Math.max(0, 8000 - hours).toLocaleString("en-US")} h to 8,000`} />
        <Stat label="Quota left today" icon={Gauge} tone={q.level === "ok" ? "teal" : "gold"} value={compact(q.remaining)} sub={`≈ ${q.searches_left} searches · resets midnight PT`} />
        <Stat label="Saved ideas" icon={Lightbulb} tone="muted" value={n(o.counts.ideas)} sub={<a href="#/ideas">Open ideas →</a>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <Card title="YPP progress" subtitle={`Last update ${ago(latest?.taken_at)}`} icon={Target}>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="flex gap-4">
              <Ring value={subs ?? 0} max={1000} label={subs === null ? "–" : `${Math.round(((subs ?? 0) / 1000) * 100)}%`} sub="subs" />
              <Ring value={hours ?? 0} max={8000} label={hours === null ? "–" : `${Math.round(((hours ?? 0) / 8000) * 100)}%`} sub="hours" />
            </div>
            <div className="w-full flex-1 space-y-5">
              <Progress label="Subscribers" value={subs} goal={1000} />
              <Progress label="Watch hours (365 days)" value={hours} goal={8000} unit="h" note={hours === null ? "connect OAuth in Settings" : undefined} />
            </div>
          </div>
        </Card>

        <Card title="Subscriber trend" subtitle="Daily snapshots" icon={TrendingUp}>
          {series.length < 2 ? (
            <Empty icon={Activity}>Needs 2 or more days of snapshots. Press <b className="text-ink">Update my channel</b> once a day.</Empty>
          ) : (
            <div className="h-52" role="img" aria-label={`Subscribers over ${series.length} days, now ${series[series.length - 1].subscribers}`}>
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-s1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-s1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--color-muted)", strokeDasharray: "3 3" }} />
                  <Area type="monotone" dataKey="subscribers" name="Subscribers" stroke="var(--color-s1)" strokeWidth={2} fill="url(#subsFill)" dot={{ r: 4, fill: "var(--color-s1)", stroke: "var(--color-panel)", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5"><DailyCard /></div>

      <Card className="mt-5" title="New outliers · last 30 days" subtitle="Videos ≥ 5× their channel's normal views" icon={Flame} right={<a href="#/outliers" className="text-sm font-medium no-underline hover:underline">See all →</a>}>
        <DataTable
          data={o.new_outliers}
          empty="No outliers stored yet. Refresh competitors or scan a niche on the Outliers page."
          initialSort={[{ id: "multiplier", desc: true }]}
          columns={[
            { header: "", id: "t", enableSorting: false, cell: (c) => <Thumb src={c.row.original.thumbnail} alt="" /> },
            { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <div className="max-w-md"><VideoLink id={c.row.original.id} title={c.getValue()} /><div className="mt-0.5 text-sm text-muted">{c.row.original.channel} · {compact(c.row.original.channel_subs)} subs</div></div> },
            { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
            { header: "× normal", accessorKey: "multiplier", cell: (c) => <Badge tone="gold">{c.getValue()}×</Badge> },
          ]}
        />
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Recent research" icon={Search}>
          {o.recent_searches.length === 0 ? <Empty>Nothing yet.</Empty> : (
            <ol className="relative space-y-4 border-l border-white/10 pl-5">
              {o.recent_searches.map((r: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-gold ring-4 ring-bg" aria-hidden />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink">{r.tool.replace(/_/g, " ")}</span>
                    <span className="text-sm text-muted">{ago(r.created_at)}</span>
                    <Badge tone={r.quota_used ? "gold" : "muted"}>{r.quota_used ? `${r.quota_used} units` : r.cached ? "cached" : "free"}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-ink2">{Object.values(JSON.parse(r.input ?? "{}")).filter((v) => typeof v === "string").join(" · ")}</div>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="In the database" icon={Database}>
          <dl className="grid grid-cols-2 gap-3">
            {[["Videos", o.counts.videos], ["Channels", o.counts.channels], ["Keywords", o.counts.keywords], ["Competitors", o.counts.competitors]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-inset ring-white/[0.06]">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{n(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
