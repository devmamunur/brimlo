import { z } from "zod";
import { getDb } from "../db/client.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import type { Envelope } from "../result.ts";
import { getSetting, setSetting } from "../settings.ts";
import { backupNow } from "./backup.ts";
import { competitorsRefresh, listCompetitorIds } from "./competitors.ts";
import { healthCheck } from "./health.ts";
import { keywordResearch, KEYWORD_COST } from "./keywords.ts";
import { ownChannel } from "./ownChannel.ts";
import { steamGame } from "./steam.ts";
import { listWatch } from "./watchlist.ts";

/**
 * The daily update: keeps every trend chart filling by itself.
 * Order: your channel → competitors → watched games (free) → watched keywords (weekly, 102 units each) → health → backup.
 * Never spends more than the budget (default 300 units ≈ 3% of the daily quota).
 */

export const DEFAULT_DAILY_BUDGET = 300;
const KEYWORD_EVERY_DAYS = 7;
const localDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA").format(d);

export interface StepResult { step: string; status: "ok" | "failed" | "skipped"; units: number; summary: string }

export const dailyInput = z.object({
  force: z.boolean().default(false).describe("Run even if it already ran today"),
  dry_run: z.boolean().default(false).describe("Only show the plan and estimated units"),
  budget_units: z.number().int().min(10).max(3000).optional().describe("Max YouTube units for this run (default: Settings, else 300)"),
  trigger: z.enum(["manual", "scheduler", "cli"]).default("manual"),
});

export function lastRuns(limit = 10) {
  return (getDb().prepare("SELECT * FROM job_runs WHERE job = 'daily' ORDER BY id DESC LIMIT ?").all(limit) as any[]).map((r) => ({ ...r, report: r.report ? JSON.parse(r.report) : null }));
}
export const ranToday = () => lastRuns(5).some((r) => (r.status === "ok" || r.status === "partial") && localDay(new Date(r.started_at)) === localDay());

function dueKeywords() {
  return listWatch("keyword").map((w) => {
    const last = getDb().prepare("SELECT s.taken_at FROM keyword_snapshots s JOIN keywords k ON k.id = s.keyword_id WHERE k.query = ? ORDER BY s.taken_at DESC LIMIT 1").get(w.value) as { taken_at: string } | undefined;
    const age = last ? (Date.now() - Date.parse(last.taken_at)) / 86400000 : Infinity;
    return { keyword: w.value, last: last?.taken_at ?? null, due: age >= KEYWORD_EVERY_DAYS - 0.5 };
  });
}

export function dailyPlan(budget: number) {
  const comps = listCompetitorIds().length;
  const games = listWatch("game");
  const kws = dueKeywords();
  const steps = [
    { step: "Your channel", units: 3, note: "subscribers, views, uploads (+ watch hours if Google is connected)" },
    { step: "Competitors", units: comps * 3, note: comps ? `${comps} channels: new uploads + outliers` : "none tracked (add some on the Competitors page)" },
    { step: "Watched games", units: 0, note: games.length ? `${games.length} Steam games: players, reviews, price` : "none watched (press Watch on a game)" },
    { step: "Watched keywords", units: kws.filter((k) => k.due).length * KEYWORD_COST, note: kws.length ? `${kws.filter((k) => k.due).length} of ${kws.length} due (weekly)` : "none watched (press Watch on a keyword)" },
    { step: "Source health", units: 0, note: "checks Steam, itch.io, YouTube autocomplete, yt-dlp…" },
    { step: "Backup", units: 0, note: "copy of the database, keeps the last 10" },
  ];
  const total = steps.reduce((s, x) => s + x.units, 0);
  return { steps, estimated_units: total, budget, fits: total <= budget, keywords: kws };
}

