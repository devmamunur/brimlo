import { beforeEach, describe, expect, it } from "vitest";
import { cached, peek } from "../src/cache.ts";
import { useMemoryDb } from "../src/db/client.ts";

beforeEach(() => void useMemoryDb());

describe("cached", () => {
  it("calls fn once, then serves from cache", async () => {
    let calls = 0;
    const fn = async () => ({ value: { n: ++calls }, source: "test" });
    const a = await cached("k", 60, fn);
    const b = await cached("k", 60, fn);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.value.n).toBe(1);
    expect(calls).toBe(1);
  });
  it("refresh forces a new call", async () => {
    let calls = 0;
    const fn = async () => ({ value: ++calls, source: "test" });
    await cached("k", 60, fn);
    const r = await cached("k", 60, fn, { refresh: true });
    expect(r.value).toBe(2);
  });
  it("expires after the ttl", async () => {
    await cached("k", 60, async () => ({ value: 1, source: "test" }));
    expect(peek("k", Date.now() + 61_000)).toBeUndefined();
    expect(peek("k", Date.now() + 59_000)).toBeDefined();
  });
});
