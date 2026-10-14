import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { formatEnvelope, tools } from "@brimlo/core";

// stdout belongs to the MCP protocol. Never console.log here.
const server = new McpServer({ name: "brimlo-research", version: "0.1.0" });

for (const t of tools) {
  server.registerTool(
    `brimlo_${t.name}`,
    { title: t.title, description: t.description, inputSchema: t.schema.shape },
    async (input: unknown) => {
      try {
        const env = await t.run(t.schema.parse(input));
        return { content: [{ type: "text" as const, text: formatEnvelope(env) }] };
      } catch (e) {
        return { isError: true, content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }] };
      }
    },
  );
}

await server.connect(new StdioServerTransport());
