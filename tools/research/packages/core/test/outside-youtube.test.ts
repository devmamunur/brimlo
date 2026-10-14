import { describe, expect, it } from "vitest";
import { htmlToText } from "../src/features/web.ts";
import { ruleChecks } from "../src/features/steam.ts";
import { assertPublicUrl, BlockedError, decodeEntities, isPrivateIp, parseRobots, robotsAllows } from "../src/providers/http.ts";
import { parseItchRss } from "../src/providers/itch.ts";
import { parseSearchRows, searchUrl } from "../src/providers/steam.ts";
import { analyze, sentiment, themesIn } from "../src/scoring/sentiment.ts";

const ROW = (o: { appid: number; href: number; title: string; mac?: boolean; price?: number; tip?: string }) =>
  `<a href="https://store.steampowered.com/app/${o.href}/X/?snr=1" data-ds-appid="${o.appid}" data-ds-tagids="[597,599]" class="search_result_row ds_collapse_flag "><div class="search_capsule"><img src="https://img/${o.appid}.jpg" ></div><div class="search_name ellipsis"><span class="title">${o.title}</span></div><div class="search_platforms"><span class="platform_img win"></span>${o.mac ? '<span class="platform_img mac"></span>' : ""}</div><div class="search_released responsive_secondrow"> Oct 14, 2026 </div><div class="search_reviewscore responsive_secondrow">${o.tip ? `<span class="search_review_summary positive" data-tooltip-html="${o.tip}"></span>` : ""}</div><div class="search_price_discount_combined responsive_secondrow" data-price-final="${o.price ?? 0}"></div></a>`;

describe("Steam search rows", () => {
  it("parses demo vs full game, platforms, price and review tooltip", () => {
    const html = ROW({ appid: 5319720, href: 5087090, title: "Elixir of Immortality DEMO" }) + ROW({ appid: 3456800, href: 3456800, title: "Rock Crusher &amp; Friends", mac: true, price: 699, tip: "Very Positive&lt;br&gt;86% of the 1,251 user reviews for this game are positive." });
    const rows = parseSearchRows(html);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ appid: 5319720, store_appid: 5087090, is_demo: true, price_cents: 0, platforms: { windows: true, mac: false } });
    expect(rows[1]).toMatchObject({ name: "Rock Crusher & Friends", is_demo: false, price_cents: 699, review_desc: "Very Positive", review_pct: 86, review_count: 1251, released: "Oct 14, 2026", tag_ids: [597, 599] });
  });
  it("builds the right search URLs", () => {
    expect(searchUrl([615955], "demos", 25)).toContain("category1=10");
    expect(searchUrl([560542], "coming_soon", 25)).toContain("filter=comingsoon");
    expect(searchUrl([560542], "new", 25)).toContain("category1=998");
  });
});

describe("itch.io RSS", () => {
  it("parses items", () => {
    const xml = `<rss><channel><item><title>A [Free] [Simulation]</title><plainTitle>Idle Thing &amp; Co</plainTitle><imageurl>https://img/1.png</imageurl><price>$0.00</price><link>https://x.itch.io/idle</link><description><![CDATA[Grow a shop.<img src="x"/>]]></description><pubDate>Wed, 14 Oct 2026 08:01:23 GMT</pubDate><platforms><html>yes</html><windows>yes</windows></platforms></item></channel></rss>`;
    const [g] = parseItchRss(xml);
    expect(g).toMatchObject({ title: "Idle Thing & Co", price: "$0.00", url: "https://x.itch.io/idle", description: "Grow a shop.", platforms: ["html", "windows"] });
    expect(g!.published).toBe("2026-10-14T08:01:23.000Z");
  });
});

describe("robots.txt", () => {
  const steam = parseRobots("User-Agent: *\nDisallow: /share/\nDisallow: /account/emailoptout/?*token=\n");
  it("allows normal paths and blocks disallowed ones", () => {
    expect(robotsAllows(steam, "/search/results/?tags=1")).toBe(true);
    expect(robotsAllows(steam, "/share/abc")).toBe(false);
    expect(robotsAllows(steam, "/account/emailoptout/?x=1&token=2")).toBe(false);
  });
  it("Disallow: / blocks everything; empty Disallow allows everything", () => {
    expect(robotsAllows(parseRobots("User-agent: *\nDisallow: /"), "/r/x/.rss")).toBe(false);
    expect(robotsAllows(parseRobots("User-agent: *\nDisallow:\n\nUser-agent: GPTBot\nDisallow: /"), "/api/x")).toBe(true);
  });
  it("longest match wins and Allow wins a tie; $ anchors", () => {
    const r = parseRobots("User-agent: *\nDisallow: /games\nAllow: /games/newest\nDisallow: /*.pdf$");
    expect(robotsAllows(r, "/games/newest/tag-incremental.xml")).toBe(true);
    expect(robotsAllows(r, "/games/top")).toBe(false);
    expect(robotsAllows(r, "/file.pdf")).toBe(false);
    expect(robotsAllows(r, "/file.pdf?x")).toBe(true);
  });
  it("uses our own group when a site names us", () => {
    const r = parseRobots("User-agent: *\nDisallow:\n\nUser-agent: BrimloResearch\nDisallow: /");
    expect(robotsAllows(r, "/anything")).toBe(false);
  });
});

