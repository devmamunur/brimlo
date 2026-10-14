import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, compact, n, runTool } from "../api";
import { Btn, Card, ChartTip, CostButton, DataTable, Empty, ErrorBox, Input, Loading, PageTitle, VideoLink, Warnings } from "../ui";

export function Competitors() {
  const qc = useQueryClient();
  const [handle, setHandle] = useState("");
  const { data, error } = useQuery({ queryKey: ["competitors"], queryFn: () => api<any>("/api/competitors") });
  const done = () => { qc.invalidateQueries({ queryKey: ["competitors"] }); qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["settings"] }); };
  const add = useMutation({ mutationFn: () => runTool("competitors_add", { channel: handle.trim() }), onSuccess: () => { setHandle(""); done(); } });
  const seed = useMutation({ mutationFn: () => runTool("competitors_seed", {}), onSuccess: done });
  const refresh = useMutation({ mutationFn: () => runTool("competitors_refresh", {}), onSuccess: done });
  const remove = useMutation({ mutationFn: (c: string) => runTool("competitors_remove", { channel: c }), onSuccess: done });
  const list: any[] = data?.competitors ?? [];
  const bars = [...list].filter((c) => c.subscribers !== null).map((c) => ({ name: c.title, uploads: c.uploads_last_30_days })).sort((a, b) => b.uploads - a.uploads);
  const err = add.error ?? seed.error ?? refresh.error ?? remove.error;
  return (
    <>
      <PageTitle title="Competitors" sub="Channels you learn from. Refresh checks their new uploads and flags videos far above their normal views (about 3 units per channel)." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle or channel link" className="min-w-64 flex-1" aria-label="Channel" />
          <CostButton cost={1} disabled={add.isPending || handle.trim().length < 2} onRun={() => add.mutate()}>Add channel</CostButton>
          <CostButton cost={Math.max(3, list.length * 3)} variant="ghost" disabled={refresh.isPending || !list.length} onRun={() => refresh.mutate()}>{refresh.isPending ? "Refreshing…" : "Refresh all"}</CostButton>
          <CostButton cost={11} variant="ghost" disabled={seed.isPending} onRun={() => seed.mutate()}>Add from research/competitors.md</CostButton>
        </div>
        {err && <div className="mt-3"><ErrorBox error={err} /></div>}
        {seed.data && <p className="mt-3 text-sm text-ink2">{seed.data.summary}</p>}
      </Card>

      {error && <ErrorBox error={error} />}
      {!data ? <Loading /> : (
        <>
          <Card title="Tracked channels" className="mb-5">
            <DataTable
              data={list}
              empty="No competitors yet. Add one, or load them from research/competitors.md."
              initialSort={[{ id: "subscribers", desc: true }]}
              columns={[
                { header: "Channel", accessorKey: "title", cell: (c) => <span className="font-medium">{c.getValue()} <span className="text-muted">{c.row.original.handle}</span></span> },
                { header: "Subs", accessorKey: "subscribers", cell: (c) => compact(c.getValue()) },
                { header: "Uploads 30d", accessorKey: "uploads_last_30_days" },
                { header: "Best stored video", id: "best", enableSorting: false, cell: (c) => c.row.original.best_stored_video ? <div className="max-w-sm"><VideoLink id={c.row.original.best_stored_video.id} title={c.row.original.best_stored_video.title} /><div className="text-sm text-muted">{n(c.row.original.best_stored_video.views)} views</div></div> : "–" },
                { header: "Checked", accessorKey: "last_checked_at", cell: (c) => ago(c.getValue()) },
                { header: "", id: "rm", enableSorting: false, cell: (c) => <Btn variant="danger" disabled={remove.isPending} onClick={() => confirm(`Stop tracking ${c.row.original.title}?`) && remove.mutate(c.row.original.channel_id)}>Remove</Btn> },
              ]}
            />
          </Card>
          <Card title="Uploads in the last 30 days (from stored videos)" className="mb-5">
            {bars.length === 0 ? <Empty>Refresh competitors to load their uploads.</Empty> : (
              <div style={{ height: Math.max(180, bars.length * 34) }} role="img" aria-label="Uploads in the last 30 days per competitor">
                <ResponsiveContainer>
                  <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "var(--color-panel2)" }} />
                    <Bar dataKey="uploads" name="Uploads" fill="var(--color-s1)" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}

      {refresh.data && (
        <Card title="Refresh result">
          <Warnings list={refresh.data.warnings} />
          <p className="mb-3 text-ink2">{refresh.data.summary} Used {refresh.data.quota_used} units.</p>
          <div className="space-y-4">
            {refresh.data.data.report.map((r: any) => (
              <div key={r.channel} className="rounded-xl border border-line p-3">
                <div className="font-semibold">{r.channel} <span className="font-normal text-muted">· median {n(r.median_views)} views · {r.new_uploads_count} new · {r.outliers_count} outliers</span></div>
                {r.outliers_last_30_days.map((o: any) => <div key={o.id} className="mt-1 text-ink2">🔥 <VideoLink id={o.id} title={o.title} /> — {n(o.views)} views, {o.multiplier}×</div>)}
                {r.new_uploads_since_last_check.map((o: any) => <div key={o.id} className="mt-1 text-sm text-muted">new: {o.title} ({n(o.views)} views)</div>)}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
