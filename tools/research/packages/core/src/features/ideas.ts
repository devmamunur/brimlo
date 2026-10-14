import { z } from "zod";
import { getDb } from "../db/client.ts";
import type { Envelope } from "../result.ts";

export const IDEA_STATUSES = ["idea", "planned", "recorded"] as const;
const iso = () => new Date().toISOString();

export interface IdeaRow {
  id: number;
  title: string;
  game: string | null;
  status: string;
  evidence: unknown;
  created_at: string;
  updated_at: string;
}
const parse = (r: any): IdeaRow => ({ ...r, evidence: r.evidence ? JSON.parse(r.evidence) : null });

export const listIdeas = (status?: string): IdeaRow[] =>
  (status ? getDb().prepare("SELECT * FROM ideas WHERE status = ? ORDER BY updated_at DESC").all(status) : getDb().prepare("SELECT * FROM ideas ORDER BY updated_at DESC").all()).map(parse);

export function saveIdea(i: { title: string; game?: string | null; status?: string; evidence?: unknown }): IdeaRow {
  const now = iso();
  const r = getDb().prepare("INSERT INTO ideas (title, game, status, evidence, created_at, updated_at) VALUES (?,?,?,?,?,?)").run(i.title, i.game ?? null, i.status ?? "idea", i.evidence === undefined ? null : JSON.stringify(i.evidence), now, now);
  return parse(getDb().prepare("SELECT * FROM ideas WHERE id = ?").get(Number(r.lastInsertRowid)));
}

export function updateIdea(id: number, p: { title?: string; game?: string | null; status?: string; evidence?: unknown }): IdeaRow | undefined {
  const cur = getDb().prepare("SELECT * FROM ideas WHERE id = ?").get(id) as any;
  if (!cur) return undefined;
  getDb().prepare("UPDATE ideas SET title=?, game=?, status=?, evidence=?, updated_at=? WHERE id=?").run(p.title ?? cur.title, p.game === undefined ? cur.game : p.game, p.status ?? cur.status, p.evidence === undefined ? cur.evidence : JSON.stringify(p.evidence), iso(), id);
  return parse(getDb().prepare("SELECT * FROM ideas WHERE id = ?").get(id));
}

export const deleteIdea = (id: number) => Number(getDb().prepare("DELETE FROM ideas WHERE id = ?").run(id).changes) > 0;

const env = (data: unknown, summary: string): Envelope => ({ data, summary, source: "local", fetched_at: iso(), cached: false, quota_used: 0, warnings: [] });

export const ideasListInput = z.object({ status: z.enum(IDEA_STATUSES).optional() });
export const ideasList = async (input: z.infer<typeof ideasListInput>) => {
  const list = listIdeas(ideasListInput.parse(input).status);
  return env({ ideas: list }, `${list.length} ideas.`);
};

export const ideaSaveInput = z.object({
  title: z.string().min(3).describe("Idea or video title/topic"),
  game: z.string().optional(),
  status: z.enum(IDEA_STATUSES).default("idea"),
  evidence: z.any().optional().describe("Free JSON: numbers, links, reasons"),
});
export const ideaSave = async (input: z.infer<typeof ideaSaveInput>) => {
  const r = saveIdea(ideaSaveInput.parse(input));
  return env({ idea: r }, `Saved idea #${r.id}: ${r.title}`);
};

export const ideaUpdateInput = z.object({
  id: z.number().int(),
  title: z.string().optional(),
  game: z.string().nullable().optional(),
  status: z.enum(IDEA_STATUSES).optional(),
  evidence: z.any().optional(),
  delete: z.boolean().default(false),
});
export const ideaUpdate = async (input: z.infer<typeof ideaUpdateInput>) => {
  const i = ideaUpdateInput.parse(input);
  if (i.delete) return env({ deleted: deleteIdea(i.id) }, `Deleted idea #${i.id}.`);
  const r = updateIdea(i.id, i);
  if (!r) throw new Error(`Idea #${i.id} not found.`);
  return env({ idea: r }, `Updated idea #${r.id} (${r.status}).`);
};
