export interface Envelope<T = unknown> {
  data: T;
  summary: string;
  source: string;
  fetched_at: string;
  cached: boolean;
  quota_used: number;
  warnings: string[];
}

/** Text that Claude (MCP) and the CLI print: summary, data, then the footer. */
export function formatEnvelope(env: Envelope): string {
  const { data, summary, ...footer } = env;
  const { warnings, ...meta } = footer;
  return [
    summary,
    warnings.length ? warnings.map((w) => `⚠ ${w}`).join("\n") : "",
    "```json\n" + JSON.stringify(data, null, 2) + "\n```",
    JSON.stringify(meta),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Envelope for sources that do not use YouTube quota. */
export function localEnvelope<T>(data: T, summary: string, source: string, o: { cached?: boolean; fetchedAt?: string; warnings?: string[] } = {}): Envelope<T> {
  return { data, summary, source, fetched_at: o.fetchedAt ?? new Date().toISOString(), cached: o.cached ?? false, quota_used: 0, warnings: o.warnings ?? [] };
}
