import { config } from "@brimlo/core";
import { createServer } from "./server.ts";

const port = Number(process.env.BRIMLO_API_PORT) || 8787;
const app = createServer();
await app.listen({ port, host: "127.0.0.1" });
console.log(`Brimlo Research API on http://127.0.0.1:${port} (${config().demo ? "DEMO" : "live"} mode)`);
