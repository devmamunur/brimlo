import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { runTool } from "../api";
import { Badge, Btn, Card, ErrorBox, Input, PageTitle, Score, Warnings } from "../ui";

const SAMPLE = "The swarm incremental game where you EAT the whole city\nI made a fire so big it bullied the sun\nI Turned One Cookie Into a TRILLION";

export function TitleLab() {
  const [text, setText] = useState(SAMPLE);
  const [keyword, setKeyword] = useState("");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length >= 3).slice(0, 5);
  const score = useMutation({ mutationFn: () => runTool("score_title", { titles: lines, ...(keyword.trim() ? { keyword: keyword.trim() } : {}) }) });
  const results: any[] = score.data?.data.results ?? [];
  const best = score.data?.data.best;
  return (
    <>
      <PageTitle title="Title Lab" sub="Score up to 5 titles against playbook/titles.md. Free: no YouTube quota. A checklist, not a prediction of views." />
      <Card className="mb-5">
        <label className="block text-ink2" htmlFor="titles">One title per line (max 5)</label>
        <textarea id="titles" value={text} onChange={(e) => setText(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-line bg-bg p-3 text-ink" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Keyword it must contain (optional)" className="min-w-64 flex-1" aria-label="Keyword" />
          <span className="text-sm text-muted">{lines.length} title(s)</span>
          <Btn variant="gold" disabled={!lines.length || score.isPending} onClick={() => score.mutate()}>{score.isPending ? "Scoring…" : "Score titles"}</Btn>
        </div>
        {score.error && <div className="mt-3"><ErrorBox error={score.error} /></div>}
      </Card>
      {score.data && <Warnings list={score.data.warnings} />}
      <div className={`grid gap-4 ${results.length > 1 ? "lg:grid-cols-2 2xl:grid-cols-3" : ""}`}>
        {results.map((r) => (
          <Card key={r.title} title={<span className="text-base">{r.title}</span>} className={r.title === best && results.length > 1 ? "ring-2 ring-gold" : ""}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Score value={r.score} label={r.label} />
              {r.template && <Badge tone="teal">Template {r.template}</Badge>}
              {r.title === best && results.length > 1 && <Badge tone="gold">best</Badge>}
            </div>
            <div className="space-y-1.5">
              {r.parts.filter((p: any) => p.available).map((p: any) => (
                <div key={p.name} title={p.note}>
                  <div className="flex justify-between text-sm"><span className="text-ink2">{p.name}</span><span className="text-ink">{p.points}/{p.max}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-gradient-to-r from-gold to-gold2" style={{ width: `${(p.points / p.max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            {r.fixes.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold text-ink">Fix first</div>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-ink2">{r.fixes.map((f: string) => <li key={f}>{f}</li>)}</ol>
              </div>
            )}
            <details className="mt-3 text-sm text-ink2">
              <summary className="cursor-pointer text-ink">Why this score</summary>
              <ul className="mt-2 space-y-1">{r.parts.map((p: any) => <li key={p.name}><b className="text-ink">{p.name}</b>: {p.note}</li>)}</ul>
              {r.similar_known_titles.length > 0 && (
                <div className="mt-2">Closest stored titles: {r.similar_known_titles.map((s: any) => <div key={s.title} className="text-muted">“{s.title}” ({s.similarity})</div>)}</div>
              )}
            </details>
          </Card>
        ))}
      </div>
      {score.data && <p className="mt-4 text-sm text-muted">{score.data.data.how}</p>}
    </>
  );
}
