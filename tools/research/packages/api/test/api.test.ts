import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useMemoryDb } from "@brimlo/core";
import { createServer } from "../src/server.ts";

const app = createServer();
const H = { host: "127.0.0.1:8787" };
beforeAll(async () => {
  process.env.BRIMLO_DEMO = "1";
  useMemoryDb();
  await app.ready();
});
afterAll(() => app.close());

describe("api", () => {
  it("rejects non-local hosts and origins", async () => {
    expect((await app.inject({ url: "/api/health", headers: { host: "evil.example.com" } })).statusCode).toBe(403);
    expect((await app.inject({ url: "/api/health", headers: { ...H, origin: "https://evil.example.com" } })).statusCode).toBe(403);
    expect((await app.inject({ url: "/api/health", headers: { ...H, origin: "http://localhost:5173" } })).statusCode).toBe(200);
  });
  it("runs a tool through the shared registry and the data shows in DB views", async () => {
    const r = await app.inject({ method: "POST", url: "/api/tools/keyword_research", headers: H, payload: { query: "idle mining", limit: 3, expand: false } });
    expect(r.statusCode).toBe(200);
    expect(r.json().source).toBe("demo");
    const kws = (await app.inject({ url: "/api/keywords", headers: H })).json();
    expect(kws[0].query).toBe("idle mining");
    const detail = (await app.inject({ url: `/api/keywords/${kws[0].id}`, headers: H })).json();
    expect(detail.top_videos.length).toBeGreaterThan(0);
    const vid = (await app.inject({ url: `/api/videos/${detail.top_videos[0].id}`, headers: H })).json();
    expect(vid.video.title).toBeTruthy();
  });
  it("validates tool input and unknown tools", async () => {
    expect((await app.inject({ method: "POST", url: "/api/tools/keyword_research", headers: H, payload: { query: "x" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/api/tools/nope", headers: H, payload: {} })).statusCode).toBe(404);
  });
  it("ideas CRUD", async () => {
    const c = (await app.inject({ method: "POST", url: "/api/ideas", headers: H, payload: { title: "Rock Crusher", game: "Rock Crusher" } })).json();
    expect(c.status).toBe("idea");
    const u = (await app.inject({ method: "PATCH", url: `/api/ideas/${c.id}`, headers: H, payload: { status: "planned" } })).json();
    expect(u.status).toBe("planned");
    expect((await app.inject({ url: "/api/ideas", headers: H })).json()).toHaveLength(1);
    expect((await app.inject({ method: "DELETE", url: `/api/ideas/${c.id}`, headers: H })).json().deleted).toBe(true);
  });
  it("overview, settings, outliers, export", async () => {
    const o = (await app.inject({ url: "/api/overview", headers: H })).json();
    expect(o.ypp.subs.goal).toBe(1000);
    const s = (await app.inject({ url: "/api/settings", headers: H })).json();
    expect(s.mode).toBe("demo");
    expect(JSON.stringify(s)).not.toMatch(/AIza/);
    expect((await app.inject({ url: "/api/outliers?min_multiplier=1&max_subs=0", headers: H })).statusCode).toBe(200);
    const csv = await app.inject({ url: "/api/export?table=videos&format=csv", headers: H });
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.body.split("\n")[0]).toContain("title");
    expect((await app.inject({ url: "/api/export?table=users", headers: H })).statusCode).toBe(400);
  });
});

describe("api: Google connection", () => {
  it("saves the client without echoing the secret, starts on the same host, and handles a bad callback", async () => {
    const os = await import("node:os");
    const fs = await import("node:fs");
    const p = await import("node:path");
    const dir = fs.mkdtempSync(p.join(os.tmpdir(), "brimlo-api-oauth-"));
    process.env.BRIMLO_OAUTH_CLIENT_FILE = p.join(dir, "client.json");
    process.env.BRIMLO_OAUTH_FILE = p.join(dir, "oauth.json");
    const bad = await app.inject({ method: "POST", url: "/api/oauth/client", headers: H, payload: { client_id: "x", client_secret: "y" } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toMatch(/googleusercontent/);
    const ok = await app.inject({ method: "POST", url: "/api/oauth/client", headers: H, payload: { client_id: "1-a.apps.googleusercontent.com", client_secret: "GOCSPX-abcdefghij" } });
    expect(ok.statusCode).toBe(200);
    expect(ok.body).not.toContain("GOCSPX");
    const start = (await app.inject({ method: "POST", url: "/api/oauth/start", headers: { host: "localhost:5173" }, payload: {} })).json();
    expect(new URL(start.url).searchParams.get("redirect_uri")).toBe("http://localhost:5173/api/oauth/callback");
    const cb = await app.inject({ url: "/api/oauth/callback?state=wrong&code=x", headers: H });
    expect(cb.statusCode).toBe(302);
    expect(cb.headers.location).toMatch(/^\/#\/settings\?oauth=error/);
    const denied = await app.inject({ url: "/api/oauth/callback?error=access_denied", headers: H });
    expect(denied.headers.location).toContain("access_denied");
  });
});

describe("api: automation", () => {
  it("reads and updates automation settings, rejects bad input with 400", async () => {
    const a = (await app.inject({ url: "/api/automation", headers: H })).json();
    expect(a).toMatchObject({ auto_daily: true, daily_hour: 9, budget_units: 300 });
    expect(a.plan.steps).toHaveLength(6);
    const b = (await app.inject({ method: "PATCH", url: "/api/automation", headers: H, payload: { auto_daily: false, daily_hour: 20, budget_units: 150 } })).json();
    expect(b).toMatchObject({ auto_daily: false, daily_hour: 20, budget_units: 150 });
    expect((await app.inject({ method: "PATCH", url: "/api/automation", headers: H, payload: { daily_hour: 30 } })).statusCode).toBe(400);
  });
});
