import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { RESEARCH_ROOT } from "../config.ts";
import { getDb } from "../db/client.ts";
import { findChannelRow, getVideosByChannel } from "../db/repo.ts";
import { getYouTube } from "../providers/index.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { median, viewsPerDay } from "../scoring/keyword.ts";
import { isShort, medianBaseline, multiplier } from "../scoring/outlier.ts";
import { loadChannel, loadUploads, type Deps } from "./channels.ts";

const iso = () => new Date().toISOString();

interface CompRow {
  channel_id: string;
  handle: string | null;
  title: string;
  added_at: string;
  last_checked_at: string | null;
  note: string | null;
}
const rows = () => getDb().prepare("SELECT * FROM competitors ORDER BY added_at").all() as unknown as CompRow[];

/** Handles/ids of tracked competitors (used as default input for outliers). */
export const listCompetitorIds = (): string[] => rows().map((r) => r.channel_id);

const env = (data: unknown, summary: string, source: string, before: number, warnings: string[] = [], cachedFlag = false): Envelope => ({
  data,
  summary,
  source,
  fetched_at: iso(),
  cached: cachedFlag,
  quota_used: unitsCounter() - before,
  warnings,
});

// ---------- add ----------
export const competitorsAddInput = z.object({
  channel: z.string().min(1).describe("@handle, channel id or URL"),
  note: z.string().optional().describe("Why you track it"),
});
export async function competitorsAdd(input: z.infer<typeof competitorsAddInput>, deps: Deps = {}): Promise<Envelope> {
  const i = competitorsAddInput.parse(input);
  const before = unitsCounter();
  const ch = await loadChannel(i.channel, deps);
  getDb()
    .prepare("INSERT INTO competitors (channel_id, handle, title, added_at, note) VALUES (?,?,?,?,?) ON CONFLICT(channel_id) DO UPDATE SET note = COALESCE(excluded.note, note), handle = excluded.handle, title = excluded.title")
    .run(ch.id, ch.handle ?? null, ch.title, iso(), i.note ?? null);
  return env({ channel_id: ch.id, title: ch.title, handle: ch.handle, subscribers: ch.subscribers }, `Tracking ${ch.title} (${ch.subscribers.toLocaleString("en-US")} subs).`, (deps.yt ?? getYouTube()).name, before);
}

// ---------- remove ----------
export const competitorsRemoveInput = z.object({ channel: z.string().min(1).describe("@handle, id, or channel title") });
export async function competitorsRemove(input: z.infer<typeof competitorsRemoveInput>): Promise<Envelope> {
  const i = competitorsRemoveInput.parse(input);
  const row = findChannelRow(i.channel);
  const id = row?.id ?? rows().find((r) => r.title.toLowerCase() === i.channel.toLowerCase() || r.channel_id === i.channel)?.channel_id;
  const changes = id ? Number(getDb().prepare("DELETE FROM competitors WHERE channel_id = ?").run(id).changes) : 0;
  return env({ removed: changes > 0, channel_id: id ?? null }, changes ? `Removed ${i.channel}.` : `${i.channel} is not in the competitor list.`, "local", unitsCounter());
}

// ---------- list ----------
export const competitorsListInput = z.object({});
export async function competitorsList(): Promise<Envelope> {
  const now = Date.now();
  const list = rows().map((r) => {
    const ch = findChannelRow(r.channel_id);
    const vids = getVideosByChannel(r.channel_id).filter((v) => !isShort(v.duration_sec));
    const last30 = vids.filter((v) => now - Date.parse(v.published_at) <= 30 * 86400000).length;
    const best = [...vids].sort((a, b) => b.views - a.views)[0];
    return {
      channel_id: r.channel_id,
      title: r.title,
      handle: r.handle,
      subscribers: ch?.subscribers ?? null,
      note: r.note,
      added_at: r.added_at,
      last_checked_at: r.last_checked_at,
      stored_videos: vids.length,
      uploads_last_30_days: last30,
      best_stored_video: best ? { id: best.id, title: best.title, views: best.views } : null,
    };
  });
  return env({ competitors: list }, `${list.length} tracked competitors.`, "local", unitsCounter());
}

