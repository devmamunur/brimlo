import { decodeEntities, getText } from "./http.ts";

export interface ItchGame { title: string; url: string; price: string; image: string; description: string; published: string; platforms: string[] }

const tag = (item: string, name: string) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(item);
  return m ? decodeEntities(m[1]!.replace(/^<!\[CDATA\[|\]\]>$/g, "")).trim() : "";
};

/** Parse itch.io's RSS for a browse page. Pure, tested. */
export function parseItchRss(xml: string): ItchGame[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const plat = /<platforms>([\s\S]*?)<\/platforms>/.exec(it!)?.[1] ?? "";
    return {
      title: tag(it!, "plainTitle") || tag(it!, "title"),
      url: tag(it!, "link"),
      price: tag(it!, "price") || "?",
      image: tag(it!, "imageurl"),
      description: tag(it!, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240),
      published: tag(it!, "pubDate") ? new Date(tag(it!, "pubDate")).toISOString() : "",
      platforms: [...plat.matchAll(/<(\w+)>yes<\/\1>/g)].map((m) => m[1]!),
    };
  });
}

/** itch.io browse feeds (allowed by itch.io robots.txt; /search is not used). */
export async function itchFeed(tagSlug: string, sort: "newest" | "top-rated" | "featured" = "newest"): Promise<ItchGame[]> {
  const slug = tagSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const path = sort === "featured" ? `games/featured/tag-${slug}.xml` : sort === "top-rated" ? `games/top-rated/tag-${slug}.xml` : `games/newest/tag-${slug}.xml`;
  const { text } = await getText(`https://itch.io/${path}`);
  return parseItchRss(text);
}
