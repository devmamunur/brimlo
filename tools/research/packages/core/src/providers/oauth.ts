import { createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { RESEARCH_ROOT } from "../config.ts";

/**
 * Google OAuth for installed apps (loopback + PKCE). Read-only scopes.
 * Tokens are stored in data/oauth.json (gitignored, mode 600).
 */

export const SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly", "https://www.googleapis.com/auth/youtube.readonly"];
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const tokenFile = () => process.env.BRIMLO_OAUTH_FILE || path.join(RESEARCH_ROOT, "data", "oauth.json");

export interface Tokens {
  refresh_token: string;
  access_token?: string;
  expires_at?: number;
  scope?: string;
}

export const clientCreds = () => ({ id: process.env.YOUTUBE_OAUTH_CLIENT_ID?.trim() ?? "", secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET?.trim() ?? "" });
export const oauthConfigured = () => Boolean(clientCreds().id);
export const oauthConnected = () => existsSync(tokenFile());

export function pkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(redirectUri: string, challenge: string, state: string) {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({ client_id: clientCreds().id, redirect_uri: redirectUri, response_type: "code", scope: SCOPES.join(" "), code_challenge: challenge, code_challenge_method: "S256", state, access_type: "offline", prompt: "consent" }).toString();
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

export function saveTokens(t: Tokens) {
  mkdirSync(path.dirname(tokenFile()), { recursive: true });
  writeFileSync(tokenFile(), JSON.stringify(t, null, 2), { mode: 0o600 });
  chmodSync(tokenFile(), 0o600);
}
export const loadTokens = (): Tokens | undefined => (oauthConnected() ? (JSON.parse(readFileSync(tokenFile(), "utf8")) as Tokens) : undefined);

export async function exchangeCode(code: string, verifier: string, redirectUri: string) {
  const j = await tokenRequest({ code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!j.refresh_token) throw new Error("Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and run auth again.");
  const t: Tokens = { refresh_token: j.refresh_token, access_token: j.access_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000, scope: j.scope };
  saveTokens(t);
  return t;
}

/** A valid access token, refreshed when needed. */
export async function getAccessToken(): Promise<string> {
  const t = loadTokens();
  if (!t) throw new Error("Not connected. Run: pnpm research:cli auth");
  if (t.access_token && t.expires_at && t.expires_at > Date.now()) return t.access_token;
  const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  saveTokens({ ...t, access_token: j.access_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 - 60_000 });
  return j.access_token;
}

/** Interactive: print the URL, wait for Google to call back on 127.0.0.1. */
export async function runAuthFlow(print: (s: string) => void, timeoutMs = 5 * 60_000): Promise<Tokens> {
  if (!oauthConfigured()) throw new Error("Set YOUTUBE_OAUTH_CLIENT_ID (and YOUTUBE_OAUTH_CLIENT_SECRET) in tools/research/.env first. See README, 'Connect your own channel'.");
  const { verifier, challenge } = pkcePair();
  const state = randomBytes(16).toString("hex");
  return new Promise<Tokens>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") return void res.writeHead(404).end();
      const done = (code: number, msg: string) => res.writeHead(code, { "content-type": "text/html; charset=utf-8" }).end(`<body style="font-family:sans-serif;background:#0B1023;color:#fff;padding:3rem"><h2>${msg}</h2><p>You can close this tab.</p></body>`);
      if (url.searchParams.get("state") !== state) return void (done(400, "State mismatch. Try again."), reject(new Error("State mismatch")), server.close());
      const err = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (err || !code) return void (done(400, `Google said: ${err ?? "no code"}`), reject(new Error(`Google said: ${err ?? "no code"}`)), server.close());
      try {
        const port = (server.address() as any).port;
        const t = await exchangeCode(code, verifier, `http://127.0.0.1:${port}/callback`);
        done(200, "Connected. Brimlo Research can now read your channel analytics.");
        resolve(t);
      } catch (e) {
        done(500, "Token exchange failed. See the terminal.");
        reject(e);
      } finally {
        server.close();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as any).port;
      print(`Open this URL in your browser and allow access:\n\n${buildAuthUrl(`http://127.0.0.1:${port}/callback`, challenge, state)}\n\nWaiting for Google (5 minutes)...`);
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
