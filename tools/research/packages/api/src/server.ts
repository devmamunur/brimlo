import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import {
  competitorsList, deleteIdea, exportTable, exportTables, IDEA_STATUSES, keywordDetail, listIdeas, listKeywords,
  outliersFromDb, overview, recentSearches, saveIdea, settingsInfo, tools, updateIdea, videoDetail, config, type ExportTable,
  startAuth, finishAuth, disconnect, saveClient, removeClient, oauthSummary, saveRedditClient, removeRedditClient,
  getSetting, setSetting, lastRuns, dailyPlan, DEFAULT_DAILY_BUDGET, listWatch, listBackups,
} from "@brimlo/core";
import Fastify from "fastify";
import { z } from "zod";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function createServer() {
  const app = Fastify({ logger: false });

  // The API can spend YouTube quota. Only accept requests from this computer (blocks DNS-rebinding and other websites).
  app.addHook("onRequest", async (req, reply) => {
    if (!LOCAL_HOST.test(req.headers.host ?? "")) return reply.code(403).send({ error: "Local requests only." });
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (!LOCAL_HOST.test(new URL(origin).host)) return reply.code(403).send({ error: "Origin not allowed." });
      } catch {
        return reply.code(403).send({ error: "Bad origin." });
      }
    }
  });

  app.setErrorHandler((err: any, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    return reply.code(err.statusCode && err.statusCode < 500 ? err.statusCode : 500).send({ error: err.message ?? String(err) });
  });

  app.get("/api/health", async () => ({ ok: true, mode: config().demo ? "demo" : "live" }));
  app.get("/api/overview", async () => overview());
  app.get("/api/settings", async () => settingsInfo());
  app.get("/api/searches", async () => recentSearches());

  // ----- tools: the same registry that CLI and MCP use -----
  app.get("/api/tools", async () => tools.map((t) => ({ name: t.name, title: t.title, description: t.description, primary: t.primary ?? null })));
  app.post<{ Params: { name: string } }>("/api/tools/:name", async (req, reply) => {
    const t = tools.find((x) => x.name === req.params.name);
    if (!t) return reply.code(404).send({ error: "Unknown tool" });
    try {
      return await t.run(t.schema.parse(req.body ?? {}));
    } catch (e) {
      return reply.code(400).send({ error: e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e instanceof Error ? e.message : String(e) });
    }
  });

  // ----- read-only database views (cost no quota) -----
  app.get("/api/keywords", async () => listKeywords());
  app.get<{ Params: { id: string } }>("/api/keywords/:id", async (req, reply) => keywordDetail(Number(req.params.id)) ?? reply.code(404).send({ error: "Not found" }));
  app.get<{ Params: { id: string } }>("/api/videos/:id", async (req, reply) => videoDetail(req.params.id) ?? reply.code(404).send({ error: "Not found" }));
  app.get("/api/competitors", async () => (await competitorsList()).data);

  const outQuery = z.object({
    days: z.coerce.number().int().min(1).max(365).default(90),
    min_multiplier: z.coerce.number().min(1).default(5),
    max_subs: z.coerce.number().int().min(0).default(50_000),
    include_shorts: z.enum(["true", "false"]).default("false"),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  });
  app.get("/api/outliers", async (req) => {
    const q = outQuery.parse(req.query);
    return outliersFromDb({ days: q.days, minMultiplier: q.min_multiplier, maxSubs: q.max_subs, includeShorts: q.include_shorts === "true", liveOnly: !config().demo, limit: q.limit });
  });

  // ----- ideas -----
  const ideaBody = z.object({ title: z.string().min(3), game: z.string().nullable().optional(), status: z.enum(IDEA_STATUSES).optional(), evidence: z.any().optional() });
  app.get("/api/ideas", async () => listIdeas());
  app.post("/api/ideas", async (req) => saveIdea(ideaBody.parse(req.body)));
  app.patch<{ Params: { id: string } }>("/api/ideas/:id", async (req, reply) => updateIdea(Number(req.params.id), ideaBody.partial().parse(req.body)) ?? reply.code(404).send({ error: "Not found" }));
  app.delete<{ Params: { id: string } }>("/api/ideas/:id", async (req) => ({ deleted: deleteIdea(Number(req.params.id)) }));

  // ----- Google connection (OAuth) -----
  app.post("/api/oauth/client", async (req, reply) => {
    const b = z.object({ client_id: z.string(), client_secret: z.string() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "client_id and client_secret are required." });
    try {
      saveClient(b.data.client_id, b.data.client_secret);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
    return oauthSummary(); // never echoes the secret
  });
  app.delete("/api/oauth/client", async () => (removeClient(), oauthSummary()));
  app.post("/api/oauth/start", async (req, reply) => {
    // Google sends the browser back to the same host the dashboard runs on (Vite proxies /api in dev).
    try {
      return { url: startAuth(`http://${req.headers.host}/api/oauth/callback`).url };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });
  app.get<{ Querystring: { state?: string; code?: string; error?: string } }>("/api/oauth/callback", async (req, reply) => {
    const back = (q: Record<string, string>) => reply.redirect(`/#/settings?${new URLSearchParams(q)}`);
    if (req.query.error) return back({ oauth: "error", msg: `Google said: ${req.query.error}` });
    try {
      const me = await finishAuth(req.query.state ?? "", req.query.code ?? "");
      return back({ oauth: "ok", channel: me?.title ?? "" });
    } catch (e) {
      return back({ oauth: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  });
  app.post("/api/oauth/disconnect", async () => ({ ...(await disconnect()), ...oauthSummary() }));

  // ----- Reddit (official API, optional) -----
  app.post("/api/reddit/client", async (req, reply) => {
    const b = z.object({ client_id: z.string(), client_secret: z.string() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "client_id and client_secret are required." });
    try {
      saveRedditClient(b.data.client_id, b.data.client_secret);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
    return { configured: true };
  });
  app.delete("/api/reddit/client", async () => (removeRedditClient(), { configured: false }));

  // ----- automation -----
  const automation = () => {
    const budget = Number(getSetting("daily_budget")) || DEFAULT_DAILY_BUDGET;
    const health = getSetting("health_last");
    return {
      auto_daily: getSetting("auto_daily") !== "off",
      daily_hour: Number(getSetting("daily_hour") ?? 9),
      budget_units: budget,
      plan: dailyPlan(budget),
      runs: lastRuns(10),
      watchlist: listWatch(),
      backups: listBackups().slice(0, 10),
      health_last: health ? JSON.parse(health) : null,
    };
  };
  app.get("/api/automation", async () => automation());
  app.patch("/api/automation", async (req) => {
    const b = z.object({ auto_daily: z.boolean().optional(), daily_hour: z.number().int().min(0).max(23).optional(), budget_units: z.number().int().min(10).max(3000).optional() }).parse(req.body);
    if (b.auto_daily !== undefined) setSetting("auto_daily", b.auto_daily ? "on" : "off");
    if (b.daily_hour !== undefined) setSetting("daily_hour", String(b.daily_hour));
    if (b.budget_units !== undefined) setSetting("daily_budget", String(b.budget_units));
    return automation();
  });

    // ----- export -----
  app.get<{ Querystring: { table?: string; format?: string } }>("/api/export", async (req, reply) => {
    const table = req.query.table as ExportTable;
    if (!exportTables.includes(table)) return reply.code(400).send({ error: `table must be one of: ${exportTables.join(", ")}` });
    const format = req.query.format === "json" ? "json" : "csv";
    const out = exportTable(table, format);
    return reply.header("content-type", `${out.type}; charset=utf-8`).header("content-disposition", `attachment; filename="brimlo-${table}.${format}"`).send(out.body);
  });

  // ----- built dashboard (production) -----
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/dashboard/dist");
  if (existsSync(dist)) {
    app.register(fastifyStatic, { root: dist });
    app.setNotFoundHandler((req, reply) => (req.url.startsWith("/api/") ? reply.code(404).send({ error: "Not found" }) : reply.sendFile("index.html")));
  }
  return app;
}
