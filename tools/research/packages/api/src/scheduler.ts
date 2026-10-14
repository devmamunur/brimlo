import { getSetting, ranToday, runDaily } from "@brimlo/core";

/**
 * Runs the daily update once a day while the API (dashboard) is running.
 * Off switch and hour live in Settings → Automation. Claude's MCP server never schedules, so it cannot run twice.
 */
export function startScheduler(log: (s: string) => void = console.log) {
  let busy = false;
  const tick = async () => {
    if (busy || getSetting("auto_daily") === "off") return;
    const hour = Number(getSetting("daily_hour") ?? 9);
    if (new Date().getHours() < hour || ranToday()) return;
    busy = true;
    try {
      const r = await runDaily({ trigger: "scheduler", force: false, dry_run: false });
      log(`[daily] ${r.summary}`);
    } catch (e) {
      log(`[daily] failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      busy = false;
    }
  };
  setTimeout(tick, 60_000).unref(); // give the server a minute after start
  setInterval(tick, 15 * 60_000).unref();
}
