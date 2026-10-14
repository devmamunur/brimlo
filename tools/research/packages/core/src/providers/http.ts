import { lookup } from "node:dns/promises";
import net from "node:net";
import { getDb } from "../db/client.ts";

/**
 * Polite HTTP for research sources:
 * - a clear User-Agent, a minimum gap per host, one retry on 429
 * - robots.txt is obeyed for page scraping (`robots: true`, the default)
 * - only public http(s) addresses (no localhost / private network), so a page cannot trick us into calling local services
 * Official, documented APIs (Steam Web API, Reddit OAuth API) pass `robots: false`.
 */

export const USER_AGENT = "BrimloResearch/0.2 (personal research tool; low volume)";
const UA_TOKEN = "brimloresearch";

const GAP_MS: Record<string, number> = {
  "store.steampowered.com": 1200,
  "api.steampowered.com": 700,
  "steamspy.com": 1100,
  "itch.io": 1500,
  "oauth.reddit.com": 700,
  "www.reddit.com": 1500,
};
const lastHit = new Map<string, number>();

export class BlockedError extends Error {}

// ---------- address safety ----------
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BlockedError(`Not a valid URL: ${raw}`);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new BlockedError("Only http and https URLs are allowed.");
  if (u.username || u.password) throw new BlockedError("URLs with a username or password are not allowed.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new BlockedError("Local addresses are not allowed.");
  const ips = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!ips.length || ips.some(isPrivateIp)) throw new BlockedError(`${host} points to a private or local address. Not allowed.`);
  return u;
}

// ---------- robots.txt ----------
interface Rule { allow: boolean; path: string }

/** Rules that apply to us: our own group if present, otherwise the `*` group. */
export function parseRobots(txt: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let cur: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && cur) {
      lastWasAgent = false;
      if (key === "disallow" && val === "") continue; // empty disallow = allow all
      cur.rules.push({ allow: key === "allow", path: val });
    } else lastWasAgent = false;
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && UA_TOKEN.includes(a.replace(/\*/g, ""))));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

function ruleMatches(rulePath: string, path: string): boolean {
  const anchored = rulePath.endsWith("$");
  const pattern = "^" + rulePath.replace(/\$$/, "").split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : "");
  return new RegExp(pattern).test(path);
}

