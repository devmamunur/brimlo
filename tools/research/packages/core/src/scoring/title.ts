import { jaccard, tokens } from "./text.ts";

/**
 * Local title score, 0–100. No AI, no quota. It checks the rules in playbook/titles.md.
 * It is a checklist, not a prediction: a high score does not promise views.
 */

export const FEELING_WORDS = ["satisfying", "addictive", "addicting", "disturbing", "broken", "insane", "out of hand", "godlike", "unstoppable", "relaxing"];
export const BIG_NUMBER_RE = /\b\d{1,3}(,\d{3})+\b|\b\d+\s?(million|billion|trillion)s?\b|\b(millions|billions|trillions?|infinite|per second)\b|\b10,?000\b/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export type TemplateId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";
export const TEMPLATE_NAMES: Record<TemplateId, string> = {
  A: "The [theme] incremental game where [twist]",
  B: "I Turned [tiny] into [HUGE]",
  C: "I 100% [game or idea]",
  D: "A Game Where You [strange idea]… and It's [FEELING]!",
  E: "Will [thing] [A] or [B] in This Incremental Game?",
  F: "[A or B] | First Look Demo / Playtest / Game Name",
  G: "Best New Incremental Games of [Month/2026]",
  H: "This [genre] Is Basically [known game]… But With [twist]!",
  I: "I [did an extreme thing] (first person, short)",
};

