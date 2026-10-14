import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { config } from "../config.ts";
import { getDb } from "../db/client.ts";
import { suggest } from "../providers/autocomplete.ts";
import { getYouTube } from "../providers/index.ts";
import { itchFeed } from "../providers/itch.ts";
import { getAccessToken, oauthConnected } from "../providers/oauth.ts";
import { redditConfigured, redditPing } from "../providers/reddit.ts";
import { appDetails, currentPlayers, reviews, searchByTags, searchStore, STEAM_TAGS, steamSpy } from "../providers/steam.ts";
import { quotaStatus, unitsCounter } from "../quota/guard.ts";
import { localEnvelope, type Envelope } from "../result.ts";
import { ownChannelId, setSetting } from "../settings.ts";
import { ytDlpPath } from "./videos.ts";

const run = promisify(execFile);

export interface Check { name: string; ok: boolean | null; ms: number; detail: string }

async function check(name: string, fn: () => Promise<string>): Promise<Check> {
  const t = Date.now();
  try {
    const detail = await Promise.race([fn(), new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timed out after 30 s")), 30_000))]);
    return { name, ok: true, ms: Date.now() - t, detail };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t, detail: e instanceof Error ? e.message : String(e) };
  }
}
const skip = (name: string, detail: string): Check => ({ name, ok: null, ms: 0, detail });
const must = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

export const healthInput = z.object({
  include_youtube_api: z.boolean().default(true).describe("Also call the YouTube Data API once (1 unit)"),
});

/** Calls every source directly (no cache) and checks the parsed data still looks right. */
export async function healthCheck(input: z.infer<typeof healthInput>): Promise<Envelope> {
  const i = healthInput.parse(input);
  const before = unitsCounter();
  const checks: Check[] = [];
  checks.push(await check("Database", async () => {
    const n = (getDb().prepare("SELECT COUNT(*) AS n FROM videos").get() as { n: number }).n;
    return `${config().demo ? "demo" : "live"} database, ${n} videos`;
  }));
  checks.push(await check("Quota guard", async () => {
    const q = quotaStatus();
    must(q.level !== "stop", `quota at ${q.percent}%: research is paused until midnight Pacific`);
    return `${q.used}/${q.limit} units used today (${q.level})`;
  }));
  checks.push(await check("YouTube autocomplete", async () => {
    const s = await suggest("incremental game");
    must(s.length > 0, "no suggestions returned");
    return `${s.length} suggestions`;
  }));
  if (config().demo) checks.push(skip("YouTube Data API", "demo mode (no API key)"));
  else if (!i.include_youtube_api) checks.push(skip("YouTube Data API", "skipped to save quota"));
  else checks.push(await check("YouTube Data API", async () => {
    const ch = await getYouTube().resolveChannel({ id: ownChannelId() });
    must(ch, "own channel not found");
    return `${ch!.title}: ${ch!.subscribers} subs (1 unit)`;
  }));
  checks.push(await check("Steam store search", async () => {
    const hits = await searchStore("Cookie Clicker");
    must(hits.some((h) => h.appid === 1454400), "expected Cookie Clicker in the results");
    return `${hits.length} results`;
  }));
  checks.push(await check("Steam tag search (HTML parser)", async () => {
    const r = await searchByTags([STEAM_TAGS.incremental!], "new", 10);
    must(r.rows.length > 0, "no rows parsed: Steam may have changed its page");
    must(r.rows.every((x) => x.name && x.appid), "rows without a name or app id: parser needs an update");
    return `${r.rows.length} rows parsed, ${r.total.toLocaleString("en-US")} matches`;
  }));
  checks.push(await check("Steam app details", async () => {
    const d = await appDetails(1454400);
    must(d?.name === "Cookie Clicker" && typeof d.platforms.mac === "boolean", "unexpected app details shape");
    return `${d!.name}, ${d!.price_text}`;
  }));
  checks.push(await check("Steam reviews", async () => {
    const r = await reviews(1454400, { filter: "recent", num: 5, language: "all" });
    must(r.summary.total > 0 && r.reviews.length > 0, "no reviews returned");
    return `${r.summary.total.toLocaleString("en-US")} reviews, ${r.reviews.length} texts`;
  }));
  checks.push(await check("Steam players (Web API)", async () => {
    const p = await currentPlayers(1454400);
    must(p !== null, "no player count");
    return `${p} playing Cookie Clicker`;
  }));
  checks.push(await check("SteamSpy", async () => {
    const s = await steamSpy(1454400);
    must(s?.owners, "no owner estimate");
    return `owners ${s!.owners}`;
  }));
  checks.push(await check("itch.io feed", async () => {
    const g = await itchFeed("incremental");
    must(g.length > 0 && g.every((x) => x.title && x.url), "feed empty or changed");
    return `${g.length} games`;
  }));
  checks.push(redditConfigured() ? await check("Reddit API", async () => (await redditPing(), "logged in")) : skip("Reddit API", "not connected (optional)"));
  checks.push(oauthConnected() ? await check("Google connection", async () => (await getAccessToken(), "token OK")) : skip("Google connection", "not connected (optional)"));
  checks.push(await check("yt-dlp", async () => {
    const { stdout } = await run(ytDlpPath(), ["--version"], { timeout: 15_000 });
    const v = stdout.trim();
    const age = (Date.now() - Date.parse(v.replace(/\./g, "-"))) / 86400000;
    must(!(age > 120), `version ${v} is ${Math.round(age)} days old: update with .venv/bin/pip install -U yt-dlp`);
    return `version ${v}`;
  }));

  const failed = checks.filter((c) => c.ok === false);
  const at = new Date().toISOString();
  setSetting("health_last", JSON.stringify({ at, failed: failed.map((f) => f.name), total: checks.length }));
  return {
    ...localEnvelope({ at, checks, failed: failed.length, ok: checks.filter((c) => c.ok).length, skipped: checks.filter((c) => c.ok === null).length }, failed.length ? `${failed.length} source(s) failing: ${failed.map((f) => f.name).join(", ")}.` : `All ${checks.filter((c) => c.ok).length} sources OK (${checks.filter((c) => c.ok === null).length} optional skipped).`, "health"),
    quota_used: unitsCounter() - before,
  };
}
