export const STOPWORDS = new Set(
  "a an the and or but if of to in on at for with from by as is are was were be been it its this that these those you your i me my we our they them he she his her not no so do does did can will just than then there here what which who how why when where into out up down over under more most very too also only about after before again all any both each few other some such own same s t don now one two get got has have had game games play played playing video videos gameplay".split(" "),
);

/** Lowercase words, no punctuation, no stopwords, length ≥ 3. */
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).map((w) => w.replace(/'s$/, "")).filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function topCounts(items: string[], n: number, min = 1): { text: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([text, count]) => ({ text, count }));
}

/** Two-word phrases (bigrams) from content words, in order. */
export function bigrams(text: string): string[] {
  const t = tokens(text);
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]} ${t[i + 1]}`);
  return out;
}

export const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
