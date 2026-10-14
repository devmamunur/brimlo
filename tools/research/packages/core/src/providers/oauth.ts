import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { RESEARCH_ROOT } from "../config.ts";
import { upsertChannel } from "../db/repo.ts";
import { assertQuota, COSTS, recordQuota } from "../quota/guard.ts";
import { deleteSetting, setSetting } from "../settings.ts";
import type { ChannelInfo } from "./types.ts";
import { mapChannel } from "./youtube-api.ts";

/**
 * Google OAuth for installed apps (loopback redirect + PKCE). Read-only scopes.
 * Used by the CLI (`auth`) and by the dashboard (Settings → Connect with Google).
 * Secrets live in files with mode 600 under data/ (ignored by git), never in the database.
 */

export const SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly", "https://www.googleapis.com/auth/youtube.readonly"];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const tokenFile = () => process.env.BRIMLO_OAUTH_FILE || path.join(RESEARCH_ROOT, "data", "oauth.json");
export const clientFile = () => process.env.BRIMLO_OAUTH_CLIENT_FILE || path.join(RESEARCH_ROOT, "data", "oauth-client.json");

export interface Tokens {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
  scope?: string;
}

function writeSecret(file: string, data: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
  chmodSync(file, 0o600);
}

// ---------- OAuth client (Desktop app) ----------
/** .env wins; otherwise the client saved from the dashboard. */
export function clientCreds(): { id: string; secret: string; source: "env" | "dashboard" | "none" } {
  const envId = process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim();
  if (envId) return { id: envId, secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim() ?? "", source: "env" };
  if (existsSync(clientFile())) {
    const c = JSON.parse(readFileSync(clientFile(), "utf8"));
    return { id: c.client_id ?? "", secret: c.client_secret ?? "", source: "dashboard" };
  }
  return { id: "", secret: "", source: "none" };
}
export const oauthConfigured = () => Boolean(clientCreds().id);
export const oauthConnected = () => existsSync(tokenFile());

export function saveClient(clientId: string, clientSecret: string) {
  const id = clientId.trim();
  if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) throw new Error("Client ID must end with .apps.googleusercontent.com (Google Cloud → Credentials → OAuth client → Desktop app).");
  if (clientSecret.trim().length < 10) throw new Error("Client secret looks too short.");
  writeSecret(clientFile(), { client_id: id, client_secret: clientSecret.trim() });
}
export function removeClient() {
  rmSync(clientFile(), { force: true });
}

// ---------- PKCE + URLs ----------
export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(redirectUri: string, challenge: string, state: string) {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({ client_id: clientCreds().id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "), code_challenge: challenge, code_challenge_method: "S256", state, access_type: "offline", prompt: "consent select_account" }).toString();
  return u.toString();
}

async function tokenRequest(params: Record<string, string>) {
  const { id, secret } = clientCreds();
  const body = new URLSearchParams({ client_id: id, ...(secret ? { client_secret: secret } : {}), ...params });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15_000) });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google token error: ${json.error_description ?? json.error ?? res.status}`);
  return json;
}

export const saveTokens = (t: Tokens) => writeSecret(tokenFile(), t);
export const loadTokens = (): Tokens | undefined => (oauthConnected() ? (JSON.parse(readFileSync(tokenFile(), "utf8")) as Tokens) : undefined);

export async function exchangeCode(code: string, verifier: string, redirectUri: string) {
  const j = await tokenRequest({ code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!j.refresh_token) throw new Error("Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.");
  const t: Tokens = { refresh_token: j.refresh_token, access_token: j.access_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000, scope: j.scope };
  saveTokens(t);
  return t;
}

/** A valid access token, refreshed when needed. */
export async function getAccessToken(): Promise<string> {
  const t = loadTokens();
  if (!t) throw new Error("Not connected. Use Settings → Connect with Google, or run: pnpm research:cli auth");
  if (t.access_token && t.expires_at && t.expires_at > Date.now()) return t.access_token;
  const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  saveTokens({ ...t, access_token: j.access_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000 });
  return j.access_token;
}

// ---------- the flow (shared by CLI and dashboard) ----------
const pending = new Map<string, { verifier: string; redirectUri: string; expires: number }>();

/** Step 1: make the Google URL. `redirectUri` must be a loopback URL (127.0.0.1 / localhost). */
export function startAuth(redirectUri: string): { url: string; state: string } {
  if (!oauthConfigured()) throw new Error("Add your Google OAuth client first (Settings → Connect Google, or YOUTUBE_OAUTH_CLIENT_ID in .env).");
  if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(redirectUri)) throw new Error("Redirect must be a loopback URL.");
  for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
  const { verifier, challenge } = pkcePair();
  const state = randomBytes(16).toString("hex");
  pending.set(state, { verifier, redirectUri, expires: Date.now() + 10 * 60_000 });
  return { url: buildAuthUrl(redirectUri, challenge, state), state };
}

/** Step 2: Google sent us back. Exchange the code, then find out which channel was picked and use it. */
export async function finishAuth(state: string, code: string): Promise<ChannelInfo | null> {
  const p = pending.get(state);
  pending.delete(state);
  if (!p || p.expires < Date.now()) throw new Error("This login link expired or was not started here. Try again.");
  await exchangeCode(code, p.verifier, p.redirectUri);
  const me = await whoAmI();
  if (me) {
    upsertChannel(me, "youtube-api");
    setSetting("own_channel_id", me.id);
    setSetting("oauth_channel", JSON.stringify({ id: me.id, title: me.title, handle: me.handle }));
  }
  return me;
}

/** The channel the signed-in account picked (channels.list mine=true, 1 unit). */
export async function whoAmI(): Promise<ChannelInfo | null> {
  const token = await getAccessToken();
  assertQuota(COSTS.channels, "channels");
  const u = new URL("https://www.googleapis.com/youtube/v3/channels");
  u.search = new URLSearchParams({ part: "snippet,statistics,contentDetails", mine: "true" }).toString();
  const res = await fetch(u, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  recordQuota("channels", COSTS.channels, "mine=true");
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube error: ${j.error?.message ?? res.status}`);
  return j.items?.[0] ? mapChannel(j.items[0]) : null;
}

