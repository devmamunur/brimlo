#!/usr/bin/env tsx
import { formatEnvelope, runAuthFlow, tools } from "@brimlo/core";

/** `--flag`, `--flag value`, `--flag=value`. Anything else is positional. */
function parseCli(argv: string[]) {
  const values: Record<string, string | true> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) positionals.push(a);
    else if (a.includes("=")) values[a.slice(2, a.indexOf("="))] = a.slice(a.indexOf("=") + 1);
    else if (argv[i + 1] !== undefined && !argv[i + 1]!.startsWith("--")) values[a.slice(2)] = argv[++i]!;
    else values[a.slice(2)] = true;
  }
  return { values, positionals };
}

const { values, positionals } = parseCli(process.argv.slice(2));
const [cmd, ...rest] = positionals;
const wantJson = values.json === true || values.json === "true";

function usage() {
  console.log("Usage: brimlo-research <command> [main-arg] [--flag value] [--json]\n\nCommands:");
  for (const t of tools) console.log(`  ${t.name.padEnd(18)} ${t.description.split(". ")[0]}`);
  console.log("  auth               Connect your Google account (optional, for watch hours)");
  console.log('\nExample: brimlo-research keyword_research "incremental game" --limit 10 --estimate_only');
}

const coerce = (v: unknown) => {
  if (typeof v === "string" && /^[[{]/.test(v)) {
    try {
      return JSON.parse(v);
    } catch {}
  }
  return coerceScalar(v);
};
const coerceScalar = (v: unknown) => (v === "true" ? true : v === "false" ? false : typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : v);

if (cmd === "auth") {
  try {
    await runAuthFlow(console.log);
    console.log("\nConnected. Tokens saved in tools/research/data/oauth.json. Now run: pnpm research:cli own_channel");
    process.exit(0);
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

const tool = tools.find((t) => t.name === cmd?.replace(/-/g, "_"));
if (!tool) {
  usage();
  process.exit(cmd ? 1 : 0);
}

const input: Record<string, unknown> = {};
for (const [k, v] of Object.entries(values)) if (k !== "json") input[k] = coerce(v);
if (tool.primary && rest.length) input[tool.primary] = rest.join(" ");

try {
  const env = await tool.run(tool.schema.parse(input));
  console.log(wantJson ? JSON.stringify(env, null, 2) : formatEnvelope(env));
} catch (e) {
  console.error(`Error: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
