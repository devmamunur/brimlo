const RESTART_HINT = "The API is running older code than this page. Restart it: press Ctrl+C in the terminal, then run pnpm research:dev.";

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    // A route or tool the page knows but the API does not = the API process is out of date.
    const stale = r.status === 404 && (j.error === "Unknown tool" || j.error === "Unknown API route" || /^Route .* not found$/.test(j.message ?? "") || (j.error === "Not found" && path.startsWith("/api/") && !/^\/api\/(keywords|videos|ideas)\//.test(path)));
    throw new Error(stale ? RESTART_HINT : (j.error ?? r.statusText));
  }
  return j as T;
}

export interface Envelope<T = any> {
  data: T;
  summary: string;
  source: string;
  fetched_at: string;
  cached: boolean;
  quota_used: number;
  warnings: string[];
}

export const runTool = <T = any>(name: string, input: Record<string, unknown> = {}) =>
  api<Envelope<T>>(`/api/tools/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });

export const post = <T = any>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const n = (x: number | null | undefined) => (x === null || x === undefined ? "–" : Math.round(x).toLocaleString("en-US"));
export const compact = (x: number | null | undefined) => (x === null || x === undefined ? "–" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(x));
export const ago = (iso: string | null | undefined) => {
  if (!iso) return "never";
  const min = (Date.now() - Date.parse(iso)) / 60000;
  if (min < 1) return "just now";
  if (min < 60) return `${Math.round(min)}m ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
};
