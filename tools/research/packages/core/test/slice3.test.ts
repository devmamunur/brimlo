import { beforeEach, describe, expect, it } from "vitest";
import { useMemoryDb } from "../src/db/client.ts";
import { competitorsAdd } from "../src/features/competitors.ts";
import { ideaEngine } from "../src/features/ideaEngine.ts";
import { ideaSave, ideasList, ideaUpdate } from "../src/features/ideas.ts";
import { descriptionAndTags, fitTags } from "../src/features/tags.ts";
import { scoreTitleTool, titlePatterns } from "../src/features/titles.ts";
import { trending } from "../src/features/trending.ts";
import { demoProvider } from "../src/providers/demo.ts";
import { quotaStatus } from "../src/quota/guard.ts";
import { detectTemplate, findCreatorNames, scoreTitle } from "../src/scoring/title.ts";

const deps = { yt: demoProvider };
const ctx = { creatorNames: ["azrilich", "idle cub"], suggestions: ["incremental game steam", "best incremental games"], reference: null };
beforeEach(() => {
  process.env.BRIMLO_DEMO = "1";
  useMemoryDb();
});

describe("detectTemplate (examples from playbook/titles.md)", () => {
  it.each([
    ["The rat incremental game where your swarm eats EVERYTHING", "A"],
    ["I Turned One Tiny Spark into a Fire Bigger Than the SUN", "B"],
    ["I 100% the Incremental Game Where You Feed an AI", "C"],
    ["A Game Where You Grow a Parasite Army and It's DISTURBING!", "D"],
    ["Will This City Survive the Swarm in This Incremental Game?", "E"],
    ["The Rat Swarm Incremental Game Where You EAT the Whole City | I Am Plague Playtest", "F"],
    ["Best Incremental Demos of Steam Next Fest October 2026", "G"],
    ["Best New Incremental Games of October 2026", "G"],
    ["This Is Basically Cookie Clicker… But With ROCKS!", "H"],
    ["I made a fire so big it bullied the sun", "I"],
    ["random words here", null],
  ])("%s → %s", (t, id) => expect(detectTemplate(t)).toBe(id));
});

describe("scoreTitle", () => {
  it("scores a good playbook title higher than a bad one", () => {
    const good = scoreTitle("The swarm incremental game where you EAT the whole city", ctx);
    const bad = scoreTitle("🔥🔥 game video part 1 AZRILICH PLAYS EVERYTHING IN THE WORLD RIGHT NOW!!!", ctx);
    expect(good.score).toBeGreaterThan(bad.score + 30);
    expect(good.template).toBe("A");
    expect(bad.fixes.length).toBeGreaterThan(0);
    expect(bad.problems.join(" ")).toMatch(/rules/);
    expect(scoreTitle("incremental game part 1", ctx).parts.find((p) => p.name === "rules")!.points).toBe(7);
  });
  it("flags creator names and emoji", () => {
    const r = scoreTitle("Idle Cub would love this incremental game 🔥", ctx);
    expect(r.parts.find((p) => p.name === "rules")!.points).toBe(3);
    expect(findCreatorNames("Azrilich made this", ["azrilich"])).toEqual(["azrilich"]);
  });
  it("returns max 3 fixes and rescales when parts are unavailable", () => {
    const r = scoreTitle("some title", { creatorNames: [], suggestions: null, reference: null });
    expect(r.fixes.length).toBeLessThanOrEqual(3);
    expect(r.scored_out_of).toBe(90);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it("template I is allowed without 'incremental' and short", () => {
    const r = scoreTitle("I made a fire so big it bullied the sun", ctx);
    expect(r.parts.find((p) => p.name === "length")!.points).toBe(15);
    expect(r.parts.find((p) => p.name === "keyword")!.points).toBe(12);
  });
  it("tool compares up to 5 titles and ranks them", async () => {
    const env = await scoreTitleTool({ titles: ["The swarm incremental game where you EAT the whole city", "play game", "I turned one rock into a SATISFYING mountain of gold"], check_demand: true }, { suggest: async () => ["incremental game steam"] });
    const d: any = env.data;
    expect(d.results).toHaveLength(3);
    expect(d.ranking[0].score).toBeGreaterThanOrEqual(d.ranking[2].score);
    expect(env.quota_used).toBe(0);
  });
  it("tool needs a title", async () => {
    await expect(scoreTitleTool({ check_demand: false }, {})).rejects.toThrow();
  });
});

describe("fitTags", () => {
  it("stays within 500 characters including commas", () => {
    const tags = Array.from({ length: 80 }, (_, i) => `incremental game tag number ${i}`);
    const fit = fitTags(tags);
    expect(fit.join(",").length).toBeLessThanOrEqual(500);
    expect(fit.length).toBeGreaterThan(5);
    expect(fit[0]).toBe(tags[0]);
  });
});

describe("tools on the demo provider", () => {
  it("title_patterns", async () => {
    const d: any = (await titlePatterns({ query: "idle mining", days: 365, min_multiplier: 1, refresh: false }, deps)).data;
    expect(d.titles_analyzed).toBeGreaterThan(0);
    expect(d.patterns.length).toBeGreaterThan(0);
  });
  it("description_and_tags needs keyword or video, filters creator names", async () => {
    await expect(descriptionAndTags({ days: 180, top: 25, refresh: false }, deps)).rejects.toThrow();
    await competitorsAdd({ channel: "@idleminingx" }, deps);
    const d: any = (await descriptionAndTags({ keyword: "idle mining", days: 365, top: 25, refresh: false }, deps)).data;
    expect(d.suggested_tags[0]).toBe("idle mining");
    expect(d.suggested_tags_characters).toBeLessThanOrEqual(500);
    expect(d.description_first_lines_draft).toHaveLength(2);
    expect(JSON.stringify(d.suggested_tags)).not.toMatch(/demo channel/i);
  });
  it("trending sorts by views per day", async () => {
    const d: any = (await trending({ query: "idle mining", days: 30, limit: 10, refresh: false }, deps)).data;
    const v = d.videos.map((x: any) => x.views_per_day);
    expect([...v].sort((a, b) => b - a)).toEqual(v);
  });
  it("idea_engine builds a pack, estimates, and saves", async () => {
    const est = await ideaEngine({ topic: "idle mining", days: 90, estimate_only: true, refresh: false }, deps);
    expect((est.data as any).full_cost).toBe(204);
    const env = await ideaEngine({ topic: "idle mining", days: 365, save_as: "Idle mining idea", estimate_only: false, refresh: false }, deps);
    const d: any = env.data;
    expect(d.evidence.keyword.competition).toBeGreaterThanOrEqual(0);
    expect(d.rules.join(" ")).toMatch(/No multi-part/);
    expect(d.saved_idea.id).toBe(1);
    expect(quotaStatus().used).toBe(0);
  });
});

describe("ideas", () => {
  it("save, list by status, update, delete", async () => {
    await ideaSave({ title: "Rock Crusher", game: "Rock Crusher", status: "idea", evidence: { a: 1 } });
    await ideaUpdate({ id: 1, status: "planned", delete: false });
    expect(((await ideasList({ status: "planned" })).data as any).ideas[0].evidence).toEqual({ a: 1 });
    expect(((await ideasList({ status: "idea" })).data as any).ideas).toHaveLength(0);
    await ideaUpdate({ id: 1, delete: true });
    expect(((await ideasList({})).data as any).ideas).toHaveLength(0);
    await expect(ideaUpdate({ id: 99, delete: false })).rejects.toThrow(/not found/);
  });
});
