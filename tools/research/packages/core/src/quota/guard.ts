import { config } from "../config.ts";
import { getDb } from "../db/client.ts";

/** YouTube Data API v3 unit costs (official quota table). */
export const COSTS = { search: 100, videos: 1, channels: 1, playlistItems: 1, commentThreads: 1 } as const;
export type Endpoint = keyof typeof COSTS;

export const WARN_AT = 0.7;
export const STOP_AT = 0.9;

export class QuotaError extends Error {}

export type QuotaLevel = "ok" | "warn" | "stop";

/** Pure rule: what happens if we spend `units` more, given `used` today. */
export function evaluate(used: number, units: number, limit: number) {
  const after = used + units;
  const level: QuotaLevel = after > limit * STOP_AT ? "stop" : after >= limit * WARN_AT ? "warn" : "ok";
  return { after, level, allowed: level !== "stop" };
}

/** YouTube quota resets at midnight Pacific time. */
export function quotaDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

let counter = 0;
/** Total units recorded by this process. Read before/after a task to get its cost. */
export const unitsCounter = () => counter;

export function usedToday(now = new Date()): number {
  const row = getDb().prepare("SELECT COALESCE(SUM(units),0) AS u FROM quota_log WHERE day = ?").get(quotaDay(now)) as { u: number };
  return row.u;
}

export function assertQuota(units: number, endpoint: string) {
  const limit = config().dailyQuota;
  const used = usedToday();
  const r = evaluate(used, units, limit);
  if (!r.allowed) {
    throw new QuotaError(
      `Quota guard: ${endpoint} costs ${units} units. Used today ${used}/${limit}. ` +
        `This would pass the ${STOP_AT * 100}% stop line (${limit * STOP_AT}). Try again after the reset (midnight Pacific).`,
    );
  }
}

export function recordQuota(endpoint: string, units: number, note?: string) {
  const now = new Date();
  getDb().prepare("INSERT INTO quota_log (day, ts, endpoint, units, note) VALUES (?,?,?,?,?)").run(quotaDay(now), now.toISOString(), endpoint, units, note ?? null);
  counter += units;
}

export function quotaStatus(now = new Date()) {
  const limit = config().dailyQuota;
  const used = usedToday(now);
  const percent = Math.round((used / limit) * 1000) / 10;
  const level = evaluate(used, 0, limit).level;
  const byEndpoint = getDb()
    .prepare("SELECT endpoint, SUM(units) AS units, COUNT(*) AS calls FROM quota_log WHERE day = ? GROUP BY endpoint ORDER BY units DESC")
    .all(quotaDay(now));
  return {
    day: quotaDay(now),
    used,
    limit,
    remaining: limit - used,
    percent,
    level,
    warn_at: limit * WARN_AT,
    stop_at: limit * STOP_AT,
    searches_left: Math.max(0, Math.floor((limit * STOP_AT - used) / COSTS.search)),
    by_endpoint: byEndpoint,
    mode: config().demo ? "demo" : "live",
  };
}
