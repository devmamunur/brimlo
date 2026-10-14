import { existsSync, mkdtempSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { oauthSummary, ownChannelSummary } from "../src/dashboard.ts";
import { ownChannelSet } from "../src/features/ownChannel.ts";
import { clientCreds, disconnect, finishAuth, saveClient, saveTokens, startAuth } from "../src/providers/oauth.ts";
import { demoProvider } from "../src/providers/demo.ts";
import { DEFAULT_OWN_CHANNEL_ID, getSetting, ownChannelId } from "../src/settings.ts";

beforeEach(() => {
  useMemoryDb();
  const dir = mkdtempSync(path.join(os.tmpdir(), "brimlo-conn-"));
  process.env.BRIMLO_OAUTH_FILE = path.join(dir, "oauth.json");
  process.env.BRIMLO_OAUTH_CLIENT_FILE = path.join(dir, "client.json");
  delete process.env.YOUTUBE_OAUTH_CLIENT_ID;
  delete process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  delete process.env.YOUTUBE_OWN_CHANNEL;
  process.env.BRIMLO_DEMO = "1";
});
afterEach(() => vi.unstubAllGlobals());

const googleMock = (calls: string[] = []) =>
  vi.stubGlobal("fetch", vi.fn(async (url: any) => {
    const u = String(url);
    calls.push(u);
    const body = u.includes("oauth2.googleapis.com/token") ? { refresh_token: "r1", access_token: "a1", expires_in: 3600 }
      : u.includes("channels") ? { items: [{ id: "UCmine000000000000000000", snippet: { title: "Brimlo", customUrl: "@brimloidle" }, statistics: { subscriberCount: "7", videoCount: "3", viewCount: "90" }, contentDetails: { relatedPlaylists: { uploads: "UUmine" } } }] }
      : {};
    return { ok: true, status: 200, json: async () => body } as any;
  }));

describe("my channel", () => {
  it("defaults to Brimlo, then follows own_channel_set, and .env wins", async () => {
    expect(ownChannelId()).toBe(DEFAULT_OWN_CHANNEL_ID);
    const env = await ownChannelSet({ channel: "@somechannel" }, { yt: demoProvider });
    expect(ownChannelId()).toBe((env.data as any).channel.id);
    expect(ownChannelSummary().source).toBe("chosen");
    process.env.YOUTUBE_OWN_CHANNEL = "UCenv0000000000000000000";
    expect(ownChannelId()).toBe("UCenv0000000000000000000");
    expect(ownChannelSummary().source).toBe("env");
  });
});

describe("Google connection from the dashboard", () => {
  it("validates and stores the OAuth client privately", () => {
    expect(() => saveClient("not-a-client", "secret12345")).toThrow(/apps.googleusercontent.com/);
    saveClient("123-abc.apps.googleusercontent.com", "GOCSPX-secret-123");
    expect(clientCreds()).toMatchObject({ id: "123-abc.apps.googleusercontent.com", source: "dashboard" });
    expect(statSync(process.env.BRIMLO_OAUTH_CLIENT_FILE!).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(oauthSummary())).not.toContain("GOCSPX");
  });
  it("needs a client before starting, and only loopback redirects", () => {
    expect(() => startAuth("http://127.0.0.1:8787/api/oauth/callback")).toThrow(/OAuth client/);
    saveClient("123-abc.apps.googleusercontent.com", "GOCSPX-secret-123");
    expect(() => startAuth("https://evil.example.com/cb")).toThrow(/loopback/);
    const { url } = startAuth("http://127.0.0.1:8787/api/oauth/callback");
    expect(new URL(url).searchParams.get("redirect_uri")).toBe("http://127.0.0.1:8787/api/oauth/callback");
  });
  it("finishing the login saves tokens and makes the picked channel mine", async () => {
    saveClient("123-abc.apps.googleusercontent.com", "GOCSPX-secret-123");
    const { state } = startAuth("http://127.0.0.1:8787/api/oauth/callback");
    googleMock();
    const me = await finishAuth(state, "code123");
    expect(me?.title).toBe("Brimlo");
    expect(ownChannelId()).toBe("UCmine000000000000000000");
    expect(oauthSummary()).toMatchObject({ connected: true, connected_channel: { title: "Brimlo" }, mismatch: false });
    await expect(finishAuth(state, "code123")).rejects.toThrow(/expired|not started/); // state is single-use
  });
  it("rejects an unknown state", async () => {
    saveClient("123-abc.apps.googleusercontent.com", "GOCSPX-secret-123");
    await expect(finishAuth("nope", "code")).rejects.toThrow(/expired|not started/);
  });
  it("flags a mismatch when my channel is changed after connecting", async () => {
    saveClient("123-abc.apps.googleusercontent.com", "GOCSPX-secret-123");
    const { state } = startAuth("http://127.0.0.1:8787/api/oauth/callback");
    googleMock();
    await finishAuth(state, "c");
    process.env.YOUTUBE_OWN_CHANNEL = "UCother00000000000000000";
    expect(oauthSummary().mismatch).toBe(true);
  });
  it("disconnect deletes tokens and revokes at Google", async () => {
    saveTokens({ refresh_token: "r1" });
    const calls: string[] = [];
    googleMock(calls);
    expect((await disconnect()).revoked).toBe(true);
    expect(calls.some((c) => c.includes("/revoke"))).toBe(true);
    expect(existsSync(process.env.BRIMLO_OAUTH_FILE!)).toBe(false);
    expect(getSetting("oauth_channel")).toBeUndefined();
  });
});
