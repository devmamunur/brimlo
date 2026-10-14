import { getDb } from "./db/client.ts";

export const DAY_SEC = 24 * 3600;

export interface Cached<T> {
  value: T;
  cached: boolean;
  fetchedAt: string;
  source: string;
}

export function peek<T>(key: string, now = Date.now()): Cached<T> | undefined {
  const row = getDb().prepare("SELECT value, fetched_at, ttl_sec, source FROM cache WHERE key = ?").get(key) as
    | { value: string; fetched_at: number; ttl_sec: number; source: string }
    | undefined;
  if (!row || now - row.fetched_at > row.ttl_sec * 1000) return undefined;
  return { value: JSON.parse(row.value) as T, cached: true, fetchedAt: new Date(row.fetched_at).toISOString(), source: row.source };
}

/** Return the cached value if fresh, otherwise run `fn` and store it. */
export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<{ value: T; source: string }>,
  opts: { refresh?: boolean } = {},
): Promise<Cached<T>> {
  if (!opts.refresh) {
    const hit = peek<T>(key);
    if (hit) return hit;
  }
  const { value, source } = await fn();
  const now = Date.now();
  getDb().prepare("INSERT OR REPLACE INTO cache (key, value, fetched_at, ttl_sec, source) VALUES (?,?,?,?,?)").run(key, JSON.stringify(value), now, ttlSec, source);
  return { value, cached: false, fetchedAt: new Date(now).toISOString(), source };
}