/** Longest matching rule wins; Allow wins a tie. */
export function robotsAllows(rules: Rule[], pathAndQuery: string): boolean {
  let best: Rule | undefined;
  for (const r of rules) {
    if (!ruleMatches(r.path, pathAndQuery)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

const robotsCache = new Map<string, { rules: Rule[]; at: number }>();
async function robotsFor(origin: string): Promise<Rule[]> {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.rules;
  let rules: Rule[] = [];
  try {
    const { res: r } = await safeFetch(`${origin}/robots.txt`, {}, { robots: false, timeoutMs: 10_000, maxBytes: 512_000 });
    if (r.status === 401 || r.status === 403) rules = [{ allow: false, path: "/" }];
    else if (r.ok) rules = parseRobots(await readCapped(r, 512_000));
  } catch {
    rules = []; // unreachable robots.txt = no rules (standard behaviour)
  }
  robotsCache.set(origin, { rules, at: Date.now() });
  return rules;
}

// ---------- fetch ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_HOPS = 5;
export const DEFAULT_MAX_BYTES = 5_000_000;

export interface PoliteOptions extends RequestInit {
  robots?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Reserve the next request slot for a host. The slot lives in the shared SQLite file, so the dashboard API and
 * Claude's MCP server (two processes) take turns instead of each sending at full speed.
 */
async function waitTurn(host: string) {
  const override = process.env.BRIMLO_HTTP_GAP_MS;
  const gap = override !== undefined ? Number(override) : (GAP_MS[host] ?? 1000);
  if (gap <= 0) return;
  let at = Date.now();
  try {
    const db = getDb();
    db.exec("BEGIN IMMEDIATE");
    try {
      const row = db.prepare("SELECT next_ms FROM http_gate WHERE host = ?").get(host) as { next_ms: number } | undefined;
      at = Math.max(Date.now(), row?.next_ms ?? 0);
      db.prepare("INSERT INTO http_gate (host, next_ms) VALUES (?, ?) ON CONFLICT(host) DO UPDATE SET next_ms = excluded.next_ms").run(host, at + gap);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } catch {
    // database busy or unavailable: fall back to this process only
    at = Math.max(Date.now(), (lastHit.get(host) ?? 0) + gap);
  }
  lastHit.set(host, at);
  if (at > Date.now()) await sleep(at - Date.now());
}

/**
 * Follows redirects ourselves, one hop at a time, so EVERY hop is checked (public address + robots.txt)
 * BEFORE it is requested. Node's automatic redirects would request a private address first and check later.
 */
async function safeFetch(url: string, init: RequestInit, o: { robots: boolean; timeoutMs: number; maxBytes: number }): Promise<{ res: Response; finalUrl: string }> {
  let current = await assertPublicUrl(url);
  let method = (init.method ?? "GET").toUpperCase();
  let body = init.body;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (o.robots) {
      const rules = await robotsFor(current.origin);
      if (!robotsAllows(rules, current.pathname + current.search)) throw new BlockedError(`${current.host} does not allow automated access to ${current.pathname} (robots.txt). Open it in your browser instead.`);
    }
    const once = async () => {
      await waitTurn(current.hostname);
      return fetch(current, { ...init, method, body, headers: { "user-agent": USER_AGENT, "accept-language": "en-US,en;q=0.8", ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(o.timeoutMs), redirect: "manual" });
    };
    let res = await once();
    if (res.status === 429) {
      const after = Math.min(10, Number(res.headers.get("retry-after")) || 5);
      await sleep(after * 1000);
      res = await once();
    }
    const len = Number(res.headers.get("content-length"));
    if (len && len > o.maxBytes) throw new BlockedError(`Response is ${(len / 1e6).toFixed(1)} MB; the limit is ${(o.maxBytes / 1e6).toFixed(1)} MB.`);
    if (!REDIRECTS.has(res.status)) return { res, finalUrl: current.toString() };
    const loc = res.headers.get("location");
    if (!loc) return { res, finalUrl: current.toString() };
    await res.body?.cancel().catch(() => {});
    current = await assertPublicUrl(new URL(loc, current).toString());
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === "POST")) {
      method = "GET";
      body = undefined;
    }
  }
  throw new BlockedError(`Too many redirects (more than ${MAX_HOPS}).`);
}

/** Read a body but stop at `maxBytes`, so a huge or endless response cannot fill memory. */
export async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BlockedError(`Response is larger than ${(maxBytes / 1e6).toFixed(1)} MB.`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function politeFetchUrl(url: string, opts: PoliteOptions = {}): Promise<{ res: Response; finalUrl: string }> {
  const { robots = true, timeoutMs = 20_000, maxBytes = DEFAULT_MAX_BYTES, ...init } = opts;
  return safeFetch(url, init, { robots, timeoutMs, maxBytes });
}

export async function politeFetch(url: string, opts: PoliteOptions = {}): Promise<Response> {
  return (await politeFetchUrl(url, opts)).res;
}

export async function getJson<T = any>(url: string, opts: PoliteOptions = {}): Promise<T> {
  const { res } = await politeFetchUrl(url, opts);
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return JSON.parse(await readCapped(res, opts.maxBytes ?? DEFAULT_MAX_BYTES)) as T;
}

export async function getText(url: string, opts: PoliteOptions = {}): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const { res, finalUrl } = await politeFetchUrl(url, opts);
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return { text: await readCapped(res, opts.maxBytes ?? DEFAULT_MAX_BYTES), finalUrl, contentType: res.headers.get("content-type") ?? "" };
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
