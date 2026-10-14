import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.ts";

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
let current: DatabaseSync | undefined;

function init(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(schema);
  pruneCache(db);
  return db;
}

/** Expired cache rows are never read again; drop them so the file does not grow forever. Runs when the DB opens. */
export function pruneCache(db: DatabaseSync, now = Date.now()): number {
  return Number(db.prepare("DELETE FROM cache WHERE fetched_at + ttl_sec * 1000 < ?").run(now).changes);
}

export function getDb(): DatabaseSync {
  if (!current) {
    const file = config().dbPath;
    mkdirSync(path.dirname(file), { recursive: true });
    current = init(new DatabaseSync(file));
  }
  return current;
}

/** For tests: use a fresh in-memory database. */
export function useMemoryDb(): DatabaseSync {
  current = init(new DatabaseSync(":memory:"));
  return current;
}

export function closeDb() {
  current?.close();
  current = undefined;
}

/** node:sqlite rejects `undefined`; turn it into null. */
export function clean<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === undefined ? null : v]));
}
