import { lookup } from "node:dns/promises";
import net from "node:net";

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
    const r = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(10_000), redirect: "follow" });
    if (r.status === 401 || r.status === 403) rules = [{ allow: false, path: "/" }];
    else if (r.ok) rules = parseRobots(await r.text());
  } catch {
    rules = []; // unreachable robots.txt = no rules (standard behaviour)
  }
  robotsCache.set(origin, { rules, at: Date.now() });
  return rules;
}

// ---------- fetch ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PoliteOptions extends RequestInit {
  robots?: boolean;
  timeoutMs?: number;
}

export async function politeFetch(url: string, opts: PoliteOptions = {}): Promise<Response> {
  const { robots = true, timeoutMs = 20_000, ...init } = opts;
  const u = await assertPublicUrl(url);
  if (robots) {
    const rules = await robotsFor(u.origin);
    if (!robotsAllows(rules, u.pathname + u.search)) throw new BlockedError(`${u.host} does not allow automated access to ${u.pathname} (robots.txt). Open it in your browser instead.`);
  }
  const gap = GAP_MS[u.hostname] ?? 1000;
  const wait = (lastHit.get(u.hostname) ?? 0) + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(u.hostname, Date.now());
  const doFetch = () => fetch(u, { ...init, headers: { "user-agent": USER_AGENT, "accept-language": "en-US,en;q=0.8", ...(init.headers as Record<string, string>) }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  let res = await doFetch();
  if (res.status === 429) {
    const after = Math.min(10, Number(res.headers.get("retry-after")) || 5);
    await sleep(after * 1000);
    lastHit.set(u.hostname, Date.now());
    res = await doFetch();
  }
  // a redirect must not end on a private address either
  if (res.url && res.url !== u.toString()) await assertPublicUrl(res.url);
  return res;
}

export async function getJson<T = any>(url: string, opts: PoliteOptions = {}): Promise<T> {
  const res = await politeFetch(url, opts);
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function getText(url: string, opts: PoliteOptions = {}): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const res = await politeFetch(url, opts);
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return { text: await res.text(), finalUrl: res.url || url, contentType: res.headers.get("content-type") ?? "" };
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
