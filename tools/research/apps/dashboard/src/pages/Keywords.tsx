import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { History, ListVideo, Search, Sparkles } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, compact, n, runTool } from "../api";
import { WatchButton } from "../automation";
import { Badge, Card, ChartTip, CostButton, cx, DataTable, Empty, ErrorBox, Input, Loading, PageTitle, Ring, useToolToast, VideoLink, Warnings } from "../ui";

const label = (s: number) => (s < 34 ? "low" : s < 67 ? "medium" : "high");

export function Keywords({ selected, initialQuery = "" }: { selected?: number; initialQuery?: string }) {
  const qc = useQueryClient();
  const toast = useToolToast();
  const [q, setQ] = useState(initialQuery);
  const list = useQuery({ queryKey: ["keywords"], queryFn: () => api<any[]>("/api/keywords") });
  const run = useMutation({
    mutationFn: async () => {
      const env = await runTool("keyword_research", { query: q.trim(), limit: 20 });
      const all = await api<any[]>("/api/keywords");
      return { env, id: all.find((k) => k.query === q.trim().toLowerCase())?.id };
    },
    onSuccess: ({ env, id }) => {
      toast(`Researched “${q.trim()}”`, env);
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      if (id) location.hash = `#/keywords/${id}`;
    },
  });
  const ok = q.trim().length >= 2;
  return (
    <>
      <PageTitle title="Keywords" icon={Search} sub="Autocomplete is free. The video search costs about 102 units; repeats within 24 hours cost 0." />
      <Card className="mb-5">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
          <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. incremental game, idle mining, Rock Crusher" className="flex-1" aria-label="Keyword" autoFocus={Boolean(initialQuery)} />
          <CostButton cost={102} icon={Sparkles} loading={run.isPending} onRun={() => ok && run.mutate()} disabled={run.isPending || !ok}>Research keyword</CostButton>
        </form>
        {run.error && <div className="mt-3"><ErrorBox error={run.error} /></div>}
        {run.data?.env.warnings.length ? <div className="mt-3"><Warnings list={run.data.env.warnings} /></div> : null}
      </Card>
      <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        <Card title="Researched" icon={History} subtitle={`${list.data?.length ?? 0} keywords`} bodyClass="p-2">
          {!list.data ? <Loading /> : list.data.length === 0 ? <Empty>No keywords yet.</Empty> : (
            <ul className="space-y-1">
              {list.data.map((k) => (
                <li key={k.id}>
                  <a href={`#/keywords/${k.id}`} className={cx("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 no-underline transition", k.id === selected ? "bg-gold/10 ring-1 ring-inset ring-gold/25" : "hover:bg-white/[0.04]")}>
                    <span className="min-w-0">
                      <span className={cx("block truncate font-medium", k.id === selected ? "text-gold" : "text-ink")}>{k.query}</span>
                      <span className="text-xs text-muted">{ago(k.taken_at)}{k.snapshots > 1 ? ` · ${k.snapshots} snapshots` : ""}</span>
                    </span>
                    <span className="flex shrink-0 gap-1.5 text-xs tabular-nums">
                      <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-ink2" title="Competition">C {Math.round(k.competition)}</span>
                      <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-ink2" title="Opportunity">O {Math.round(k.opportunity)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {selected ? <Detail id={selected} /> : <Card><Empty icon={Search}>Pick a keyword on the left, or research a new one.</Empty></Card>}
      </div>
    </>
  );
}

function Detail({ id }: { id: number }) {
  const { data: d, error } = useQuery({ queryKey: ["keyword", id], queryFn: () => api<any>(`/api/keywords/${id}`) });
  if (error) return <ErrorBox error={error} />;
  if (!d) return <Loading rows={4} />;
  const last = d.history[d.history.length - 1];
  const hist = d.history.map((h: any) => ({ day: h.taken_at.slice(5, 10), competition: Math.round(h.competition), opportunity: Math.round(h.opportunity) }));
  const comp = Math.round(last.competition);
  const opp = Math.round(last.opportunity);
  return (
    <div className="space-y-5">
      <Card title={<>“{d.keyword.query}”</>} subtitle="Estimates from the top 50 search results, not real search volume" right={<div className="flex items-center gap-2">{d.source === "demo" ? <Badge tone="bad" dot>demo data</Badge> : <Badge tone="teal" dot>live</Badge>}<WatchButton kind="keyword" value={d.keyword.query} /></div>}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Competition", comp, "higher = harder", label(comp)],
            ["Opportunity", opp, "higher = better", label(opp)],
          ].map(([name, v, hint, word]) => (
            <div key={name as string} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
              <Ring value={v as number} max={100} size={96} stroke={9} label={v as number} sub="/100" />
              <div>
                <div className="text-lg font-semibold text-ink">{name}</div>
                <div className="text-sm text-muted">{hint}</div>
                <div className="mt-2"><Badge tone={(name === "Competition" ? word === "low" : word === "high") ? "teal" : word === "medium" ? "gold" : "bad"} dot>{word as string}</Badge></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="History" icon={History}>
        {hist.length < 2 ? (
          <Empty icon={History}>One snapshot so far. Research this keyword again on another day to see the trend.</Empty>
        ) : (
          <div className="h-60" role="img" aria-label="Competition and opportunity over time">
            <ResponsiveContainer>
              <LineChart data={hist} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--color-muted)", strokeDasharray: "3 3" }} />
                <Legend iconType="circle" formatter={(v) => <span style={{ color: "var(--color-ink2)" }}>{v}</span>} />
                <Line type="monotone" dataKey="competition" name="Competition" stroke="var(--color-s1)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-s1)", stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="opportunity" name="Opportunity" stroke="var(--color-s2)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-s2)", stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Top ranking videos" icon={ListVideo}>
        <DataTable
          data={d.top_videos}
          columns={[
            { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <div className="max-w-md"><VideoLink id={c.row.original.id} title={c.getValue()} /><div className="mt-0.5 text-sm text-muted">{c.row.original.channel} · {compact(c.row.original.channel_subs)} subs</div></div> },
            { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
            { header: "/ day", accessorKey: "views_per_day", cell: (c) => n(c.getValue()) },
            { header: "Min", accessorKey: "duration_min" },
          ]}
        />
      </Card>

      <Card title="Autocomplete suggestions" subtitle={`${d.suggestions.length} real YouTube searches`} icon={Sparkles}>
        <div className="flex flex-wrap gap-2">{d.suggestions.slice(0, 60).map((s: any) => <Badge key={s.text}>{s.text}</Badge>)}</div>
      </Card>
    </div>
  );
}
