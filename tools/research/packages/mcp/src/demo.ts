/**
 * End-to-end demo: acts like Claude Code. Starts the MCP server over stdio and runs a small research session.
 *   pnpm research:demo "idle mining game"
 * Cost: up to ~204 units on a cold topic, 0 when cached. Uses demo data if there is no API key.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const topic = process.argv[2] ?? "idle mining game";

// Candidate titles written with playbook/titles.md templates (A, B, D, C, E).
const TITLES = [
  "The mining incremental game where you dig until the numbers BREAK",
  "I Turned One Tiny Pickaxe into a BILLION Dollar Mine",
  "A Game Where You Mine the Whole Planet and It's ADDICTIVE!",
  "I 100% the Idle Mining Game Where Every Rock Pays You",
  "Will This Tiny Mine Dig Through the Earth in This Incremental Game?",
];

const client = new Client({ name: "demo", version: "0" });
await client.connect(new StdioClientTransport({ command: path.join(root, "node_modules/.bin/tsx"), args: [path.join(root, "packages/mcp/src/index.ts")], env: process.env as Record<string, string> }));

async function call(name: string, args: Record<string, unknown> = {}) {
  const res: any = await client.callTool({ name: `brimlo_${name}`, arguments: args });
  if (res.isError) throw new Error(res.content[0].text);
  const text: string = res.content[0].text;
  const meta = JSON.parse(text.trim().split("\n").pop()!);
  const json = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]!);
  return { summary: text.split("\n")[0]!, data: json, meta };
}
const line = (label: string, r: { summary: string; meta: any }) => console.log(`\n▶ ${label}\n  ${r.summary}\n  [source ${r.meta.source} · cached ${r.meta.cached} · ${r.meta.quota_used} units]`);

console.log(`Brimlo research demo for "${topic}"`);
const tools = await client.listTools();
console.log(`MCP tools available: ${tools.tools.length} (${tools.tools.slice(0, 6).map((t) => t.name.replace("brimlo_", "")).join(", ")}, …)`);

line("quota_status", await call("quota_status"));
const est = await call("keyword_research", { query: topic, estimate_only: true });
line("keyword_research (estimate only)", est);
const kw = await call("keyword_research", { query: topic, limit: 5 });
line("keyword_research", kw);
console.log("  top suggestions:", kw.data.suggestions.map((s: any) => s.text).join(" · "));
const out = await call("outliers", { query: topic, days: 90, min_multiplier: 5, limit: 5 });
line("outliers (small channels)", out);
for (const o of out.data.outliers) console.log(`  ${String(o.multiplier).padStart(5)}×  ${o.views.toLocaleString("en-US").padStart(10)} views  ${o.channel_subs.toLocaleString("en-US").padStart(8)} subs  ${o.title}`);
const pat = await call("title_patterns", { query: topic });
line("title_patterns", pat);
const sc = await call("score_title", { titles: TITLES, keyword: "incremental" });
line("score_title (5 candidate titles)", sc);
for (const r of sc.data.results.sort((a: any, b: any) => b.score - a.score)) console.log(`  ${String(r.score).padStart(3)}  [${r.template ?? "-"}]  ${r.title}\n        top fix: ${r.fixes[0] ?? "none"}`);
console.log(`\n✔ Best title: "${sc.data.best}"`);
await client.close();
