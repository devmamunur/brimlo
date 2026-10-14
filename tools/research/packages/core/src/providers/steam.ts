import { decodeEntities, getJson, getText } from "./http.ts";

/**
 * Steam data, all free and keyless:
 * - store.steampowered.com/api/* and /appreviews (store JSON, allowed by robots.txt)
 * - store search result rows (HTML, allowed by robots.txt)
 * - api.steampowered.com: only two official, documented Web API methods (current players, news)
 * - steamspy.com/api.php (owner estimates; SteamSpy's public API, allowed by robots.txt)
 */

const STORE = "https://store.steampowered.com";
const CC = "cc=US&l=english";

/** Niche tag ids (from store.steampowered.com/tagdata/populartags/english, checked 14 Oct 2026). */
export const STEAM_TAGS: Record<string, number> = {
  incremental: 560542,
  idler: 615955,
  automation: 255534,
  mining: 5981,
  cleaning: 23491,
  "job simulator": 35079,
  "bullet heaven": 723991,
  "resource management": 8945,
  "tower defense": 1645,
  roguelite: 3959,
  cozy: 97376,
  simulation: 599,
};

export interface Platforms { windows: boolean; mac: boolean; linux: boolean }

export interface StoreHit { appid: number; name: string; price_cents: number | null; platforms: Platforms; image: string }

export async function searchStore(term: string): Promise<StoreHit[]> {
  const j = await getJson<any>(`${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&${CC}`);
  return (j.items ?? []).filter((i: any) => i.type === "app").map((i: any) => ({ appid: i.id, name: i.name, price_cents: i.price?.final ?? (i.price ? null : 0), platforms: { windows: !!i.platforms?.windows, mac: !!i.platforms?.mac, linux: !!i.platforms?.linux }, image: i.tiny_image ?? "" }));
}

export interface AppDetails {
  appid: number;
  name: string;
  type: string;
  is_free: boolean;
  price_cents: number | null;
  discount_percent: number;
  price_text: string;
  platforms: Platforms;
  release: { coming_soon: boolean; date: string };
  demo_appids: number[];
  fullgame_appid: number | null;
  developers: string[];
  publishers: string[];
  genres: string[];
  categories: string[];
  short_description: string;
  header_image: string;
  website: string | null;
  recommendations: number | null;
  mac_requirements: string | null;
}

