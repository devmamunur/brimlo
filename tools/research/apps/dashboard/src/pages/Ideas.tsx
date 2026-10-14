import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, post } from "../api";
import { Badge, Btn, Card, Empty, ErrorBox, Input, Loading, PageTitle } from "../ui";

const COLS = [["idea", "Ideas"], ["planned", "Planned"], ["recorded", "Recorded"]] as const;
const NEXT: Record<string, string | undefined> = { idea: "planned", planned: "recorded" };
const PREV: Record<string, string | undefined> = { planned: "idea", recorded: "planned" };

export function Ideas() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const { data, error } = useQuery({ queryKey: ["ideas"], queryFn: () => api<any[]>("/api/ideas") });
  const inv = () => qc.invalidateQueries({ queryKey: ["ideas"] });
  const add = useMutation({ mutationFn: () => post("/api/ideas", { title: title.trim(), game: game.trim() || null }), onSuccess: () => { setTitle(""); setGame(""); inv(); } });
  const move = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => post(`/api/ideas/${id}`, { status }, "PATCH"), onSuccess: inv });
  const del = useMutation({ mutationFn: (id: number) => api(`/api/ideas/${id}`, { method: "DELETE" }), onSuccess: inv });
  return (
    <>
      <PageTitle title="Ideas" sub="Video ideas with their evidence. Claude saves ideas here too (idea_save). Remember: one game = one video; check Mac/CrossOver first." />
      <Card className="mb-5">
        <form className="flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 3) add.mutate(); }}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Idea or video title" className="min-w-64 flex-[2]" aria-label="Idea" />
          <Input value={game} onChange={(e) => setGame(e.target.value)} placeholder="Game (optional)" className="min-w-40 flex-1" aria-label="Game" />
          <Btn variant="gold" type="submit" disabled={title.trim().length < 3 || add.isPending}>Add idea</Btn>
        </form>
        {add.error && <div className="mt-3"><ErrorBox error={add.error} /></div>}
      </Card>
      {error && <ErrorBox error={error} />}
      {!data ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLS.map(([status, name]) => {
            const items = data.filter((i) => i.status === status);
            return (
              <Card key={status} title={<>{name} <span className="text-muted">({items.length})</span></>}>
                {items.length === 0 ? <Empty>Empty</Empty> : (
                  <ul className="space-y-3">
                    {items.map((i) => (
                      <li key={i.id} className="rounded-xl border border-line bg-bg p-3">
                        <div className="font-medium text-ink">{i.title}</div>
                        {i.game && <div className="mt-0.5"><Badge tone="teal">{i.game}</Badge></div>}
                        {i.evidence && (
                          <details className="mt-2 text-sm text-ink2">
                            <summary className="cursor-pointer text-muted">Evidence</summary>
                            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(i.evidence, null, 2)}</pre>
                          </details>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {PREV[status] && <Btn variant="ghost" className="!min-h-9 !px-3 !py-1 text-sm" onClick={() => move.mutate({ id: i.id, status: PREV[status]! })}>← {PREV[status]}</Btn>}
                          {NEXT[status] && <Btn variant="ghost" className="!min-h-9 !px-3 !py-1 text-sm" onClick={() => move.mutate({ id: i.id, status: NEXT[status]! })}>{NEXT[status]} →</Btn>}
                          <Btn variant="danger" className="!min-h-9 !px-3 !py-1 text-sm" onClick={() => confirm("Delete this idea?") && del.mutate(i.id)}>Delete</Btn>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
