/** YouTube search autocomplete. Free, no key, no quota. */

export interface Suggestion {
  text: string;
  /** "seed" = typed after the exact query, "a-z" = letter expansion, "modifier" = prefix/suffix word */
  from: "seed" | "a-z" | "modifier";
  position: number;
}

const MODIFIERS = ["game", "idle", "incremental"];

export async function suggest(q: string): Promise<string[]> {
  const url = new URL("https://suggestqueries.google.com/complete/search");
  url.search = new URLSearchParams({ client: "firefox", ds: "yt", hl: "en", gl: "us", q }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`autocomplete ${res.status}`);
  const body = (await res.json()) as [string, string[]];
  return body[1] ?? [];
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!).then(
          (value) => ({ status: "fulfilled", value }) as const,
          (reason) => ({ status: "rejected", reason }) as const,
        );
      }
    }),
  );
  return out;
}

export async function expandSuggestions(seed: string, expand = true, suggestFn = suggest) {
  const queries: { q: string; from: Suggestion["from"] }[] = [{ q: seed, from: "seed" }];
  if (expand) {
    for (const c of "abcdefghijklmnopqrstuvwxyz") queries.push({ q: `${seed} ${c}`, from: "a-z" });
    for (const m of MODIFIERS) {
      queries.push({ q: `${seed} ${m}`, from: "modifier" }, { q: `${m} ${seed}`, from: "modifier" });
    }
  }
  const results = await pool(queries, 6, (x) => suggestFn(x.q));
  const seen = new Map<string, Suggestion>();
  let failed = 0;
  results.forEach((r, i) => {
    if (r?.status !== "fulfilled") return void failed++;
    r.value.forEach((text, position) => {
      const key = text.toLowerCase();
      if (!seen.has(key)) seen.set(key, { text, from: queries[i]!.from, position });
    });
  });
  return { suggestions: [...seen.values()], failed, total: queries.length };
}
