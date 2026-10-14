import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, compact, n, post, runTool } from "../api";
import { Badge, Btn, Card, CostButton, DataTable, ErrorBox, Input, Loading, PageTitle, Thumb, VideoLink, Warnings } from "../ui";

export function Outliers() {
  const qc = useQueryClient();
  const [f, setF] = useState({ days: 90, min_multiplier: 5, max_subs: 50000, include_shorts: false });
  const [niche, setNiche] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const qs = new URLSearchParams({ days: String(f.days), min_multiplier: String(f.min_multiplier), max_subs: String(f.max_subs), include_shorts: String(f.include_shorts) });
  const { data, error } = useQuery({ queryKey: ["outliers", qs.toString()], queryFn: () => api<any[]>(`/api/outliers?${qs}`) });
  const scan = useMutation({
    mutationFn: (input: Record<string, unknown>) => runTool("outliers", input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["outliers"] }); qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["settings"] }); },
  });
  const save = useMutation({
    mutationFn: (o: any) => post("/api/ideas", { title: `Study: ${o.title}`, status: "idea", evidence: { source: "outlier", url: o.url, views: o.views, multiplier: o.multiplier, channel_subs: o.channel_subs, duration_min: o.duration_min } }),
    onSuccess: (_r, o) => { setSaved((s) => new Set(s).add(o.id)); qc.invalidateQueries({ queryKey: ["ideas"] }); },
  });
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  return (
    <>
      <PageTitle title="Outliers" sub="Videos that got far more views than their channel normally gets. Small channels first. The table shows everything stored in the database; scan to add more." />
      <Card title="Scan for new outliers" className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Niche, e.g. incremental game" className="min-w-64 flex-1" aria-label="Niche" />
          <CostButton cost={102} disabled={scan.isPending || niche.trim().length < 2} onRun={() => scan.mutate({ query: niche.trim(), days: f.days, min_multiplier: f.min_multiplier })}>Scan niche</CostButton>
          <CostButton cost={35} variant="ghost" disabled={scan.isPending} onRun={() => scan.mutate({ days: f.days, min_multiplier: Math.min(f.min_multiplier, 3) })}>Scan my competitors</CostButton>
        </div>
        {scan.isPending && <p className="mt-3 text-muted">Scanning…</p>}
        {scan.error && <div className="mt-3"><ErrorBox error={scan.error} /></div>}
        {scan.data && <div className="mt-3"><Warnings list={scan.data.warnings} /><p className="text-sm text-ink2">{scan.data.summary} Used {scan.data.quota_used} units{scan.data.cached ? " (cached)" : ""}.</p></div>}
      </Card>
      <Card title="Filters" className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-ink2">Published in last (days)<Input type="number" min={1} max={365} value={f.days} onChange={num("days")} className="mt-1 block w-32" /></label>
          <label className="text-sm text-ink2">Min × baseline<Input type="number" min={1} step={0.5} value={f.min_multiplier} onChange={num("min_multiplier")} className="mt-1 block w-32" /></label>
          <label className="text-sm text-ink2">Max subscribers (0 = any)<Input type="number" min={0} step={1000} value={f.max_subs} onChange={num("max_subs")} className="mt-1 block w-40" /></label>
          <label className="flex min-h-11 items-center gap-2 text-ink2"><input type="checkbox" checked={f.include_shorts} onChange={(e) => setF({ ...f, include_shorts: e.target.checked })} className="size-5 accent-[var(--color-gold)]" /> Include Shorts</label>
        </div>
      </Card>
      {error && <ErrorBox error={error} />}
      {!data ? <Loading /> : (
        <DataTable
          data={data}
          empty="No outliers match. Lower the multiplier, widen the days, or scan a niche."
          initialSort={[{ id: "multiplier", desc: true }]}
          columns={[
            { header: "", id: "thumb", enableSorting: false, cell: (c) => <Thumb src={c.row.original.thumbnail} alt="" /> },
            { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <div className="max-w-md"><VideoLink id={c.row.original.id} title={c.getValue()} />{c.row.original.young && <> <Badge tone="gold">young</Badge></>}</div> },
            { header: "Channel", accessorKey: "channel_subs", cell: (c) => <>{c.row.original.channel}<div className="text-sm text-muted">{compact(c.getValue())} subs</div></> },
            { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
            { header: "× baseline", accessorKey: "multiplier", cell: (c) => <b>{c.getValue()}×</b> },
            { header: "/day", accessorKey: "views_per_day", cell: (c) => n(c.getValue()) },
            { header: "Min", accessorKey: "duration_min" },
            { header: "Baseline", accessorKey: "baseline_type", cell: (c) => <span className="text-sm text-muted">{c.getValue() === "median_last_20" ? "median" : "avg (rough)"}</span> },
            { header: "", id: "save", enableSorting: false, cell: (c) => <Btn variant="ghost" disabled={saved.has(c.row.original.id) || save.isPending} onClick={() => save.mutate(c.row.original)}>{saved.has(c.row.original.id) ? "Saved ✓" : "Save as idea"}</Btn> },
          ]}
        />
      )}
      <p className="mt-3 text-sm text-muted">Multiplier = views ÷ channel baseline. It is an estimate: “median” uses the channel's last ~20 long-form uploads, “avg (rough)” uses total views ÷ video count. “young” = under 3 days old.</p>
    </>
  );
}
