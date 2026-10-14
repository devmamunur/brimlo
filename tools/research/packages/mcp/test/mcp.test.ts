import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
let client: Client;

beforeAll(async () => {
  const transport = new StdioClientTransport({
    command: path.join(root, "node_modules/.bin/tsx"),
    args: [path.join(root, "packages/mcp/src/index.ts")],
    // Own demo DB so the test never touches real data.
    env: { ...(process.env as Record<string, string>), BRIMLO_DEMO: "1", BRIMLO_DB: ":memory:" },
  });
  client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
});
afterAll(() => client.close());

describe("brimlo MCP server", () => {
  it("lists brimlo_* tools with descriptions", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("brimlo_keyword_research");
    expect(names).toContain("brimlo_quota_status");
    expect(tools.every((t) => t.description)).toBe(true);
  });
  it("runs quota_status and ends with the footer", async () => {
    const res: any = await client.callTool({ name: "brimlo_quota_status", arguments: {} });
    const text = res.content[0].text as string;
    expect(text).toContain("Quota 0/");
    expect(text.trim().split("\n").pop()).toMatch(/"quota_used":0/);
  });
  it("runs keyword_research (demo) and rejects bad input", async () => {
    const ok: any = await client.callTool({ name: "brimlo_keyword_research", arguments: { query: "idle mining game", limit: 3 } });
    expect(ok.content[0].text).toContain("DEMO DATA");
    const last = JSON.parse(ok.content[0].text.trim().split("\n").pop());
    expect(last).toMatchObject({ source: "demo", cached: false, quota_used: 0 });
    const bad: any = await client.callTool({ name: "brimlo_keyword_research", arguments: { query: "x" } });
    expect(bad.isError).toBe(true);
  });
});