/** Which playbook template (A–I) the title looks like, if any. */
export function detectTemplate(title: string): TemplateId | null {
  const t = title.trim();
  const words = t.split(/\s+/).length;
  if (/^i\s+turned\s+.+\s+into\s+/i.test(t)) return "B";
  if (/^i\s+(played\s+)?100\s?%/i.test(t) || /\bi\s+100\s?%/i.test(t)) return "C";
  if (/^best\s+(new\s+)?(incremental|idle)/i.test(t)) return "G";
  if (/basically\s+.+\bbut\s+with\b/i.test(t)) return "H";
  if (/^will\s+/i.test(t) || /^will\b.*\?$/i.test(t)) return "E";
  if (/^a\s+game\s+where\s+you\b/i.test(t) && /(and\s+it'?s|…|\.\.\.)/i.test(t)) return "D";
  if (/\|\s*(first look|demo|playtest|[\w' ]+)$/i.test(t) && /\|/.test(t)) return "F";
  if (/^the\s+.+\s+(incremental|idle)\s+(game\s+)?where\b/i.test(t) || /\bincremental\s+game\s+where\b/i.test(t)) return "A";
  if (/^i\s+[a-z']+\s+/i.test(t) && words <= 12 && !/incremental/i.test(t)) return "I";
  return null;
}

export interface TitleContext {
  keyword?: string;
  /** Names to avoid (tracked competitors and known creators). */
  creatorNames: string[];
  /** Autocomplete suggestions for the keyword. null = could not load. */
  suggestions: string[] | null;
  /** Known well-performing titles to compare shape with. null = none stored. */
  reference: { id: string; title: string; views: number }[] | null;
}

export interface Part {
  name: string;
  points: number;
  max: number;
  available: boolean;
  note: string;
  fix?: string;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function findCreatorNames(title: string, names: string[]): string[] {
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9@ ]+/g, " ")} `;
  const hits = names.filter((n) => n.length >= 4 && t.includes(` ${n.toLowerCase().replace(/^@/, "")} `));
  return [...new Set(hits)];
}

export function scoreTitle(title: string, ctx: TitleContext) {
  const t = title.trim();
  const tpl = detectTemplate(t);
  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const parts: Part[] = [];

  // 1. length (15)
  {
    const lo = tpl === "I" ? 28 : 45;
    const hi = 65;
    const n = t.length;
    const pts = n >= lo && n <= hi ? 15 : n >= lo - 10 && n <= hi + 10 ? 11 : n >= lo - 20 && n <= hi + 25 ? 6 : 2;
    parts.push({ name: "length", points: pts, max: 15, available: true, note: `${n} characters (ideal ${lo}–${hi}${tpl === "I" ? ", short first-person titles are fine" : ""})`, fix: n < lo ? `Add detail: the title is short (${n} chars). Aim for ${lo}–${hi}.` : `Shorten it to ${hi} characters or less. YouTube cuts long titles.` });
  }

  // 2. template (15)
  parts.push({ name: "template", points: tpl ? 15 : 5, max: 15, available: true, note: tpl ? `Matches template ${tpl}: ${TEMPLATE_NAMES[tpl]}` : "Does not match a playbook template (A–I)", fix: "Rewrite with one playbook template. Default for a pure incremental: 'The [theme] incremental game where [twist]'." });

  // 3. keyword (15)
  {
    const kw = ctx.keyword?.toLowerCase().trim();
    const has = kw ? lower.includes(kw) : /incremental/.test(lower);
    const label = kw ?? "incremental";
    const early = lower.indexOf(label) !== -1 && lower.indexOf(label) <= 40;
    let pts = has ? (early ? 15 : 10) : tpl === "I" && !kw ? 12 : 3;
    parts.push({ name: "keyword", points: pts, max: 15, available: true, note: has ? `Has "${label}"${early ? " early in the title" : " (late in the title)"}` : tpl === "I" && !kw ? `No "${label}", but template I (first person) allows it. Test it against A–H.` : `Missing "${label}"`, fix: `Put "${label}" in the title, in the first ~40 characters.` });
  }

  // 4. CAPS (10)
  {
    const caps = words.filter((w) => /^[A-Z][A-Z0-9'!?,.\-]{2,}$/.test(w.replace(/[^A-Za-z0-9'!?,.\-]/g, "")) && /[A-Z]{3,}/.test(w));
    const n = caps.length;
    const allCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
    const pts = allCaps ? 2 : n >= 1 && n <= 3 ? 10 : n === 0 ? 4 : 3;
    parts.push({ name: "caps", points: pts, max: 10, available: true, note: allCaps ? "The whole title is in CAPS" : `${n} CAPS word(s) (ideal 1–3)`, fix: n === 0 ? "Put 1–3 key words in CAPS (for example the feeling word)." : "Use CAPS on only 1–3 words." });
  }

  // 5. rules: no emoji, no creator names, no series wording (10)
  {
    const emoji = EMOJI_RE.test(t);
    const creators = findCreatorNames(t, ctx.creatorNames);
    const series = /\b(part|pt|episode|ep|day)\s*#?\d+\b|\bpart\s+(one|two|three)\b/i.test(t);
    const pts = (emoji ? 0 : 3) + (creators.length ? 0 : 4) + (series ? 0 : 3);
    parts.push({
      name: "rules",
      points: pts,
      max: 10,
      available: true,
      note: [emoji ? "Has emoji (playbook: no emoji)" : "No emoji", creators.length ? `Mentions creator name(s): ${creators.join(", ")}` : ctx.creatorNames.length ? "No tracked creator names" : "Creator names not checked (no competitors tracked)", series ? "Looks like a series ('part 1', 'episode 2'). Brimlo rule: one game, one video" : "No series wording"].join(". "),
      fix: creators.length ? `Remove creator names (${creators.join(", ")}). Rule: never put other creators' names in titles.` : series ? "Remove 'part N'. Rule: no multi-part series, one game = one video." : "Remove the emoji. The playbook says no emoji.",
    });
  }

  // 6. power words (15)
  {
    const feeling = FEELING_WORDS.find((w) => lower.includes(w));
    const big = BIG_NUMBER_RE.test(t);
    const curiosity = /\bwhere you\b|\bbut\b|\?|…|\.\.\.|\bwill\b/i.test(t);
    const pts = (feeling ? 7 : 0) + (big ? 5 : 0) + (curiosity ? 3 : 0);
    parts.push({ name: "power", points: pts, max: 15, available: true, note: [feeling ? `feeling word "${feeling}"` : null, big ? "big-number word" : null, curiosity ? "curiosity/twist" : null].filter(Boolean).join(", ") || "No feeling word, big number or twist", fix: "Add one feeling word (SATISFYING, ADDICTIVE, DISTURBING, BROKEN, INSANE...) or a big-number word (MILLIONS, BILLIONS, per SECOND). Use one clear promise: tiny → huge." });
  }

  // 7. clarity (10)
  {
    let pts = 10;
    const notes: string[] = [];
    if (words.length < 4 || words.length > 14) (pts -= 4), notes.push(`${words.length} words (ideal 4–14)`);
    if (words.some((w) => w.replace(/\W/g, "").length >= 13)) (pts -= 3), notes.push("has a very long word");
    if (/[!?]{2,}|\.{4,}/.test(t)) (pts -= 3), notes.push("too much punctuation");
    parts.push({ name: "clarity", points: Math.max(0, pts), max: 10, available: true, note: notes.join(", ") || "Short, simple words", fix: "Use simple English: 4–14 short words, one idea, no long words." });
  }

  // 8. demand (5)
  if (ctx.suggestions) {
    const tt = new Set(tokens(t));
    const full = ctx.suggestions.find((s) => { const st = tokens(s); return st.length >= 2 && st.every((w) => tt.has(w)); });
    const kwTokens = tokens(ctx.keyword ?? "incremental game");
    const some = kwTokens.some((w) => tt.has(w));
    const pts = full ? 5 : some ? 2.5 : 0;
    parts.push({ name: "demand", points: pts, max: 5, available: true, note: full ? `Matches a real search: "${full}"` : some ? "Shares a word with the keyword, but not a full autocomplete phrase" : "No match with YouTube autocomplete", fix: "Use a phrase people really search (check autocomplete in keyword_research)." });
  } else parts.push({ name: "demand", points: 0, max: 5, available: false, note: "Autocomplete not available" });

  // 9. similarity to proven titles (5)
  let similar: { title: string; views: number; similarity: number }[] = [];
  if (ctx.reference?.length) {
    const tt = tokens(t);
    similar = ctx.reference.map((r) => ({ title: r.title, views: r.views, similarity: Math.round(jaccard(tt, tokens(r.title)) * 100) / 100 })).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
    const top = similar[0]?.similarity ?? 0;
    const pts = top > 0.7 ? 1 : top >= 0.08 ? 5 : 2;
    parts.push({ name: "proven-shape", points: pts, max: 5, available: true, note: top > 0.7 ? "Almost a copy of a stored title. Copy the shape, not the words." : top >= 0.08 ? "Related to stored high-view titles, but not a copy" : "Nothing like the stored high-view titles", fix: top > 0.7 ? "Change the words. Playbook rule: copy the shape, not the exact words." : "Compare with proven title shapes (title_patterns)." });
  } else parts.push({ name: "proven-shape", points: 0, max: 5, available: false, note: "No stored titles to compare yet (run outliers/keyword_research first)" });

  const avail = parts.filter((p) => p.available);
  const got = avail.reduce((a, p) => a + p.points, 0);
  const max = avail.reduce((a, p) => a + p.max, 0);
  const score = Math.round((got / max) * 100);
  const fixes = [...avail].filter((p) => p.fix && p.points < p.max).sort((a, b) => a.points / a.max - b.points / b.max).slice(0, 3).map((p) => `${p.name}: ${p.fix}`);
  const label = score >= 80 ? "strong" : score >= 60 ? "ok" : score >= 40 ? "weak" : "poor";
  return { title: t, score, label, template: tpl, parts, reasons: avail.filter((p) => p.points >= p.max * 0.8).map((p) => `${p.name}: ${p.note}`), problems: avail.filter((p) => p.points < p.max * 0.5).map((p) => `${p.name}: ${p.note}`), fixes, similar_known_titles: similar, scored_out_of: max };
}
