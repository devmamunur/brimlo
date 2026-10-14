import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Clapperboard, Lightbulb, NotebookPen, Plus, Trash2 } from "lucide-react";
import { api, ago, post } from "../api";
import { Badge, Btn, Card, cx, Empty, ErrorBox, Input, Loading, PageTitle, useToast } from "../ui";

const COLS = [
  ["idea", "Ideas", Lightbulb, "from-gold/70"],
  ["planned", "Planned", NotebookPen, "from-teal/70"],
  ["recorded", "Recorded", Clapperboard, "from-ink2/50"],
] as const;
const NEXT: Record<string, string | undefined> = { idea: "planned", planned: "recorded" };
const PREV: Record<string, string | undefined> = { planned: "idea", recorded: "planned" };

export function Ideas() {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const { data, error } = useQuery({ queryKey: ["ideas"], queryFn: () => api<any[]>("/api/ideas") });
  const inv = () => { qc.invalidateQueries({ queryKey: ["ideas"] }); qc.invalidateQueries({ queryKey: ["overview"] }); };
  const add = useMutation({ mutationFn: () => post("/api/ideas", { title: title.trim(), game: game.trim() || null }), onSuccess: () => { toast({ title: "Idea added", body: title.trim(), tone: "ok" }); setTitle(""); setGame(""); inv(); } });
  const move = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => post(`/api/ideas/${id}`, { status }, "PATCH"), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => api(`/api/ideas/${id}`, { method: "DELETE" }), onSuccess: inv });
  return (
    <>
      <PageTitle title="Ideas" icon={Lightbulb} sub="Video ideas with their evidence. Claude saves ideas here too (idea_save). Rules: one game = one video, and check Mac/CrossOver first." />
      <Card className="mb-6">
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 3) add.mutate(); }}>
          <Input icon={Lightbulb} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Idea or video title" className="md:flex-[2]" aria-label="Idea" />
          <Input value={game} onChange={(e) => setGame(e.target.value)} placeholder="Game (optional)" className="md:flex-1" aria-label="Game" />
          <Btn variant="primary" type="submit" icon={Plus} disabled={title.trim().length < 3 || add.isPending}>Add idea</Btn>
        </form>
        {add.error && <div className="mt-3"><ErrorBox error={add.error} /></div>}
      </Card>
      {error && <ErrorBox error={error} />}
      {!data ? <Loading rows={3} /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLS.map(([status, name, Icon, bar]) => {
            const items = data.filter((i) => i.status === status);
            return (
              <section key={status} aria-label={name} className="animate-in flex flex-col rounded-2xl border border-white/[0.07] bg-panel/50">
                <div className={cx("h-1 rounded-t-2xl bg-gradient-to-r to-transparent", bar)} aria-hidden />
                <header className="flex items-center justify-between px-4 py-3.5">
                  <h2 className="flex items-center gap-2 font-semibold text-ink"><Icon className="size-4 text-muted" aria-hidden />{name}</h2>
                  <Badge>{items.length}</Badge>
                </header>
                <div className="flex-1 space-y-3 px-3 pb-3">
                  {items.length === 0 ? <Empty>Nothing here yet.</Empty> : items.map((i) => (
                    <article key={i.id} className="group rounded-xl bg-white/[0.035] p-3.5 ring-1 ring-inset ring-white/[0.07] transition hover:bg-white/[0.055] hover:ring-white/[0.14]">
                      <h3 className="font-medium leading-snug text-ink">{i.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {i.game && <Badge tone="teal">{i.game}</Badge>}
                        <span>{ago(i.updated_at)}</span>
                      </div>
                      {i.evidence && (
                        <details className="mt-2 text-sm text-ink2">
                          <summary className="cursor-pointer text-muted hover:text-ink">Evidence</summary>
                          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(i.evidence, null, 2)}</pre>
                        </details>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {PREV[status] && <Btn size="sm" variant="ghost" icon={ArrowLeft} onClick={() => move.mutate({ id: i.id, status: PREV[status]! })}>{PREV[status]}</Btn>}
                        {NEXT[status] && <Btn size="sm" icon={ArrowRight} onClick={() => move.mutate({ id: i.id, status: NEXT[status]! })}>{NEXT[status]}</Btn>}
                        <Btn size="sm" variant="ghost" icon={Trash2} className="ml-auto hover:text-bad" aria-label="Delete idea" onClick={() => confirm("Delete this idea?") && del.mutate(i.id)} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