export async function runDaily(input: z.infer<typeof dailyInput>): Promise<Envelope> {
  const i = dailyInput.parse(input);
  const budget = i.budget_units ?? (Number(getSetting("daily_budget")) || DEFAULT_DAILY_BUDGET);
  const plan = dailyPlan(budget);
  const env = (data: unknown, summary: string, units = 0, warnings: string[] = []): Envelope => ({ data, summary, source: "daily", fetched_at: new Date().toISOString(), cached: false, quota_used: units, warnings });
  if (i.dry_run) return env(plan, `Plan: about ${plan.estimated_units} units (budget ${budget}).${plan.fits ? "" : " Over budget: the last steps will be skipped."}`);

  const db = getDb();
  const running = db.prepare("SELECT id FROM job_runs WHERE job = 'daily' AND status = 'running' AND started_at > ?").get(new Date(Date.now() - 45 * 60_000).toISOString());
  if (running) throw new Error("The daily update is already running.");
  if (!i.force && ranToday()) return env({ skipped: true, last: lastRuns(1)[0] ?? null }, "Already ran today. Use force to run again.");

  const startedAt = new Date().toISOString();
  const jobId = Number(db.prepare("INSERT INTO job_runs (job, started_at, status, trigger) VALUES ('daily', ?, 'running', ?)").run(startedAt, i.trigger).lastInsertRowid);
  const start = unitsCounter();
  const steps: StepResult[] = [];
  const highlights: string[] = [];
  const spent = () => unitsCounter() - start;

  async function step(name: string, estimate: number, fn: () => Promise<string>) {
    if (estimate > 0 && spent() + estimate > budget) return void steps.push({ step: name, status: "skipped", units: 0, summary: `skipped: needs ~${estimate} units, only ${budget - spent()} left in today's budget` });
    if (estimate > 0 && quotaStatus().level === "stop") return void steps.push({ step: name, status: "skipped", units: 0, summary: "skipped: YouTube quota is at the 90% stop line" });
    const before = unitsCounter();
    try {
      steps.push({ step: name, status: "ok", units: 0, summary: await fn() });
    } catch (e) {
      steps.push({ step: name, status: "failed", units: 0, summary: e instanceof Error ? e.message : String(e) });
    }
    steps[steps.length - 1]!.units = unitsCounter() - before;
  }

  await step("Your channel", 3, async () => (await ownChannel({ days: 28, refresh: true })).summary);

  const comps = listCompetitorIds().length;
  if (comps) {
    await step("Competitors", comps * 3, async () => {
      const r = await competitorsRefresh({ min_multiplier: 3, force: true, per_channel: 3 });
      // Highlight each outlier only once (the first day it shows up), so the list is news, not a repeat.
      const seen = new Set<string>(JSON.parse(getSetting("highlighted_outliers") ?? "[]"));
      for (const c of (r.data as any).report)
        for (const o of c.outliers_last_30_days)
          if (o.multiplier >= 5 && !seen.has(o.id)) {
            highlights.push(`${c.channel}: “${o.title}” is at ${o.multiplier}× their normal views`);
            seen.add(o.id);
          }
      setSetting("highlighted_outliers", JSON.stringify([...seen].slice(-500)));
      return r.summary;
    });
  } else steps.push({ step: "Competitors", status: "skipped", units: 0, summary: "no competitors tracked" });

  const games = listWatch("game");
  if (games.length) {
    await step("Watched games", 0, async () => {
      const lines: string[] = [];
      for (const g of games) {
        try {
          const prev = db.prepare("SELECT s.players, s.reviews_total FROM steam_snapshots s JOIN steam_apps a ON a.appid = s.appid WHERE (a.appid = ? OR lower(a.name) = lower(?)) AND s.taken_at < ? ORDER BY s.taken_at DESC LIMIT 1").get(Number(g.value) || -1, g.value, localDay()) as { players: number | null; reviews_total: number } | undefined;
          const d = (await steamGame({ game: g.value, refresh: true })).data as any;
          const dp = prev?.players != null && d.players_now != null ? d.players_now - prev.players : null;
          const dr = prev ? d.reviews.total - prev.reviews_total : null;
          lines.push(`${d.name}: ${d.players_now ?? "?"} playing${dp !== null ? ` (${dp >= 0 ? "+" : ""}${dp})` : ""}, ${d.reviews.total} reviews${dr ? ` (+${dr})` : ""}`);
          if (dr !== null && prev && prev.reviews_total > 0 && dr / prev.reviews_total >= 0.1) highlights.push(`${d.name} is getting attention: +${dr} reviews since last check`);
        } catch (e) {
          lines.push(`${g.label ?? g.value}: failed (${e instanceof Error ? e.message : e})`);
        }
      }
      return lines.join("; ");
    });
  } else steps.push({ step: "Watched games", status: "skipped", units: 0, summary: "no games watched" });

  const due = dueKeywords().filter((k) => k.due);
  if (due.length) {
    for (const k of due) {
      await step(`Keyword “${k.keyword}”`, KEYWORD_COST, async () => {
        const prev = db.prepare("SELECT s.opportunity, s.competition FROM keyword_snapshots s JOIN keywords k ON k.id = s.keyword_id WHERE k.query = ? ORDER BY s.taken_at DESC LIMIT 1").get(k.keyword) as { opportunity: number; competition: number } | undefined;
        const r = await keywordResearch({ query: k.keyword, limit: 10, expand: true, refresh: true, estimate_only: false });
        const d = r.data as any;
        if (prev && Math.abs(d.opportunity.score - prev.opportunity) >= 10) highlights.push(`Keyword “${k.keyword}”: opportunity ${Math.round(prev.opportunity)} → ${d.opportunity.score}`);
        return r.summary;
      });
    }
  } else steps.push({ step: "Watched keywords", status: "skipped", units: 0, summary: listWatch("keyword").length ? "none due (refreshed weekly)" : "no keywords watched" });

  await step("Source health", 0, async () => {
    const h = await healthCheck({ include_youtube_api: false });
    const failed = (h.data as any).checks.filter((c: any) => c.ok === false).map((c: any) => c.name);
    if (failed.length) highlights.push(`Source problem: ${failed.join(", ")} (see Settings → Source health)`);
    return h.summary;
  });
  await step("Backup", 0, async () => {
    const b = backupNow(10);
    return `${b.file} (${(b.bytes / 1e6).toFixed(1)} MB)`;
  });

  const failed = steps.filter((s) => s.status === "failed").length;
  const budgetSkips = steps.filter((s) => s.status === "skipped" && /budget|quota/.test(s.summary)).length;
  const status = failed === steps.length ? "failed" : failed || budgetSkips ? "partial" : "ok";
  const report = { steps, highlights, budget, plan_units: plan.estimated_units };
  db.prepare("UPDATE job_runs SET finished_at = ?, status = ?, units = ?, report = ? WHERE id = ?").run(new Date().toISOString(), status, spent(), JSON.stringify(report), jobId);
  return env(
    { id: jobId, status, ...report },
    `Daily update ${status}: ${steps.filter((s) => s.status === "ok").length}/${steps.length} steps OK, ${spent()} units.${highlights.length ? ` Highlights: ${highlights.slice(0, 3).join(" · ")}` : ""}`,
    spent(),
    steps.filter((s) => s.status === "failed").map((s) => `${s.step}: ${s.summary}`),
  );
}