// ---------- refresh ----------
export const competitorsRefreshInput = z.object({
  channel: z.string().optional().describe("Only this competitor. Default: all"),
  min_multiplier: z.number().min(1).default(3).describe("Flag new videos at least N× the channel's median"),
  force: z.boolean().default(false).describe("Ignore the 12h cache (costs ~3 units per channel)"),
  per_channel: z.number().int().min(1).max(20).default(5).describe("Max new uploads and outliers listed per channel (counts are always full)"),
});
export async function competitorsRefresh(input: z.infer<typeof competitorsRefreshInput>, deps: Deps = {}): Promise<Envelope> {
  const i = competitorsRefreshInput.parse(input);
  const before = unitsCounter();
  const yt = deps.yt ?? getYouTube();
  const warnings: string[] = [];
  let targets = rows();
  if (i.channel) {
    const row = findChannelRow(i.channel);
    targets = targets.filter((t) => t.channel_id === row?.id || t.handle?.toLowerCase() === i.channel!.toLowerCase());
    if (!targets.length) throw new Error(`${i.channel} is not a tracked competitor.`);
  }
  if (!targets.length) throw new Error("No competitors yet. Run competitors_seed or competitors_add first.");

  const report = [];
  for (const t of targets) {
    try {
      const ch = await loadChannel(t.channel_id, deps, i.force);
      const up = await loadUploads(ch, 20, deps, { refresh: i.force, ttlSec: 12 * 3600 });
      const base = medianBaseline(up.value);
      const since = t.last_checked_at ? Date.parse(t.last_checked_at) : Date.now() - 14 * 86400000;
      const fresh = up.value.filter((v) => Date.parse(v.publishedAt) > since && !isShort(v.durationSec));
      const flagged = up.value
        .filter((v) => !isShort(v.durationSec) && multiplier(v.views, base) >= i.min_multiplier && Date.now() - Date.parse(v.publishedAt) <= 30 * 86400000)
        .map((v) => ({ id: v.id, title: v.title, views: v.views, multiplier: multiplier(v.views, base), views_per_day: Math.round(viewsPerDay(v.views, v.publishedAt)), url: `https://www.youtube.com/watch?v=${v.id}` }))
        .sort((a, b) => b.multiplier - a.multiplier);
      report.push({
        channel: ch.title,
        subscribers: ch.subscribers,
        median_views: Math.round(base || median(up.value.map((v) => v.views))),
        new_uploads_count: fresh.length,
        new_uploads_since_last_check: fresh.slice(0, i.per_channel).map((v) => ({ id: v.id, title: v.title, published_at: v.publishedAt, views: v.views, duration_min: Math.round(v.durationSec / 6) / 10 })),
        outliers_count: flagged.length,
        outliers_last_30_days: flagged.slice(0, i.per_channel),
      });
      getDb().prepare("UPDATE competitors SET last_checked_at = ?, handle = ?, title = ? WHERE channel_id = ?").run(iso(), ch.handle ?? null, ch.title, t.channel_id);
    } catch (e) {
      warnings.push(`${t.title}: ${e instanceof Error ? e.message : e}`);
    }
  }
  const newCount = report.reduce((a, r) => a + r.new_uploads_count, 0);
  const outCount = report.reduce((a, r) => a + r.outliers_count, 0);
  const status = quotaStatus();
  if (status.level !== "ok") warnings.push(`Quota at ${status.percent}% (${status.used}/${status.limit}).`);
  if (yt.name === "demo") warnings.push("DEMO DATA: fake numbers. Add YOUTUBE_API_KEY to tools/research/.env.");
  return env({ checked: report.length, report }, `Checked ${report.length} competitors: ${newCount} new uploads, ${outCount} outliers (≥${i.min_multiplier}×).`, yt.name, before, warnings);
}

// ---------- seed from research/competitors.md ----------
export const competitorsSeedInput = z.object({
  file: z.string().default("research/competitors.md").describe("Markdown file with youtube.com/@handle links, relative to the repo root"),
});
export function parseSeedHandles(markdown: string): string[] {
  return [...new Set([...markdown.matchAll(/youtube\.com\/(@[\w.\-]+)/gi)].map((m) => m[1]!.toLowerCase()))];
}
export async function competitorsSeed(input: z.infer<typeof competitorsSeedInput>, deps: Deps = {}): Promise<Envelope> {
  const i = competitorsSeedInput.parse(input);
  const before = unitsCounter();
  const file = path.resolve(RESEARCH_ROOT, "../..", i.file);
  const handles = parseSeedHandles(readFileSync(file, "utf8"));
  const have = new Set(rows().map((r) => r.handle?.toLowerCase()));
  const added: string[] = [];
  const skipped: string[] = [];
  const warnings: string[] = [];
  for (const h of handles) {
    if (have.has(h)) {
      skipped.push(h);
      continue;
    }
    try {
      const r = await competitorsAdd({ channel: h, note: `seed: ${i.file}` }, deps);
      added.push((r.data as any).title);
    } catch (e) {
      warnings.push(`${h}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return env({ found_handles: handles, added, skipped }, `Seed: ${added.length} added, ${skipped.length} already tracked, ${warnings.length} failed.`, (deps.yt ?? getYouTube()).name, before, warnings);
}
