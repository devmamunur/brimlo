import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, compact, n, runTool } from "../api";
import { Card, ChartTip, CostButton, DataTable, Empty, ErrorBox, Loading, PageTitle, Progress, Stat, VideoLink, Warnings } from "../ui";

export function Overview() {
  const qc = useQueryClient();
  const { data: o, error } = useQuery({ queryKey: ["overview"], queryFn: () => api<any>("/api/overview") });
  const refresh = useMutation({ mutationFn: () => runTool("own_channel", {}), onSuccess: () => { qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["settings"] }); } });
  if (error) return <ErrorBox error={error} />;
  if (!o) return <Loading />;
  const q = o.quota;
  const series = o.own_last_7_days.map((r: any) => ({ day: r.taken_at.slice(5), subscribers: r.subscribers }));
  return (
    <>
      <PageTitle title="Overview" sub="Where the channel is, how much research quota is left, and what is new." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="YPP progress" right={<CostButton cost={3} onRun={() => refresh.mutate()} disabled={refresh.isPending} variant="ghost">{refresh.isPending ? "Updating…" : "Update my channel"}</CostButton>}>
          <div className="space-y-5">
            <Progress label="Subscribers" value={o.ypp.subs.value} goal={o.ypp.subs.goal} />
            <Progress label="Watch hours (365 days)" value={o.ypp.watch_hours.value} goal={o.ypp.watch_hours.goal} unit="h" note={o.ypp.watch_hours.value === null ? "connect OAuth in Settings" : undefined} />
          </div>
          {refresh.error && <div className="mt-3"><ErrorBox error={refresh.error} /></div>}
          {refresh.data && <div className="mt-3"><Warnings list={refresh.data.warnings} /></div>}
          <p className="mt-4 text-sm text-muted">{o.ypp.note} Last update: {ago(o.own_latest?.taken_at)}.</p>
        </Card>

        <Card title="YouTube API quota today" right={<span className="text-sm text-muted">resets midnight Pacific</span>}>
          <Progress label="Units used" value={q.used} goal={q.limit} unit="units" note={`warn ${q.warn_at.toLocaleString("en-US")} · stop ${q.stop_at.toLocaleString("en-US")}`} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Left" value={compact(q.remaining)} />
            <Stat label="Searches left" value={q.searches_left} sub="100 units each" />
            <Stat label="Level" value={q.level} />
          </div>
        </Card>

        <Card title="Subscribers, last 7 snapshots">
          {series.length < 2 ? (
            <Empty>Needs 2 or more days of snapshots. Press “Update my channel” once a day (or run own_channel).</Empty>
          ) : (
            <div className="h-56" role="img" aria-label={`Subscribers over ${series.length} days`}>
              <ResponsiveContainer>
                <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--color-muted)" }} />
                  <Line type="monotone" dataKey="subscribers" name="Subscribers" stroke="var(--color-s1)" strokeWidth={2} dot={{ r: 4, stroke: "var(--color-panel)", strokeWidth: 2, fill: "var(--color-s1)" }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="In the database">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Videos" value={n(o.counts.videos)} />
            <Stat label="Channels" value={n(o.counts.channels)} />
            <Stat label="Keywords" value={n(o.counts.keywords)} />
            <Stat label="Competitors" value={n(o.counts.competitors)} />
            <Stat label="Ideas" value={n(o.counts.ideas)} />
          </div>
        </Card>
      </div>

      <Card title="New outliers in the last 30 days" className="mt-5" right={<a href="#/outliers">See all</a>}>
        <DataTable
          data={o.new_outliers}
          empty="No outliers stored yet. Refresh competitors or scan a niche on the Outliers page."
          initialSort={[{ id: "multiplier", desc: true }]}
          columns={[
            { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <VideoLink id={c.row.original.id} title={c.getValue()} /> },
            { header: "Channel", accessorKey: "channel", cell: (c) => <>{c.getValue()} <span className="text-muted">· {compact(c.row.original.channel_subs)} subs</span></> },
            { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
            { header: "× baseline", accessorKey: "multiplier", cell: (c) => `${c.getValue()}×` },
          ]}
        />
      </Card>

      <Card title="Recent research" className="mt-5">
        <DataTable
          data={o.recent_searches}
          empty="Nothing yet."
          columns={[
            { header: "Tool", accessorKey: "tool" },
            { header: "Input", accessorKey: "input", cell: (c) => <span className="text-ink2">{String(c.getValue()).slice(0, 70)}</span> },
            { header: "Units", accessorKey: "quota_used", cell: (c) => `${c.getValue()}${c.row.original.cached ? " (cached)" : ""}` },
            { header: "When", accessorKey: "created_at", cell: (c) => ago(c.getValue()) },
          ]}
        />
      </Card>
    </>
  );
}