describe("address safety", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.5", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "100.64.0.1"])("%s is private", (ip) => expect(isPrivateIp(ip)).toBe(true));
  it.each(["8.8.8.8", "104.18.1.1", "2606:4700::1111"])("%s is public", (ip) => expect(isPrivateIp(ip)).toBe(false));
  it("rejects bad schemes, credentials and local hosts without any network call", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toBeInstanceOf(BlockedError);
    await expect(assertPublicUrl("http://user:pw@8.8.8.8/")).rejects.toThrow(/username/);
    await expect(assertPublicUrl("http://localhost:8787/")).rejects.toThrow(/Local/);
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow(/private/);
  });
  it("decodes entities", () => expect(decodeEntities("A &amp; B &lt;br&gt; &#39;x&#39; &#x2764;")).toBe("A & B <br> 'x' ❤"));
});

describe("sentiment", () => {
  it("scores and handles negation", () => {
    expect(sentiment("So addictive and satisfying").score).toBe(1);
    expect(sentiment("Buggy and boring").score).toBe(-1);
    expect(sentiment("not fun at all").score).toBe(-1);
    expect(sentiment("not boring").score).toBe(1);
  });
  it("finds themes", () => {
    expect(themesIn("Way too grindy, and it crashes")).toEqual(expect.arrayContaining(["grind / pacing", "bugs / performance"]));
    expect(themesIn("Worth the $5, very relaxing")).toEqual(expect.arrayContaining(["price / value", "relaxing / cozy"]));
  });
  it("splits praise and complaints using the review vote", () => {
    const a = analyze([
      { text: "Satisfying upgrades, numbers go up. Love it.", positive: true, weight: 10 },
      { text: "Great automation and prestige.", positive: true, weight: 3 },
      { text: "Too grindy and slow after hour two.", positive: false, weight: 5 },
    ]);
    expect(a.positive_share).toBeCloseTo(0.67, 1);
    expect(a.praise).toContain("satisfying progression");
    expect(a.complaints).toContain("grind / pacing");
    expect(a.quotes.negative[0]).toMatch(/grindy/);
  });
  it("never quotes copy-paste checklist reviews", () => {
    const a = analyze([{ text: "---{ Graphics }--- ☐ Bad ☑ Good ---{ Gameplay }--- ☑ Very good", positive: true, weight: 99 }, { text: "Really satisfying upgrades all the way.", positive: true, weight: 1 }]);
    expect(a.quotes.positive).toEqual(["Really satisfying upgrades all the way."]);
  });
});

describe("Brimlo rule checks", () => {
  const base = { appid: 1, name: "X", type: "game", is_free: false, price_cents: 699, discount_percent: 0, price_text: "$6.99", platforms: { windows: true, mac: true, linux: false }, release: { coming_soon: false, date: new Date(Date.now() - 5 * 86400000).toDateString() }, demo_appids: [2], fullgame_appid: null, developers: [], publishers: [], genres: [], categories: [], short_description: "", header_image: "", website: null, recommendations: null, mac_requirements: null };
  it("passes a fresh, cheap Mac game with a demo", () => {
    const c = ruleChecks(base);
    expect([c.mac.ok, c.budget.ok, c.demo.ok, c.fresh.ok]).toEqual([true, true, true, true]);
  });
  it("flags Windows-only and over-budget games", () => {
    const c = ruleChecks({ ...base, price_cents: 2499, platforms: { windows: true, mac: false, linux: false } });
    expect(c.mac.ok).toBe(false);
    expect(c.mac.text).toMatch(/CrossOver/);
    expect(c.budget.ok).toBe(false);
  });
});

describe("htmlToText", () => {
  it("keeps headings, lists and absolute links; drops scripts", () => {
    const { text, links } = htmlToText(`<h2>Patch</h2><p>New <a href="/news/1">update</a> out.</p><ul><li>One</li><li>Two</li></ul><script>alert(1)</script>`, "https://example.com/blog/");
    expect(text).toContain("## Patch");
    expect(text).toContain("[update](https://example.com/news/1)");
    expect(text).toMatch(/- One\s*\n- Two/);
    expect(text).not.toContain("alert");
    expect(links).toEqual([{ text: "update", url: "https://example.com/news/1" }]);
  });
});
