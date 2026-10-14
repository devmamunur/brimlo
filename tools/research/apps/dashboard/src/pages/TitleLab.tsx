import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, ListChecks, WandSparkles } from "lucide-react";
import { runTool } from "../api";
import { Badge, Btn, Card, cx, ErrorBox, Input, PageTitle, Ring, Warnings } from "../ui";

const SAMPLE = "The swarm incremental game where you EAT the whole city\nI made a fire so big it bullied the sun\nI Turned One Cookie Into a TRILLION";
const tone = (l: string) => (l === "strong" ? "teal" : l === "ok" ? "gold" : "bad") as "teal" | "gold" | "bad";

export function TitleLab() {
  const [text, setText] = useState(SAMPLE);
  const [keyword, setKeyword] = useState("");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length >= 3).slice(0, 5);
  const score = useMutation({ mutationFn: () => runTool("score_title", { titles: lines, ...(keyword.trim() ? { keyword: keyword.trim() } : {}) }) });
  const results: any[] = [...(score.data?.data.results ?? [])].sort((a, b) => b.score - a.score);
  const best = score.data?.data.best;
  return (
    <>
      <PageTitle title="Title Lab" icon={WandSparkles} sub="Score up to 5 titles against playbook/titles.md. Free: no YouTube quota. A checklist, not a prediction of views." />
      <Card className="mb-5">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted" htmlFor="titles">One title per line · max 5</label>
        <textarea id="titles" value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full rounded-xl border border-white/10 bg-bg/60 p-3.5 leading-relaxed text-ink transition focus:border-gold/50 focus:outline-none focus:ring-4 focus:ring-gold/10" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Keyword it must contain (optional, default “incremental”)" className="flex-1" aria-label="Keyword" />
          <span className="text-sm text-muted tabular-nums">{lines.length} / 5 titles</span>
          <Btn variant="primary" icon={WandSparkles} loading={score.isPending} disabled={!lines.length || score.isPending} onClick={() => score.mutate()}>Score titles</Btn>
        </div>
        {score.error && <div className="mt-3"><ErrorBox error={score.error} /></div>}
      </Card>
      {score.data?.warnings.length ? <div className="mb-5"><Warnings list={score.data.warnings} /></div> : null}
      <div className="space-y-4">
        {results.map((r, i) => {
          const isBest = r.title === best && results.length > 1;
          return (
            <Card key={r.title} className={cx(isBest && "ring-2 ring-gold/60")}>
              <div className="flex flex-col gap-5 md:flex-row">
                <div className="flex shrink-0 items-center gap-4 md:w-56 md:flex-col md:items-start">
                  <Ring value={r.score} max={100} size={104} stroke={9} label={r.score} sub="/100" />
                  <div className="flex flex-wrap gap-1.5">
                    {isBest && <Badge tone="gold"><Crown className="size-3.5" aria-hidden />best</Badge>}
                    <Badge tone={tone(r.label)} dot>{r.label}</Badge>
                    {r.template && <Badge tone="teal">Template {r.template}</Badge>}
                    <Badge>#{i + 1}</Badge>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold leading-snug text-ink">{r.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{r.title.length} characters</p>
                  <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {r.parts.filter((p: any) => p.available).map((p: any) => (
                      <div key={p.name} title={p.note}>
                        <div className="flex justify-between text-sm"><span className="capitalize text-ink2">{p.name.replace("-", " ")}</span><span className="tabular-nums text-ink">{p.points}/{p.max}</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-gold to-gold2" style={{ width: `${(p.points / p.max) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  {r.fixes.length > 0 && (
                    <div className="mt-5 rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><ListChecks className="size-4 text-gold" aria-hidden />Fix first</div>
                      <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink2">{r.fixes.map((f: string) => <li key={f}>{f}</li>)}</ol>
                    </div>
                  )}
                  <details className="mt-3 text-sm text-ink2">
                    <summary className="cursor-pointer text-muted hover:text-ink">Why this score</summary>
                    <ul className="mt-2 space-y-1">{r.parts.map((p: any) => <li key={p.name}><b className="text-ink">{p.name}</b>: {p.note}</li>)}</ul>
                    {r.similar_known_titles.length > 0 && <div className="mt-2">Closest stored titles: {r.similar_known_titles.map((s: any) => <div key={s.title} className="text-muted">“{s.title}” ({s.similarity})</div>)}</div>}
                  </details>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {score.data && <p className="mt-4 text-sm text-muted">{score.data.data.how}</p>}
    </>
  );
}
