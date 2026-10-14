import { existsSync, readFileSync, rmSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import path from "node:path";
import { RESEARCH_ROOT } from "../config.ts";
import { getJson, politeFetch, USER_AGENT } from "./http.ts";

/**
 * Reddit through the OFFICIAL Data API only (OAuth, app-only "client credentials").
 * Reddit's robots.txt disallows scraping, so there is no scraper here.
 * Free for non-commercial use with your own app (reddit.com/prefs/apps → "script").
 */

export const redditClientFile = () => process.env.BRIMLO_REDDIT_CLIENT_FILE || path.join(RESEARCH_ROOT, "data", "reddit-client.json");

export function redditCreds(): { id: string; secret: string; source: "env" | "dashboard" | "none" } {
  if (process.env.REDDIT_CLIENT_ID?.trim()) return { id: process.env.REDDIT_CLIENT_ID.trim(), secret: process.env.REDDIT_CLIENT_SECRET?.trim() ?? "", source: "env" };
  if (existsSync(redditClientFile())) {
    const c = JSON.parse(readFileSync(redditClientFile(), "utf8"));
    return { id: c.client_id ?? "", secret: c.client_secret ?? "", source: "dashboard" };
  }
  return { id: "", secret: "", source: "none" };
}
export const redditConfigured = () => Boolean(redditCreds().id && redditCreds().secret);

export function saveRedditClient(id: string, secret: string) {
  if (!/^[\w-]{10,40}$/.test(id.trim())) throw new Error("That does not look like a Reddit client id (the short code under the app name).");
  if (secret.trim().length < 15) throw new Error("Client secret looks too short.");
  mkdirSync(path.dirname(redditClientFile()), { recursive: true });
  writeFileSync(redditClientFile(), JSON.stringify({ client_id: id.trim(), client_secret: secret.trim() }), { mode: 0o600 });
  chmodSync(redditClientFile(), 0o600);
  token = null;
}
export function removeRedditClient() {
  rmSync(redditClientFile(), { force: true });
  token = null;
}

let token: { value: string; expires: number } | null = null;
const ua = () => process.env.REDDIT_USER_AGENT?.trim() || `${USER_AGENT} via official API`;

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now()) return token.value;
  const { id, secret } = redditCreds();
  if (!id || !secret) throw new Error("Reddit is not connected. Add a free Reddit app (Settings → Reddit) or REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET in .env.");
  const res = await politeFetch("https://www.reddit.com/api/v1/access_token", {
    robots: false,
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded", "user-agent": ua() },
    body: "grant_type=client_credentials",
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) throw new Error(`Reddit login failed (${j.error ?? res.status}). Check the app id/secret and that the app is a "script" app.`);
  token = { value: j.access_token, expires: Date.now() + ((j.expires_in ?? 3600) - 60) * 1000 };
  return token.value;
}

export interface RedditPost { title: string; subreddit: string; score: number; comments: number; created: string; url: string; flair: string | null; text: string }

export async function redditSearch(q: string, o: { subreddit?: string; sort?: string; time?: string; limit?: number }): Promise<RedditPost[]> {
  const t = await accessToken();
  const base = o.subreddit ? `https://oauth.reddit.com/r/${encodeURIComponent(o.subreddit)}/search` : "https://oauth.reddit.com/search";
  const p = new URLSearchParams({ q, sort: o.sort ?? "new", t: o.time ?? "year", limit: String(Math.min(100, o.limit ?? 25)), raw_json: "1", type: "link", ...(o.subreddit ? { restrict_sr: "1" } : {}) });
  const j = await getJson<any>(`${base}?${p}`, { robots: false, headers: { authorization: `Bearer ${t}`, "user-agent": ua() } });
  return (j?.data?.children ?? []).map((c: any) => c.data).map((d: any) => ({
    title: d.title,
    subreddit: d.subreddit,
    score: d.score ?? 0,
    comments: d.num_comments ?? 0,
    created: new Date((d.created_utc ?? 0) * 1000).toISOString(),
    url: `https://www.reddit.com${d.permalink}`,
    flair: d.link_flair_text ?? null,
    text: String(d.selftext ?? "").slice(0, 600),
  }));
}

/** Health check: can we log in? */
export async function redditPing(): Promise<void> {
  await accessToken();
}
