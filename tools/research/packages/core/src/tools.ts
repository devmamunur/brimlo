import { z } from "zod";
import { keywordInput, keywordResearch } from "./features/keywords.ts";
import { quotaStatus } from "./quota/guard.ts";
import type { Envelope } from "./result.ts";

/**
 * One registry. The CLI, the MCP server and the HTTP API all read this list.
 * Add a tool here and it shows up everywhere.
 */
export interface ToolDef {
  name: string;
  title: string;
  description: string;
  /** CLI: the first positional argument fills this field. */
  primary?: string;
  schema: z.ZodObject<any>;
  run: (input: any) => Promise<Envelope>;
}

const quotaTool: ToolDef = {
  name: "quota_status",
  title: "Quota status",
  description: "Free. Shows today's YouTube API quota use (units used, left, searches left, mode live/demo). Check this before expensive research.",
  schema: z.object({}),
  run: async () => {
    const s = quotaStatus();
    return {
      data: s,
      summary: `Quota ${s.used}/${s.limit} units (${s.percent}%), level ${s.level}. About ${s.searches_left} searches left before the 90% stop. Mode: ${s.mode}.`,
      source: "local",
      fetched_at: new Date().toISOString(),
      cached: false,
      quota_used: 0,
      warnings: s.level === "ok" ? [] : [`Quota level is ${s.level}.`],
    };
  },
};

export const tools: ToolDef[] = [
  {
    name: "keyword_research",
    title: "Keyword research",
    description:
      "Research a YouTube keyword: autocomplete suggestions (a–z + idle/incremental/game modifiers, free), top 50 ranking videos, competition score and opportunity score (0–100, estimates, formulas included). " +
      "Costs ~102 API units when fetched fresh (search=100), 0 when cached (24h). Use estimate_only to see the cost first.",
    primary: "query",
    schema: keywordInput,
    run: keywordResearch,
  },
  quotaTool,
];
