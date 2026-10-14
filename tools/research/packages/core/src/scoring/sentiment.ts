/**
 * Small, explainable sentiment for game reviews and posts. ESTIMATE.
 * Lexicon tuned for incremental / idle / sim games, with simple negation ("not fun").
 * Themes tell you WHAT people praise or complain about, which matters more than one number.
 */

const POS = new Set("addictive addicting satisfying relaxing fun great love loved lovely amazing excellent chill polished cozy worth recommend recommended beautiful smooth enjoyable enjoyed perfect awesome best charming clever rewarding hooked gem masterpiece solid nice good wholesome brilliant fantastic underrated cute".split(" "));
const NEG = new Set("boring grindy buggy bugs bug crash crashes crashing broken repetitive tedious overpriced unbalanced annoying p2w abandoned unfinished frustrating waste refund refunded laggy lag bad worst shallow confusing clunky dull pointless meh disappointing disappointed scam unplayable mediocre".split(" "));
const NEGATORS = new Set(["not", "no", "never", "isn't", "isnt", "don't", "dont", "doesn't", "doesnt", "wasn't", "wasnt", "aren't", "arent", "can't", "cant", "won't", "wont", "hardly", "without"]);

export const THEMES: Record<string, string[]> = {
  "satisfying progression": ["satisfying", "progression", "upgrade", "upgrades", "numbers", "prestige", "automation", "automate", "number go up"],
  "grind / pacing": ["grind", "grindy", "pacing", "tedious", "waiting", "wait", "slow", "too slow"],
  "length / content": ["short", "content", "length", "finished", "hours of", "more content", "replay", "endgame"],
  "bugs / performance": ["bug", "bugs", "buggy", "crash", "crashes", "lag", "laggy", "performance", "fps", "freeze", "freezes"],
  "price / value": ["price", "worth", "expensive", "cheap", "overpriced", "value", "sale", "dollars", "$"],
  "relaxing / cozy": ["relaxing", "chill", "cozy", "calm", "peaceful", "zen"],
  "balance": ["balance", "balanced", "unbalanced", "overpowered", "op", "too easy", "too hard"],
  "updates / developer": ["update", "updates", "dev", "devs", "developer", "roadmap", "abandoned", "patch"],
  "ui / controls": ["ui", "interface", "controls", "menu", "menus", "clunky", "hotkey", "hotkeys"],
};

const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9'$ ]+/g, " ").split(/\s+/).filter(Boolean);

/** -1..1 score plus counts. Positive words after a negator count as negative and the other way round. */
export function sentiment(text: string): { score: number; pos: number; neg: number } {
  const w = words(text);
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < w.length; i++) {
    const t = w[i]!;
    const flipped = [w[i - 1], w[i - 2]].some((p) => p && NEGATORS.has(p));
    if (POS.has(t)) flipped ? neg++ : pos++;
    else if (NEG.has(t)) flipped ? pos++ : neg++;
  }
  const total = pos + neg;
  return { score: total ? Math.round(((pos - neg) / total) * 100) / 100 : 0, pos, neg };
}

export function themesIn(text: string): string[] {
  const t = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  return Object.entries(THEMES)
    .filter(([, keys]) => keys.some((k) => (k.length <= 3 ? new RegExp(`[^a-z]${k.replace("$", "\\$")}[^a-z]`).test(t) : t.includes(k))))
    .map(([name]) => name);
}

/** First sentence that names a theme, else the first sentence; short. */
export function quote(text: string, max = 170): string {
  const clean = text.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
  const pick = sentences.find((s) => themesIn(s).length) ?? sentences[0] ?? clean;
  return pick.length > max ? pick.slice(0, max - 1) + "…" : pick;
}

/** Copy-paste review templates ("---{ Graphics }--- ☐ Bad ☑ Good") say nothing useful as a quote. */
export const isTemplateReview = (t: string) => /[☐☑☒✅⬜]/.test(t) || /-{2,}\s*\{/.test(t) || (t.match(/\n/g)?.length ?? 0) > 25;

export interface Opinion { text: string; positive?: boolean; weight?: number }

export function analyze(items: Opinion[]) {
  const n = items.length;
  const themeStats = new Map<string, { mentions: number; pos: number; neg: number }>();
  let lexicon = 0;
  for (const it of items) {
    const s = sentiment(it.text);
    lexicon += s.score;
    const positive = it.positive ?? s.score >= 0;
    for (const th of themesIn(it.text)) {
      const cur = themeStats.get(th) ?? { mentions: 0, pos: 0, neg: 0 };
      cur.mentions++;
      positive ? cur.pos++ : cur.neg++;
      themeStats.set(th, cur);
    }
  }
  const themes = [...themeStats.entries()].map(([theme, v]) => ({ theme, mentions: v.mentions, in_positive: v.pos, in_negative: v.neg })).sort((a, b) => b.mentions - a.mentions);
  const byWeight = items.filter((i) => !isTemplateReview(i.text) && i.text.trim().length >= 20).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
  const labeled = items.filter((i) => i.positive !== undefined);
  return {
    analyzed: n,
    positive_share: labeled.length ? Math.round((labeled.filter((i) => i.positive).length / labeled.length) * 100) / 100 : null,
    lexicon_score: n ? Math.round((lexicon / n) * 100) / 100 : 0,
    praise: themes.filter((t) => t.in_positive > t.in_negative).slice(0, 4).map((t) => t.theme),
    complaints: themes.filter((t) => t.in_negative >= t.in_positive && t.in_negative > 0).slice(0, 4).map((t) => t.theme),
    themes,
    quotes: {
      positive: byWeight.filter((i) => i.positive ?? sentiment(i.text).score > 0).slice(0, 3).map((i) => quote(i.text)),
      negative: byWeight.filter((i) => (i.positive === undefined ? sentiment(i.text).score < 0 : !i.positive)).slice(0, 3).map((i) => quote(i.text)),
    },
    method: "Lexicon of game-review words with simple negation, plus theme keywords. An estimate: read the quotes.",
  };
}
