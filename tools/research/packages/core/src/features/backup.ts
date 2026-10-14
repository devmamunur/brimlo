import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { config, RESEARCH_ROOT } from "../config.ts";
import { getDb } from "../db/client.ts";
import { localEnvelope, type Envelope } from "../result.ts";

export const backupDir = () => process.env.BRIMLO_BACKUP_DIR || path.join(RESEARCH_ROOT, "data", "backups");

export function listBackups() {
  if (!existsSync(backupDir())) return [];
  return readdirSync(backupDir())
    .filter((f) => f.endsWith(".sqlite"))
    .map((f) => ({ file: f, bytes: statSync(path.join(backupDir(), f)).size, created: statSync(path.join(backupDir(), f)).mtime.toISOString() }))
    .sort((a, b) => b.created.localeCompare(a.created));
}

/** Consistent copy of the live database (SQLite VACUUM INTO), keeping the newest `keep` files. */
export function backupNow(keep = 10): { file: string; bytes: number; removed: string[] } {
  mkdirSync(backupDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const base = `${config().demo ? "brimlo.demo" : "brimlo"}-${stamp}`;
  // SQLite will not overwrite a file, so two backups in the same second get -2, -3…
  let name = `${base}.sqlite`;
  for (let n = 2; existsSync(path.join(backupDir(), name)); n++) name = `${base}-${n}.sqlite`;
  const file = path.join(backupDir(), name);
  getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const removed = listBackups().slice(keep).map((b) => b.file);
  for (const f of removed) rmSync(path.join(backupDir(), f), { force: true });
  return { file: name, bytes: statSync(file).size, removed };
}

export const backupInput = z.object({ keep: z.number().int().min(1).max(60).default(10) });
export async function backup(input: z.infer<typeof backupInput>): Promise<Envelope> {
  const i = backupInput.parse(input);
  const r = backupNow(i.keep);
  return localEnvelope(
    { ...r, folder: path.relative(path.resolve(RESEARCH_ROOT, "../.."), backupDir()), backups: listBackups(), restore: "Stop the dashboard and Claude Code, then copy a backup over tools/research/data/brimlo.sqlite." },
    `Backup saved: ${r.file} (${(r.bytes / 1e6).toFixed(1)} MB).${r.removed.length ? ` Removed ${r.removed.length} old backup(s).` : ""}`,
    "local",
  );
}
