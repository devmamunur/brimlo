/**
 * Keyword scores. Both are ESTIMATES from the top search results, not real search volume.
 * Every formula is returned with the score so you can see how it was made.
 */

export interface ResultRow {
  views: number;
  publishedAt: string;
  channelSubs: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const DAY = 86400000;

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export const ageDays = (publishedAt: string, now = new Date()) => Math.max(1, (now.getTime() - Date.parse(publishedAt)) / DAY);
export const viewsPerDay = (views: number, publishedAt: string, now = new Date()) => views / ageDays(publishedAt, now);

const label = (score: number) => (score < 34 ? "low" : score < 67 ? "medium" : "high");

export const COMPETITION_FORMULA =
  "competition = 100 × (0.4×big_channel_share + 0.3×clamp(log10(1+median_views)/6) + 0.3×clamp(log10(1+median_channel_subs)/6)). " +
  "big_channel_share = share of results from channels with 100K+ subs. 1M views or 1M subs counts as 1.0.";

export function competitionScore(rows: ResultRow[]) {
  if (!rows.length) return { score: 0, label: "low", parts: {}, formula: COMPETITION_FORMULA };
  const bigShare = rows.filter((r) => r.channelSubs >= 100_000).length / rows.length;
  const viewsPart = clamp01(Math.log10(1 + median(rows.map((r) => r.views))) / 6);
  const subsPart = clamp01(Math.log10(1 + median(rows.map((r) => r.channelSubs))) / 6);
  const score = Math.round(100 * (0.4 * bigShare + 0.3 * viewsPart + 0.3 * subsPart));
  return { score, label: label(score), parts: { big_channel_share: round(bigShare), views_part: round(viewsPart), subs_part: round(subsPart) }, formula: COMPETITION_FORMULA };
}

export const OPPORTUNITY_FORMULA =
  "opportunity = 100 × (0.4×demand + 0.4×small_channel_wins + 0.2×freshness). " +
  "demand = clamp(log10(1+median_views_per_day)/4) (10K views/day = 1.0). " +
  "small_channel_wins = share of results from channels under 50K subs whose video has 3× more views than the channel has subs. " +
  "freshness = share of results published in the last 90 days.";

export function opportunityScore(rows: ResultRow[], now = new Date()) {
  if (!rows.length) return { score: 0, label: "low", parts: {}, formula: OPPORTUNITY_FORMULA };
  const demand = clamp01(Math.log10(1 + median(rows.map((r) => viewsPerDay(r.views, r.publishedAt, now)))) / 4);
  const smallWins = rows.filter((r) => r.channelSubs < 50_000 && r.views >= 3 * r.channelSubs).length / rows.length;
  const fresh = rows.filter((r) => ageDays(r.publishedAt, now) <= 90).length / rows.length;
  const score = Math.round(100 * (0.4 * demand + 0.4 * smallWins + 0.2 * fresh));
  return { score, label: label(score), parts: { demand: round(demand), small_channel_wins: round(smallWins), freshness: round(fresh) }, formula: OPPORTUNITY_FORMULA };
}

const round = (x: number) => Math.round(x * 100) / 100;
