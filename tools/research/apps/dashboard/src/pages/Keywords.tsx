import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ago, n, runTool } from "../api";
import { Badge, Card, ChartTip, CostButton, DataTable, Empty, ErrorBox, Input, Loading, PageTitle, Score, Stat, VideoLink, Warnings } from "../ui";

const label = (s: number) => (s < 34 ? "low" : s < 67 ? "medium" : "high");

export function Keywords({ selected }: { selected?: number }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = useQuery({ queryKey: ["keywords"], queryFn: () => api<any[]>("/api/keywords") });
  const run = useMutation({
    mutationFn: async () => {
      const env = await runTool("keyword_research", { query: q.trim(), limit: 20 });
      const all = await api<any[]>("/api/keywords");
      return { env, id: all.find((k) => k.query === q.trim().toLowerCase())?.id };
    },
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      if (id) location.hash = `#/keywords/${id}`;
    },
  });
  return (
    <>
      <PageTitle title="Keywords" sub="Autocomplete is free. The video search costs about 102 units; repeats within 24 hours cost 0." />
      <Card className="mb-5">
        <form className="flex flex-wrap items-center gap-3" onSubmit={(e) => e.preventDefault()}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. incremental game" className="min-w-64 flex-1" aria-label="Keyword" />
          <CostButton cost={102} onRun={() => q.trim().length >= 2 && run.mutate()} disabled={run.isPending || q.trim().length < 2}>{run.isPending ? "Researching…" : "Research keyword"}</CostButton>
        </form>
        {run.error && <div className="mt-3"><ErrorBox error={run.error} /></div>}
        {run.data && <div className="mt-3"><Warnings list={run.data.env.warnings} /><p className="text-sm text-ink2">{run.data.env.summary} Used {run.data.env.quota_used} units{run.data.env.cached ? " (cached)" : ""}.</p></div>}
      </Card>
      <div className="grid gap-5 xl:grid-cols-[26rem_1fr]">
        <Card title="Researched">
          {!list.data ? <Loading /> : (
            <DataTable
              data={list.data}
              empty="No keywords yet."
              minW={0}
              onRow={(r) => (location.hash = `#/keywords/${r.id}`)}
              initialSort={[{ id: "taken_at", desc: true }]}
              columns={[
                { header: "Keyword", accessorKey: "query", cell: (c) => <span className={c.row.original.id === selected ? "font-semibold text-gold" : ""}>{c.getValue()}</span> },
                { header: "Comp.", accessorKey: "competition", cell: (c) => Math.round(c.getValue()) },
                { header: "Opp.", accessorKey: "opportunity", cell: (c) => Math.round(c.getValue()) },
                { header: "When", accessorKey: "taken_at", cell: (c) => ago(c.getValue()) },
              ]}
            />
          )}
        </Card>
        {selected ? <Detail id={selected} /> : <Card><Empty>Pick a keyword on the left, or research a new one.</Empty></Card>}
      </div>
    </>
  );
}

function Detail({ id }: { id: number }) {
  const { data: d, error } = useQuery({ queryKey: ["keyword", id], queryFn: () => api<any>(`/api/keywords/${id}`) });
  if (error) return <ErrorBox error={error} />;
  if (!d) return <Loading />;
  const last = d.history[d.history.length - 1];
  const hist = d.history.map((h: any) => ({ day: h.taken_at.slice(5, 10), competition: Math.round(h.competition), opportunity: Math.round(h.opportunity) }));
  return (
    <div className="space-y-5">
      <Card title={<>“{d.keyword.query}” {d.source === "demo" && <Badge tone="bad">demo data</Badge>}</>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Competition (higher = harder)" value={<Score value={Math.round(last.competition)} label={label(last.competition)} />} />
          <Stat label="Opportunity (higher = better)" value={<Score value={Math.round(last.opportunity)} label={label(last.opportunity)} />} />
        </div>
        <p className="mt-3 text-sm text-muted">Estimates from the top 50 search results, not real search volume. The formulas are in the tool answer (keyword_research).</p>
      </Card>

      <Card title="History">
        {hist.length < 2 ? (
          <Empty>One snapshot so far. Research this keyword again later (refresh) to see the trend.</Empty>
        ) : (
          <div className="h-60" role="img" aria-label="Competition and opportunity over time">
            <ResponsiveContainer>
              <LineChart data={hist} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-line)" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--color-ink2)", fontSize: 13 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--color-muted)" }} />
                <Legend formatter={(v) => <span style={{ color: "var(--color-ink2)" }}>{v}</span>} />
                <Line type="monotone" dataKey="competition" name="Competition" stroke="var(--color-s1)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-s1)", stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="opportunity" name="Opportunity" stroke="var(--color-s2)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-s2)", stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Top videos">
        <DataTable
          data={d.top_videos}
          columns={[
            { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <VideoLink id={c.row.original.id} title={c.getValue()} /> },
            { header: "Channel", accessorKey: "channel", cell: (c) => <>{c.getValue()} <span className="text-muted">· {n(c.row.original.channel_subs)} subs</span></> },
            { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
            { header: "/day", accessorKey: "views_per_day", cell: (c) => n(c.getValue()) },
            { header: "Min", accessorKey: "duration_min" },
          ]}
        />
      </Card>

      <Card title={`Autocomplete suggestions (${d.suggestions.length})`}>
        <div className="flex flex-wrap gap-2">{d.suggestions.slice(0, 60).map((s: any) => <Badge key={s.text}>{s.text}</Badge>)}</div>
      </Card>
    </div>
  );
}
