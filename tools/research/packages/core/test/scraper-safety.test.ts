import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, pruneCache, useMemoryDb } from "../src/db/client.ts";
import { BlockedError, getText } from "../src/providers/http.ts";

beforeEach(() => {
  process.env.BRIMLO_HTTP_GAP_MS = "0";
  useMemoryDb();
});
afterEach(() => vi.unstubAllGlobals());

/** Fake web: map of url → Response factory. Records every URL actually requested. */
function fakeWeb(routes: Record<string, () => Response>) {
  const requested: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: any) => {
    const url = String(u);
    requested.push(url);
    const r = routes[url];
    return r ? r() : new Response("not found", { status: 404 });
  }));
  return requested;
}
const redirect = (to: string, status = 302) => () => new Response(null, { status, headers: { location: to } });
const html = (body: string, headers: Record<string, string> = {}) => () => new Response(body, { status: 200, headers: { "content-type": "text/html", ...headers } });

describe("redirect safety", () => {
  it("never requests a private address, even through a redirect", async () => {
    const requested = fakeWeb({ "https://8.8.8.8/go": redirect("http://127.0.0.1:8787/api/settings") });
    await expect(getText("https://8.8.8.8/go")).rejects.toBeInstanceOf(BlockedError);
    expect(requested.some((u) => u.includes("127.0.0.1"))).toBe(false);
  });
  it("checks robots.txt on the redirect target before requesting it", async () => {
    const requested = fakeWeb({
      "https://8.8.8.8/go": redirect("https://1.1.1.1/private/page"),
      "https://1.1.1.1/robots.txt": () => new Response("User-agent: *\nDisallow: /private", { status: 200 }),
    });
    await expect(getText("https://8.8.8.8/go")).rejects.toThrow(/robots\.txt/);
    expect(requested).not.toContain("https://1.1.1.1/private/page");
  });
  it("follows a normal redirect and reports the final URL", async () => {
    fakeWeb({ "https://8.8.8.8/old": redirect("/new", 301), "https://8.8.8.8/new": html("<p>hi</p>") });
    const r = await getText("https://8.8.8.8/old");
    expect(r.finalUrl).toBe("https://8.8.8.8/new");
    expect(r.text).toBe("<p>hi</p>");
  });
  it("stops redirect loops", async () => {
    fakeWeb({ "https://8.8.8.8/a": redirect("/b"), "https://8.8.8.8/b": redirect("/a") });
    await expect(getText("https://8.8.8.8/a")).rejects.toThrow(/Too many redirects/);
  });
});

describe("size limits", () => {
  it("refuses a response whose Content-Length is too big, before reading it", async () => {
    fakeWeb({ "https://8.8.8.8/big": html("x", { "content-length": "999999999" }) });
    await expect(getText("https://8.8.8.8/big", { maxBytes: 1000 })).rejects.toThrow(/MB/);
  });
  it("stops reading a stream that grows past the limit", async () => {
    fakeWeb({ "https://8.8.8.8/stream": () => new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(4096)); } }), { status: 200 }) });
    await expect(getText("https://8.8.8.8/stream", { maxBytes: 50_000 })).rejects.toThrow(/larger than/);
  });
});

describe("cache cleanup", () => {
  it("drops only expired rows", () => {
    const db = getDb();
    const now = Date.now();
    db.prepare("INSERT INTO cache (key, value, fetched_at, ttl_sec, source) VALUES (?,?,?,?,?)").run("old", "1", now - 2 * 86400_000, 86400, "t");
    db.prepare("INSERT INTO cache (key, value, fetched_at, ttl_sec, source) VALUES (?,?,?,?,?)").run("fresh", "1", now, 86400, "t");
    expect(pruneCache(db, now)).toBe(1);
    expect((db.prepare("SELECT key FROM cache").all() as any[]).map((r) => r.key)).toEqual(["fresh"]);
  });
});
