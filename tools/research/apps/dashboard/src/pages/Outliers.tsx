import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Flame, Radar, SlidersHorizontal, Users } from "lucide-react";
import { api, compact, n, post, runTool } from "../api";
import { Badge, Btn, Card, CostButton, cx, DataTable, ErrorBox, Field, Input, Loading, PageTitle, Thumb, useToast, useToolToast, VideoLink, Warnings } from "../ui";

const DAYS = [7, 30, 90, 365];
const MULTS = [3, 5, 10];

export function Outliers() {
  const qc = useQueryClient();
  const toolToast = useToolToast();
  const toast = useToast();
  const [f, setF] = useState({ days: 90, min_multiplier: 5, max_subs: 50000, include_shorts: false });
  const [niche, setNiche] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const qs = new URLSearchParams({ days: String(f.days), min_multiplier: String(f.min_multiplier), max_subs: String(f.max_subs), include_shorts: String(f.include_shorts) });
  const { data, error } = useQuery({ queryKey: ["outliers", qs.toString()], queryFn: () => api<any[]>(`/api/outliers?${qs}`) });
  const scan = useMutation({
    mutationFn: (input: Record<string, unknown>) => runTool("outliers", input),
    onSuccess: (env) => {
      toolToast("Scan finished", env);
      qc.invalidateQueries({ queryKey: ["outliers"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  const save = useMutation({
    mutationFn: (o: any) => post("/api/ideas", { title: `Study: ${o.title}`, status: "idea", evidence: { source: "outlier", url: o.url, views: o.views, multiplier: o.multiplier, channel_subs: o.channel_subs, duration_min: o.duration_min } }),
    onSuccess: (_r, o) => {
      setSaved((s) => new Set(s).add(o.id));
      qc.invalidateQueries({ queryKey: ["ideas"] });
      toast({ title: "Saved to Ideas", body: o.title, tone: "ok" });
    },
  });
  const chip = (on: boolean) => cx("min-h-9 rounded-lg px-3 text-sm font-medium transition", on ? "bg-gold text-bg" : "text-ink2 hover:bg-white/[0.06]");
  return (
    <>
      <PageTitle title="Outliers" icon={Flame} sub="Videos that got far more views than their channel normally gets. Small channels first. The table shows everything stored; scan to add more." />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card title="Scan for new outliers" icon={Radar}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input icon={Radar} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Niche, e.g. incremental game" className="flex-1" aria-label="Niche" />
            <CostButton cost={102} loading={scan.isPending} disabled={scan.isPending || niche.trim().length < 2} onRun={() => scan.mutate({ query: niche.trim(), days: f.days, min_multiplier: f.min_multiplier })}>Scan niche</CostButton>
          </div>
          <div className="mt-3">
            <CostButton cost={35} icon={Users} variant="secondary" disabled={scan.isPending} onRun={() => scan.mutate({ days: f.days, min_multiplier: Math.min(f.min_multiplier, 3) })}>Scan my competitors</CostButton>
          </div>
          {scan.error && <div className="mt-3"><ErrorBox error={scan.error} /></div>}
          {scan.data && <div className="mt-3 space-y-2"><Warnings list={scan.data.warnings} /><p className="text-sm text-ink2">{scan.data.summary}</p></div>}
        </Card>
        <Card title="Filters" icon={SlidersHorizontal}>
          <div className="space-y-4">
            <Field label="Published in the last">
              <div className="inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10" role="group" aria-label="Days">
                {DAYS.map((d) => <button key={d} className={chip(f.days === d)} aria-pressed={f.days === d} onClick={() => setF({ ...f, days: d })}>{d === 365 ? "1 year" : `${d} days`}</button>)}
              </div>
            </Field>
            <Field label="At least × normal views">
              <div className="inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10" role="group" aria-label="Multiplier">
                {MULTS.map((m) => <button key={m} className={chip(f.min_multiplier === m)} aria-pressed={f.min_multiplier === m} onClick={() => setF({ ...f, min_multiplier: m })}>{m}×</button>)}
              </div>
            </Field>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Max subscribers (0 = any)"><Input type="number" min={0} step={5000} value={f.max_subs} onChange={(e) => setF({ ...f, max_subs: Number(e.target.value) })} className="w-40" /></Field>
              <label className="flex min-h-11 items-center gap-2.5 text-ink2"><input type="checkbox" checked={f.include_shorts} onChange={(e) => setF({ ...f, include_shorts: e.target.checked })} className="size-5 rounded accent-[var(--color-gold)]" /> Include Shorts</label>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Outlier videos" subtitle={data ? `${data.length} found` : undefined} icon={Flame} bodyClass="p-0 sm:p-5">
        {error && <ErrorBox error={error} />}
        {!data ? <Loading rows={5} /> : (
          <DataTable
            data={data}
            minW={900}
            empty="No outliers match. Lower the multiplier, widen the days, or scan a niche."
            initialSort={[{ id: "multiplier", desc: true }]}
            columns={[
              { header: "", id: "thumb", enableSorting: false, cell: (c) => <Thumb src={c.row.original.thumbnail} alt="" /> },
              { header: "Video", accessorKey: "title", enableSorting: false, cell: (c) => <div className="max-w-sm"><VideoLink id={c.row.original.id} title={c.getValue()} /><div className="mt-1 flex flex-wrap gap-1.5 text-sm text-muted">{c.row.original.channel} · {compact(c.row.original.channel_subs)} subs{c.row.original.young && <Badge tone="gold">young</Badge>}</div></div> },
              { header: "× normal", accessorKey: "multiplier", cell: (c) => <span className="text-lg font-bold text-gold">{c.getValue()}×</span> },
              { header: "Views", accessorKey: "views", cell: (c) => n(c.getValue()) },
              { header: "/ day", accessorKey: "views_per_day", cell: (c) => n(c.getValue()) },
              { header: "Min", accessorKey: "duration_min" },
              { header: "Baseline", accessorKey: "baseline_type", cell: (c) => <Badge tone={c.getValue() === "median_last_20" ? "teal" : "muted"}>{c.getValue() === "median_last_20" ? "median" : "rough avg"}</Badge> },
              { header: "", id: "save", enableSorting: false, cell: (c) => { const done = saved.has(c.row.original.id); return <Btn size="sm" variant={done ? "ghost" : "secondary"} icon={done ? BookmarkCheck : Bookmark} disabled={done || save.isPending} onClick={() => save.mutate(c.row.original)}>{done ? "Saved" : "Save"}</Btn>; } },
            ]}
          />
        )}
        <p className="mt-3 px-5 pb-4 text-sm text-muted sm:px-0 sm:pb-0">× normal = views ÷ the channel's baseline (estimate). “median” uses the last ~20 long-form uploads; “rough avg” uses total views ÷ video count. “young” = under 3 days old.</p>
      </Card>
    </>
  );
}
