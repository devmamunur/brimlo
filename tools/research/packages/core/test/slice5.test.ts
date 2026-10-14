import { mkdtempSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { overview } from "../src/dashboard.ts";
import { ownChannel } from "../src/features/ownChannel.ts";
import { analyticsReport, buildAuthUrl, SCOPES, exchangeCode, getAccessToken, loadTokens, pkcePair, rowsToObjects, saveTokens } from "../src/providers/oauth.ts";
import { demoProvider } from "../src/providers/demo.ts";

beforeEach(() => {
  process.env.BRIMLO_DEMO = "1";
  process.env.BRIMLO_OAUTH_FILE = path.join(mkdtempSync(path.join(os.tmpdir(), "brimlo-oauth-")), "oauth.json");
  process.env.YOUTUBE_OAUTH_CLIENT_ID = "cid.apps.googleusercontent.com";
  process.env.YOUTUBE_OAUTH_CLIENT_SECRET = "csecret";
  useMemoryDb();
});
afterEach(() => vi.unstubAllGlobals());

const mockFetch = (handler: (url: string, init?: RequestInit) => any) =>
  vi.stubGlobal("fetch", vi.fn(async (url: any, init?: RequestInit) => {
    const body = handler(String(url), init);
    return { ok: body.__status ? body.__status < 400 : true, status: body.__status ?? 200, json: async () => body, statusText: "x" } as Response;
  }));

describe("oauth", () => {
  it("PKCE challenge is the base64url SHA-256 of the verifier", () => {
    const { verifier, challenge } = pkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });
  it("auth URL has read-only scopes, loopback redirect, S256 and offline access", () => {
    const u = new URL(buildAuthUrl("http://127.0.0.1:5555/callback", "chal", "st"));
    expect(u.searchParams.get("scope")).toContain("yt-analytics.readonly");
    expect(SCOPES.every((x) => x.endsWith(".readonly"))).toBe(true);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:5555/callback");
  });
  it("exchanges a code and stores tokens with mode 600", async () => {
    mockFetch(() => ({ refresh_token: "r1", access_token: "a1", expires_in: 3600 }));
    await exchangeCode("code", "verifier", "http://127.0.0.1:1/callback");
    expect(loadTokens()?.refresh_token).toBe("r1");
    expect(statSync(process.env.BRIMLO_OAUTH_FILE!).mode & 0o777).toBe(0o600);
  });
  it("refreshes an expired access token and keeps the refresh token", async () => {
    saveTokens({ refresh_token: "r1", access_token: "old", expires_at: Date.now() - 1000 });
    mockFetch((_u, init) => (String(init?.body).includes("grant_type=refresh_token") ? { access_token: "new", expires_in: 3600 } : {}));
    expect(await getAccessToken()).toBe("new");
    expect(JSON.parse(readFileSync(process.env.BRIMLO_OAUTH_FILE!, "utf8")).refresh_token).toBe("r1");
  });
  it("uses a valid cached access token without calling Google", async () => {
    saveTokens({ refresh_token: "r1", access_token: "ok", expires_at: Date.now() + 600_000 });
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await getAccessToken()).toBe("ok");
    expect(f).not.toHaveBeenCalled();
  });
  it("not connected gives a clear error", async () => {
    await expect(getAccessToken()).rejects.toThrow(/Run: pnpm research:cli auth/);
  });
  it("analytics rows become objects", async () => {
    saveTokens({ refresh_token: "r", access_token: "a", expires_at: Date.now() + 600_000 });
    mockFetch((u) => (u.includes("youtubeanalytics") ? { columnHeaders: [{ name: "video" }, { name: "views" }], rows: [["abc", 12]] } : {}));
    expect(rowsToObjects(await analyticsReport({ metrics: "views" }))).toEqual([{ video: "abc", views: 12 }]);
  });
});

describe("own_channel + overview (demo)", () => {
  it("returns YPP progress, saves a snapshot, and says CTR is not available", async () => {
    const env = await ownChannel({ days: 28, refresh: false }, { yt: demoProvider });
    const d: any = env.data;
    expect(d.ypp.subscribers.goal).toBe(1000);
    expect(d.ypp.watch_hours.value).toBeNull();
    expect(d.not_available).toMatch(/CTR/);
    const o = overview();
    expect(o.own_latest.subscribers).toBe(d.public.subscribers);
    expect(o.ypp.watch_hours.goal).toBe(8000);
  });
});
