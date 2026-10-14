import { z } from "zod";
import { getDb } from "../db/client.ts";
import { localEnvelope, type Envelope } from "../result.ts";

export type WatchKind = "keyword" | "game";
export interface WatchItem { kind: WatchKind; value: string; label: string | null; added_at: string }

export const listWatch = (kind?: WatchKind): WatchItem[] =>
  (kind ? getDb().prepare("SELECT * FROM watchlist WHERE kind = ? ORDER BY added_at").all(kind) : getDb().prepare("SELECT * FROM watchlist ORDER BY kind, added_at").all()) as unknown as WatchItem[];

export function addWatch(kind: WatchKind, value: string, label?: string | null) {
  const v = kind === "keyword" ? value.trim().toLowerCase() : value.trim();
  if (v.length < 2) throw new Error("Value is too short.");
  getDb().prepare("INSERT INTO watchlist (kind, value, label, added_at) VALUES (?,?,?,?) ON CONFLICT(kind, value) DO UPDATE SET label = COALESCE(excluded.label, label)").run(kind, v, label ?? null, new Date().toISOString());
  return v;
}
export const removeWatch = (kind: WatchKind, value: string) => Number(getDb().prepare("DELETE FROM watchlist WHERE kind = ? AND (value = ? OR lower(value) = lower(?))").run(kind, value.trim(), value.trim()).changes) > 0;

export const watchAddInput = z.object({
  kind: z.enum(["keyword", "game"]).describe("keyword = YouTube keyword (refreshed weekly, ~102 units); game = Steam app id or name (refreshed daily, free)"),
  value: z.string().min(2).describe("The keyword, or the Steam app id / game name"),
  label: z.string().optional().describe("Display name (e.g. the game name when value is an app id)"),
});
export async function watchAdd(input: z.infer<typeof watchAddInput>): Promise<Envelope> {
  const i = watchAddInput.parse(input);
  const v = addWatch(i.kind, i.value, i.label);
  return localEnvelope({ kind: i.kind, value: v }, `Watching ${i.kind} "${i.label ?? v}". The daily update keeps its history.`, "local");
}

export const watchRemoveInput = z.object({ kind: z.enum(["keyword", "game"]), value: z.string().min(1) });
export async function watchRemove(input: z.infer<typeof watchRemoveInput>): Promise<Envelope> {
  const i = watchRemoveInput.parse(input);
  const ok = removeWatch(i.kind, i.value);
  return localEnvelope({ removed: ok }, ok ? `Stopped watching ${i.kind} "${i.value}".` : `"${i.value}" was not on the watchlist.`, "local");
}

export const watchListInput = z.object({ kind: z.enum(["keyword", "game"]).optional() });
export async function watchList(input: z.infer<typeof watchListInput>): Promise<Envelope> {
  const items = listWatch(watchListInput.parse(input).kind);
  return localEnvelope({ items }, `${items.length} watched (${items.filter((x) => x.kind === "keyword").length} keywords, ${items.filter((x) => x.kind === "game").length} games).`, "local");
}
