import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, FileText, Flame, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, compact, n, runTool } from "../api";
import { Badge, Btn, Card, ChartTip, CostButton, DataTable, Empty, ErrorBox, Input, Loading, PageTitle, useToolToast, VideoLink, Warnings } from "../ui";

export function Competitors() {
  const qc = useQueryClient();
  const toast = useToolToast();
  const [handle, setHandle] = useState("");
  const { data, error } = useQuery({ queryKey: ["competitors"], queryFn: () => api<any>("/api/competitors") });
  const done = () => ["competitors", "overview", "settings", "outliers"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const add = useMutation({ mutationFn: () => runTool("competitors_add", { channel: handle.trim() }), onSuccess: (env) => { toast(env.summary, env); setHandle(""); done(); } });
  const seed = useMutation({ mutationFn: () => runTool("competitors_seed", {}), onSuccess: (env) => { toast(env.summary, env); done(); } });
  const refresh = useMutation({ mutationFn: () => runTool("competitors_refresh", {}), onSuccess: (env) => { toast(env.summary, env); done(); } });
  const remove = useMutation({ mutationFn: (c: string) => runTool("competitors_remove", { channel: c }), onSuccess: (env) => { toast(env.summary, env); done(); } });
  const list: any[] = data?.competitors ?? [];
  const bars = list.filter((c) => c.subscribers !== null).map((c) => ({ name: c.title, uploads: c.uploads_last_30_days })).sort((a, b) => b.uploads - a.uploads);
  const err = add.error ?? seed.error ?? refresh.error ?? remove.error;
  return (
    <>
      <PageTitle
        title="Competitors"
        icon={Users}
        sub="Channels you learn from. Refresh checks their new uploads and flags videos far above their normal views (about 3 units per channel)."
        actions={<CostButton cost={Math.max(3, list.length * 3)} icon={RefreshCw} loading={refresh.isPending} disabled={refresh.isPending || !list.length} onRun={() => refresh.mutate()}>Refresh all</CostButton>}
      />
      <Card className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input icon={Plus} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle or channel link" className="flex-1" aria-label="Channel" />
          <CostButton cost={1} icon={Plus} variant="secondary" loading={add.isPending} disabled={add.isPending || handle.trim().length < 2} onRun={() => add.mutate()}>Add channel</CostButton>
          <CostButton cost={11} icon={FileText} variant="secondary" loading={seed.isPending} disabled={seed.isPending} onRun={() => seed.mutate()}>Import competitors.md</CostButton>
        </div>
        {err && <div className="mt-3"><ErrorBox error={err} /></div>}
      </Card>

      {error && <ErrorBox error={error} />}
      {!data ? <Loading rows={5} /> : (
        <div className="grid gap-5 2xl:grid-cols-[1.6fr_1fr]">
          <Card title="Tracked channels" subtitle={`${list.length} channels`} icon={Users}>
            <DataTable
              data={list}
              minW={760}
              empty="No competitors yet. Add one, or import them from research/competitors.md."
              initialSort={[{ id: "subscribers", desc: true }]}
              columns={[
                { header: "Channel", accessorKey: "title", cell: (c) => (
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-panel2 to-bg text-sm font-bold text-gold ring-1 ring-white/10" aria-hidden>{String(c.getValue()).slice(0, 1)}</span>
                    <div><div className="font-medium">{c.getValue()}</div><div className="text-sm text-muted">{c.row.original.handle}</div></div>
                  </div>
                ) },
                { header: "Subs", accessorKey: "subscribers", cell: (c) => compact(c.getValue()) },
                { header: "30 d", accessorKey: "uploads_last_30_days" },
                { header: "Best stored video", id: "best", enableSorting: false, cell: (c) => c.row.original.best_stored_video ? <div className="max-w-xs"><VideoLink id={c.row.original.best_stored_video.id} title={c.row.original.best_stored_video.title} /><div className="text-sm text-muted">{n(c.row.original.best_stored_video.views)} views</div></div> : "–" },
                { header: "Checked", accessorKey: "last_checked_at", cell: (c) => <span className="text-sm text-ink2">{ago(c.getValue())}</span> },
                { header: "", id: "rm", enableSorting: false, cell: (c) => <Btn size="sm" variant="ghost" icon={Trash2} aria-label={`Remove ${c.row.original.title}`} disabled={remove.isPending} onClick={() => confirm(`Stop tracking ${c.row.original.title}?`) && remove.mutate(c.row.original.channel_id)} /> },
              ]}
            />
          </Card>
          <Card title="Uploads in the last 30 days" subtitle="From stored videos" icon={BarChart3}>
            {bars.length === 0 ? <Empty>Refresh competitors to load their uploads.</Empty> : (
              <div style={{ height: Math.max(200, bars.length * 32) }} role="img" aria-label="Uploads in the last 30 days per competitor">
                <ResponsiveContainer>
                  <BarChart data={bars} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgb(255 255 255 / 0.06)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--color-ink2)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
                    <Bar dataKey="uploads" name="Uploads" fill="var(--color-s1)" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}

      {refresh.data && (
        <Card className="mt-5" title="Refresh result" subtitle={refresh.data.summary} icon={Flame}>
          <Warnings list={refresh.data.warnings} />
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {refresh.data.data.report.map((r: any) => (
              <div key={r.channel} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-ink">{r.channel}</b>
                  <Badge>{r.new_uploads_count} new</Badge>
                  {r.outliers_count > 0 && <Badge tone="gold" dot>{r.outliers_count} outliers</Badge>}
                  <span className="text-sm text-muted">median {n(r.median_views)} views</span>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {r.outliers_last_30_days.map((o: any) => <li key={o.id} className="flex gap-2"><Flame className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /><span><VideoLink id={o.id} title={o.title} /> <span className="text-muted">· {n(o.views)} views · {o.multiplier}×</span></span></li>)}
                  {r.new_uploads_since_last_check.map((o: any) => <li key={o.id} className="pl-6 text-muted">new: {o.title} ({n(o.views)} views)</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
