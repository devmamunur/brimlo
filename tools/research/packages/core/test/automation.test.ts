import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/health.ts", () => ({ healthCheck: vi.fn(async () => ({ summary: "All sources OK (stub)", data: { checks: [] } })) }));
vi.mock("../src/features/steam.ts", () => ({
  steamGame: vi.fn(async ({ game }: { game: string }) => ({ data: { name: `Game ${game}`, players_now: 120, reviews: { total: 300 } } })),
}));

const { getDb, useMemoryDb } = await import("../src/db/client.ts");
const { competitorsAdd } = await import("../src/features/competitors.ts");
const { dailyPlan, lastRuns, runDaily } = await import("../src/features/daily.ts");
const { addWatch, listWatch, removeWatch } = await import("../src/features/watchlist.ts");
const { backupNow, listBackups } = await import("../src/features/backup.ts");
const { demoProvider } = await import("../src/providers/demo.ts");

beforeEach(() => {
  process.env.BRIMLO_DEMO = "1";
  process.env.BRIMLO_BACKUP_DIR = mkdtempSync(path.join(os.tmpdir(), "brimlo-bk-"));
  process.env.BRIMLO_OAUTH_FILE = path.join(process.env.BRIMLO_BACKUP_DIR, "none.json");
  useMemoryDb();
});

describe("watchlist", () => {
  it("normalizes keywords, keeps games as given, removes", () => {
    addWatch("keyword", "  Idle Mining GAME ");
    addWatch("game", "3456800", "Rock Crusher");
    expect(listWatch("keyword")[0]!.value).toBe("idle mining game");
    expect(listWatch("game")[0]).toMatchObject({ value: "3456800", label: "Rock Crusher" });
    expect(removeWatch("keyword", "IDLE MINING GAME")).toBe(true);
    expect(listWatch()).toHaveLength(1);
  });
});

describe("backups", () => {
  it("writes a real SQLite copy and keeps only the newest N, even within one second", async () => {
    for (let i = 0; i < 3; i++) backupNow(2);
    const files = listBackups();
    expect(files).toHaveLength(2);
    expect(readdirSync(process.env.BRIMLO_BACKUP_DIR!).every((f) => f.endsWith(".sqlite"))).toBe(true);
    expect(files[0]!.bytes).toBeGreaterThan(1000);
  });
});

describe("daily update", () => {
  it("plans units from competitors and due keywords", async () => {
    await competitorsAdd({ channel: "@alpha" }, { yt: demoProvider });
    await competitorsAdd({ channel: "@beta" }, { yt: demoProvider });
    addWatch("keyword", "idle mining game");
    const p = dailyPlan(300);
    expect(p.steps.find((s) => s.step === "Competitors")!.units).toBe(6);
    expect(p.steps.find((s) => s.step === "Watched keywords")!.units).toBe(102);
    expect(p.estimated_units).toBe(111);
    expect(p.fits).toBe(true);
  });

  it("runs all steps, saves a report, makes a backup, and does not run twice a day", async () => {
    await competitorsAdd({ channel: "@alpha" }, { yt: demoProvider });
    addWatch("game", "3456800", "Rock Crusher");
    const r = await runDaily({ trigger: "manual", force: false, dry_run: false });
    const d = r.data as any;
    expect(d.status).toBe("ok");
    expect(d.steps.map((s: any) => s.step)).toEqual(["Your channel", "Competitors", "Watched games", "Watched keywords", "Source health", "Backup"]);
    expect(d.steps.find((s: any) => s.step === "Watched games").summary).toContain("Game 3456800: 120 playing");
    expect(listBackups()).toHaveLength(1);
    expect(lastRuns(1)[0]).toMatchObject({ status: "ok", trigger: "manual" });
    const again = await runDaily({ trigger: "scheduler", force: false, dry_run: false });
    expect((again.data as any).skipped).toBe(true);
    const forced = await runDaily({ trigger: "manual", force: true, dry_run: false });
    expect((forced.data as any).status).toBe("ok");
    // outliers are highlighted only the first time they appear
    const firstIds = (d.highlights as string[]).filter((h) => h.includes("normal views"));
    expect((forced.data as any).highlights.filter((h: string) => firstIds.includes(h))).toHaveLength(0);
  });

  it("skips paid steps that do not fit the budget and marks the run partial", async () => {
    addWatch("keyword", "idle mining game");
    const r = await runDaily({ trigger: "manual", force: true, dry_run: false, budget_units: 50 });
    const d = r.data as any;
    const kw = d.steps.find((s: any) => s.step.startsWith("Keyword"));
    expect(kw.status).toBe("skipped");
    expect(kw.summary).toMatch(/budget/);
    expect(d.status).toBe("partial");
  });

  it("refuses to start while another run is in progress", async () => {
    getDb().prepare("INSERT INTO job_runs (job, started_at, status) VALUES ('daily', ?, 'running')").run(new Date().toISOString());
    await expect(runDaily({ trigger: "manual", force: true, dry_run: false })).rejects.toThrow(/already running/);
  });

  it("dry run does not write anything", async () => {
    const r = await runDaily({ trigger: "manual", force: false, dry_run: true });
    expect((r.data as any).steps).toHaveLength(6);
    expect(lastRuns()).toHaveLength(0);
    expect(existsSync(process.env.BRIMLO_BACKUP_DIR!) && readdirSync(process.env.BRIMLO_BACKUP_DIR!).length).toBe(0);
  });
});