const stripTags = (h: string) => decodeEntities(h.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim();

export async function appDetails(appid: number): Promise<AppDetails | null> {
  const j = await getJson<any>(`${STORE}/api/appdetails?appids=${appid}&${CC}`);
  const d = j?.[appid]?.data;
  if (!j?.[appid]?.success || !d) return null;
  const mac = d.mac_requirements && !Array.isArray(d.mac_requirements) ? stripTags(d.mac_requirements.minimum ?? "") : null;
  return {
    appid: d.steam_appid,
    name: d.name,
    type: d.type,
    is_free: !!d.is_free,
    price_cents: d.is_free ? 0 : (d.price_overview?.final ?? null),
    discount_percent: d.price_overview?.discount_percent ?? 0,
    price_text: d.is_free ? "Free" : (d.price_overview?.final_formatted || (d.release_date?.coming_soon ? "Not released" : "–")),
    platforms: { windows: !!d.platforms?.windows, mac: !!d.platforms?.mac, linux: !!d.platforms?.linux },
    release: { coming_soon: !!d.release_date?.coming_soon, date: d.release_date?.date ?? "" },
    demo_appids: (d.demos ?? []).map((x: any) => x.appid),
    fullgame_appid: d.fullgame?.appid ? Number(d.fullgame.appid) : null,
    developers: d.developers ?? [],
    publishers: d.publishers ?? [],
    genres: (d.genres ?? []).map((g: any) => g.description),
    categories: (d.categories ?? []).map((c: any) => c.description),
    short_description: decodeEntities(d.short_description ?? ""),
    header_image: d.header_image ?? "",
    website: d.website ?? null,
    recommendations: d.recommendations?.total ?? null,
    mac_requirements: mac || null,
  };
}

export interface ReviewSummary { score_desc: string; total: number; positive: number; negative: number; positive_pct: number | null }
export interface Review { text: string; voted_up: boolean; playtime_hours: number; created: string; helpful: number }

export async function reviews(appid: number, opts: { filter?: "recent" | "all"; num?: number; language?: string } = {}): Promise<{ summary: ReviewSummary; reviews: Review[] }> {
  const num = Math.min(100, opts.num ?? 0);
  const j = await getJson<any>(`${STORE}/appreviews/${appid}?json=1&language=${opts.language ?? "english"}&purchase_type=all&num_per_page=${num}&filter=${opts.filter ?? "recent"}&review_type=all`);
  const q = j.query_summary ?? {};
  const total = q.total_reviews ?? 0;
  return {
    summary: { score_desc: q.review_score_desc ?? "No reviews", total, positive: q.total_positive ?? 0, negative: q.total_negative ?? 0, positive_pct: total ? Math.round(((q.total_positive ?? 0) / total) * 1000) / 10 : null },
    reviews: (j.reviews ?? []).map((r: any) => ({ text: String(r.review ?? ""), voted_up: !!r.voted_up, playtime_hours: Math.round(((r.author?.playtime_at_review ?? 0) / 60) * 10) / 10, created: new Date((r.timestamp_created ?? 0) * 1000).toISOString(), helpful: r.votes_up ?? 0 })),
  };
}

/** Official Steam Web API (documented, keyless). */
export async function currentPlayers(appid: number): Promise<number | null> {
  try {
    const j = await getJson<any>(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`, { robots: false });
    return j?.response?.result === 1 ? (j.response.player_count ?? null) : null;
  } catch {
    return null;
  }
}

/** Official Steam Web API (documented, keyless). */
export async function news(appid: number, count = 3): Promise<{ title: string; date: string; url: string; feed: string }[]> {
  try {
    const j = await getJson<any>(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=${count}&maxlength=200`, { robots: false });
    return (j?.appnews?.newsitems ?? []).map((n: any) => ({ title: n.title, date: new Date(n.date * 1000).toISOString().slice(0, 10), url: n.url, feed: n.feedlabel ?? n.feedname ?? "" }));
  } catch {
    return [];
  }
}

export interface SpyData { owners: string | null; ccu: number | null; avg_playtime_hours: number | null; tags: { name: string; votes: number }[] }
/** SteamSpy public API. Owner numbers are ESTIMATES in wide ranges. */
export async function steamSpy(appid: number): Promise<SpyData | null> {
  try {
    const j = await getJson<any>(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
    if (!j?.appid) return null;
    const tags = j.tags && !Array.isArray(j.tags) ? Object.entries(j.tags).map(([name, votes]) => ({ name, votes: Number(votes) })).sort((a, b) => b.votes - a.votes).slice(0, 12) : [];
    return { owners: j.owners || null, ccu: j.ccu ?? null, avg_playtime_hours: j.average_forever ? Math.round((j.average_forever / 60) * 10) / 10 : null, tags };
  } catch {
    return null;
  }
}

// ---------- store search by tag (HTML rows) ----------
export type DiscoverKind = "new" | "demos" | "coming_soon" | "popular_new" | "top_rated";
export interface SearchRow {
  appid: number;
  store_appid: number;
  is_demo: boolean;
  name: string;
  image: string;
  platforms: Platforms;
  released: string;
  price_cents: number | null;
  discount_percent: number;
  review_desc: string | null;
  review_pct: number | null;
  review_count: number | null;
  tag_ids: number[];
  url: string;
}

export function searchUrl(tags: number[], kind: DiscoverKind, count: number, start = 0) {
  const p = new URLSearchParams({ query: "", start: String(start), count: String(Math.min(100, count)), tags: tags.join(","), infinite: "1", cc: "US", l: "english", ndl: "1" });
  if (kind === "new") (p.set("sort_by", "Released_DESC"), p.set("category1", "998"));
  if (kind === "demos") (p.set("sort_by", "Released_DESC"), p.set("category1", "10"));
  if (kind === "coming_soon") p.set("filter", "comingsoon");
  if (kind === "popular_new") (p.set("filter", "popularnew"), p.set("sort_by", "Released_DESC"));
  if (kind === "top_rated") (p.set("sort_by", "Reviews_DESC"), p.set("category1", "998"));
  return `${STORE}/search/results/?${p}`;
}

/** Parse Steam's search `results_html`. Pure, tested with fixtures. */
export function parseSearchRows(html: string): SearchRow[] {
  const chunks = html.split(/(?=<a [^>]*class="search_result_row)|(?=<a href="https:\/\/store\.steampowered\.com\/(?:app|sub|bundle)\/)/).filter((c) => c.includes("search_result_row"));
  const rows: SearchRow[] = [];
  for (const c of chunks) {
    const appid = Number(/data-ds-appid="(\d+)/.exec(c)?.[1]);
    if (!appid) continue;
    const href = /href="([^"]+)"/.exec(c)?.[1] ?? "";
    const storeAppid = Number(/\/app\/(\d+)/.exec(href)?.[1] ?? appid);
    const name = decodeEntities(/<span class="title">([^<]*)<\/span>/.exec(c)?.[1] ?? "").trim();
    const tooltip = decodeEntities(/data-tooltip-html="([^"]*)"/.exec(c)?.[1] ?? "");
    const tip = /^([^<]+)<br>(\d+)% of the ([\d,]+) user reviews/.exec(tooltip);
    const priceFinal = /data-price-final="(\d+)"/.exec(c)?.[1];
    const tagIds = (/data-ds-tagids="\[([^\]]*)\]"/.exec(c)?.[1] ?? "").split(",").map(Number).filter(Boolean);
    rows.push({
      appid,
      store_appid: storeAppid,
      is_demo: storeAppid !== appid || /\bdemo\b/i.test(name),
      name,
      image: /<img src="([^"]+)"/.exec(c)?.[1] ?? "",
      platforms: { windows: /platform_img win/.test(c), mac: /platform_img mac/.test(c), linux: /platform_img linux/.test(c) },
      released: (/search_released[^>]*>\s*([^<]*?)\s*</.exec(c)?.[1] ?? "").trim(),
      price_cents: priceFinal !== undefined ? Number(priceFinal) : null,
      discount_percent: Number(/discount_pct">\s*-?(\d+)%/.exec(c)?.[1] ?? 0),
      review_desc: tip ? tip[1]!.trim() : null,
      review_pct: tip ? Number(tip[2]) : null,
      review_count: tip ? Number(tip[3]!.replace(/,/g, "")) : null,
      tag_ids: tagIds,
      url: `https://store.steampowered.com/app/${storeAppid}/`,
    });
  }
  return rows;
}

export async function searchByTags(tags: number[], kind: DiscoverKind, count = 25): Promise<{ total: number; rows: SearchRow[] }> {
  const j = await getJson<any>(searchUrl(tags, kind, count));
  return { total: Number(j.total_count ?? 0), rows: parseSearchRows(String(j.results_html ?? "")) };
}

/** "Cookie Clicker", "1454400" or a store URL → app id. */
export async function resolveApp(input: string): Promise<{ appid: number; via: string } | null> {
  const s = input.trim();
  const url = /store\.steampowered\.com\/app\/(\d+)/.exec(s);
  if (url) return { appid: Number(url[1]), via: "url" };
  if (/^\d{2,8}$/.test(s)) return { appid: Number(s), via: "appid" };
  const hits = await searchStore(s);
  if (!hits.length) return null;
  const exact = hits.find((h) => h.name.toLowerCase() === s.toLowerCase());
  return { appid: (exact ?? hits[0]!).appid, via: exact ? "exact name" : `closest match "${hits[0]!.name}"` };
}