/** Forget the tokens here and revoke them at Google (best effort). */
export async function disconnect(): Promise<{ revoked: boolean }> {
  const t = loadTokens();
  let revoked = false;
  if (t) {
    try {
      const r = await fetch(REVOKE_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: t.refresh_token }), signal: AbortSignal.timeout(10_000) });
      revoked = r.ok;
    } catch {}
  }
  rmSync(tokenFile(), { force: true });
  deleteSetting("oauth_channel");
  return { revoked };
}

/** CLI: print the URL, wait for Google on a temporary 127.0.0.1 server. */
export async function runAuthFlow(print: (s: string) => void, timeoutMs = 5 * 60_000): Promise<ChannelInfo | null> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") return void res.writeHead(404).end();
      const page = (code: number, msg: string) => res.writeHead(code, { "content-type": "text/html; charset=utf-8" }).end(`<body style="font-family:sans-serif;background:#0B1023;color:#fff;padding:3rem"><h2>${msg.replace(/</g, "&lt;")}</h2><p>You can close this tab.</p></body>`);
      try {
        const err = url.searchParams.get("error");
        if (err) throw new Error(`Google said: ${err}`);
        const me = await finishAuth(url.searchParams.get("state") ?? "", url.searchParams.get("code") ?? "");
        page(200, `Connected${me ? ` to ${me.title}` : ""}.`);
        resolve(me);
      } catch (e) {
        page(400, e instanceof Error ? e.message : String(e));
        reject(e);
      } finally {
        server.close();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      try {
        const port = (server.address() as any).port;
        const { url } = startAuth(`http://127.0.0.1:${port}/callback`);
        print(`Open this URL in your browser and allow access (pick your YouTube channel):\n\n${url}\n\nWaiting for Google (5 minutes)...`);
      } catch (e) {
        server.close();
        reject(e);
      }
    });
    setTimeout(() => (reject(new Error("Timed out waiting for Google.")), server.close()), timeoutMs).unref();
  });
}

/** YouTube Analytics API v2 report for the signed-in channel. */
export async function analyticsReport(params: Record<string, string>) {
  const token = await getAccessToken();
  const u = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  u.search = new URLSearchParams({ ids: "channel==MINE", ...params }).toString();
  const res = await fetch(u, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube Analytics error: ${j.error?.message ?? res.status}`);
  return j as { columnHeaders: { name: string }[]; rows?: (string | number)[][] };
}

export const rowsToObjects = (r: { columnHeaders: { name: string }[]; rows?: (string | number)[][] }) => (r.rows ?? []).map((row) => Object.fromEntries(r.columnHeaders.map((h, i) => [h.name, row[i]])));
