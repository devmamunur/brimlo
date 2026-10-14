import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RESEARCH_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const envFile = path.join(RESEARCH_ROOT, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

/** Read at call time so tests can change env vars. */
export function config() {
  const apiKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  const demo = !apiKey || process.env.BRIMLO_DEMO === "1";
  const dataDir = path.join(RESEARCH_ROOT, "data");
  return {
    apiKey,
    demo,
    dailyQuota: Number(process.env.YOUTUBE_DAILY_QUOTA) || 10_000,
    dbPath: process.env.BRIMLO_DB || path.join(dataDir, demo ? "brimlo.demo.sqlite" : "brimlo.sqlite"),
  };
}
