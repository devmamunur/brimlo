import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bookmark, CalendarClock, Check, CircleX, ExternalLink, Gamepad2, Globe, MessagesSquare, Monitor, Newspaper, Quote, Rocket, Search, Sparkles, ThumbsDown, ThumbsUp, TrendingUp, UsersRound } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, n, post, runTool } from "../api";
import { WatchButton } from "../automation";
import { Badge, Btn, Card, ChartTip, cx, Empty, ErrorBox, Field, Input, Loading, PageTitle, Stat, useSettings, useToast, VideoLink, Warnings } from "../ui";

const KINDS = [["new", "New releases"], ["demos", "Demos"], ["coming_soon", "Coming soon"], ["popular_new", "Popular new"], ["top_rated", "Top rated"]] as const;
const TAGS = ["incremental", "idler", "automation", "mining", "cleaning", "job simulator", "bullet heaven", "tower defense", "cozy"];
const PRICES: [string, number | undefined][] = [["Any price", undefined], ["Free", 0], ["≤ $5", 5], ["≤ $10", 10], ["≤ $15", 15]];

const chip = (on: boolean) => cx("min-h-9 rounded-lg px-3 text-sm font-medium transition", on ? "bg-gold text-bg" : "text-ink2 hover:bg-white/[0.06]");
const usd = (v: number | null | undefined) => (v === null || v === undefined ? "–" : v === 0 ? "Free" : `$${v.toFixed(2)}`);

export function Games({ appid }: { appid?: string }) {
  const [tab, setTab] = useState<"discover" | "check">(appid ? "check" : "discover");
  return (
    <>
      <PageTitle title="Games" icon={Gamepad2} sub="Find and check games outside YouTube: Steam, itch.io and Reddit. Free: uses no YouTube quota." />
      <div className="mb-6 inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10" role="tablist">
        <button role="tab" aria-selected={tab === "discover"} className={chip(tab === "discover")} onClick={() => { setTab("discover"); location.hash = "#/games"; }}>Discover</button>
        <button role="tab" aria-selected={tab === "check"} className={chip(tab === "check")} onClick={() => setTab("check")}>Check a game</button>
      </div>
      {tab === "discover" ? <Discover /> : <CheckGame initial={appid ?? ""} />}
    </>
  );
}

// ---------------- discover ----------------
function Discover() {
  const [kind, setKind] = useState<string>("demos");
  const [tags, setTags] = useState<string[]>(["incremental", "idler"]);
  const [mac, setMac] = useState(false);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const q = useQuery({
    queryKey: ["steam_discover", kind, tags.join(","), mac, price],
    queryFn: () => runTool("steam_discover", { kind, tags, mac_only: mac, limit: 36, ...(price !== undefined ? { max_price_usd: price } : {}) }),
    enabled: tags.length > 0,
    staleTime: 5 * 60_000,
  });
  const itch = useQuery({ queryKey: ["itch_new"], queryFn: () => runTool("itch_new", { tag: "incremental", limit: 12 }), staleTime: 10 * 60_000 });
  const toggle = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const games: any[] = q.data?.data.games ?? [];
  return (
    <div className="space-y-5">
      <Card>
        <div className="space-y-4">
          <Field label="Show">
            <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10">{KINDS.map(([k, l]) => <button key={k} className={chip(kind === k)} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
          </Field>
          <Field label="Steam tags (any)">
            <div className="flex flex-wrap gap-2">{TAGS.map((t) => <button key={t} aria-pressed={tags.includes(t)} onClick={() => toggle(t)} className={cx("min-h-9 rounded-full px-3 text-sm font-medium capitalize ring-1 ring-inset transition", tags.includes(t) ? "bg-teal/15 text-teal ring-teal/40" : "text-ink2 ring-white/10 hover:bg-white/[0.05]")}>{t}</button>)}</div>
          </Field>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Price">
              <div className="inline-flex flex-wrap rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10">{PRICES.map(([l, v]) => <button key={l} className={chip(price === v)} aria-pressed={price === v} onClick={() => setPrice(v)}>{l}</button>)}</div>
            </Field>
            <label className="flex min-h-11 items-center gap-2.5 text-ink2"><input type="checkbox" checked={mac} onChange={(e) => setMac(e.target.checked)} className="size-5 accent-[var(--color-gold)]" /> Mac build only</label>
          </div>
        </div>
      </Card>

      {q.error && <ErrorBox error={q.error} />}
      {q.isLoading ? <Loading rows={4} /> : (
        <Card title="Steam" subtitle={q.data?.summary} icon={Rocket} bodyClass="p-4">
          {!games.length ? <Empty>No games match. Try more tags or another filter.</Empty> : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {games.map((g) => (
                <li key={g.appid}>
                  <a href={`#/games/${g.store_appid}`} className="group block h-full overflow-hidden rounded-2xl bg-white/[0.03] no-underline ring-1 ring-inset ring-white/[0.07] transition hover:-translate-y-0.5 hover:bg-white/[0.05] hover:ring-gold/30">
                    {g.image ? <img src={g.image} alt="" loading="lazy" className="aspect-[231/87] w-full object-cover" /> : <div className="aspect-[231/87] bg-panel2" />}
                    <div className="space-y-2 p-3.5">
                      <div className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-gold">{g.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={g.platforms.mac ? "teal" : "muted"}>{g.platforms.mac ? "Mac ✓" : "Windows"}</Badge>
                        <Badge>{usd(g.price_usd)}</Badge>
                        {g.is_demo && <Badge tone="gold">demo</Badge>}
                        {g.youtube_videos_stored === 0 && <Badge tone="gold" dot>no YT yet</Badge>}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden />{g.released || "TBA"}</span>
                        {g.review_desc && <span>{g.review_desc} · {g.review_pct}%</span>}
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card title="itch.io · newest incremental" subtitle={itch.data?.summary} icon={Globe} bodyClass="p-4">
        {itch.error ? <ErrorBox error={itch.error} /> : !itch.data ? <Loading rows={2} /> : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {itch.data.data.games.map((g: any) => (
              <li key={g.url} className="flex gap-3 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.07]">
                {g.image && <img src={g.image} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <a href={g.url} target="_blank" rel="noreferrer noopener" className="line-clamp-1 font-medium text-ink hover:text-teal">{g.title}</a>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{g.price === "$0.00" ? "Free" : g.price}</Badge>
                    {g.platforms.includes("html") && <Badge tone="teal">browser</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{g.description}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ---------------- check one game ----------------
function CheckGame({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [target, setTarget] = useState(initial);
  const game = useQuery({ queryKey: ["steam_game", target], queryFn: () => runTool("steam_game", { game: target }), enabled: target.length >= 2 });
  const submit = () => { if (q.trim().length >= 2) { setTarget(q.trim()); if (/^\d+$/.test(q.trim())) location.hash = `#/games/${q.trim()}`; } };
  return (
    <div className="space-y-5">
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Game name, Steam app id, or store link" className="flex-1" aria-label="Game" />
          <Btn variant="primary" type="submit" icon={Gamepad2} loading={game.isFetching} disabled={q.trim().length < 2}>Check game</Btn>
        </form>
      </Card>
      {game.error && <ErrorBox error={game.error} />}
      {game.isFetching && !game.data ? <Loading rows={4} /> : game.data ? <GameCard env={game.data} /> : <Card><Empty icon={Gamepad2}>Type a game to see price, Mac support, demo, reviews, players, sentiment and YouTube coverage.</Empty></Card>}
    </div>
  );
}

function GameCard({ env }: { env: any }) {
  const g = env.data;
  const qc = useQueryClient();
  const toast = useToast();
  const { data: s } = useSettings();
  const rev = useMutation({ mutationFn: () => runTool("steam_reviews", { game: String(g.appid), limit: 80 }) });
  const reddit = useMutation({ mutationFn: () => runTool("reddit_search", { query: g.name }) });
  const save = useMutation({
    mutationFn: () => post("/api/ideas", { title: g.name, game: g.name, status: "idea", evidence: { source: "steam_game", appid: g.appid, price: g.price.text, mac: g.platforms.mac, demo: g.brimlo_checks.demo.ok, reviews: g.reviews, players_now: g.players_now, youtube_videos_stored: g.youtube_coverage_local_db.videos, url: g.links.steam } }),
    onSuccess: () => { toast({ title: "Saved to Ideas", body: g.name, tone: "ok" }); qc.invalidateQueries({ queryKey: ["ideas"] }); },
  });
  const checks: [string, any][] = [["Mac", g.brimlo_checks.mac], ["Budget", g.brimlo_checks.budget], ["Demo", g.brimlo_checks.demo], ["Fresh", g.brimlo_checks.fresh]];
  const hist = (g.history ?? []).map((h: any) => ({ day: h.taken_at.slice(5), players: h.players }));
  return (
    <div className="space-y-5">
      {env.warnings?.length ? <Warnings list={env.warnings} /> : null}
      <section className="animate-in overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/70">
        <div className="grid gap-0 lg:grid-cols-[460px_1fr]">
          {g.header_image ? <img src={g.header_image} alt="" className="h-full max-h-72 w-full object-cover lg:max-h-none" /> : <div className="bg-panel2" />}
          <div className="p-6">
            {g.demo_looked_up && <div className="mb-2"><Badge tone="gold">You searched the demo “{g.demo_looked_up.name}”: showing the full game</Badge></div>}
            <h2 className="text-2xl font-bold tracking-tight text-ink">{g.name}</h2>
            <p className="mt-1 text-sm text-muted">{g.developers.join(", ")}{g.release.date ? ` · ${g.release.coming_soon ? "Coming " : ""}${g.release.date}` : ""}</p>
            <p className="mt-3 line-clamp-3 text-ink2">{g.short_description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="gold">{g.price.text}{g.price.discount_percent ? ` (−${g.price.discount_percent}%)` : ""}</Badge>
              <Badge tone={g.platforms.mac ? "teal" : "bad"} dot>{g.platforms.mac ? "Mac build" : "Windows only"}</Badge>
              {g.demo_appids.length > 0 && <Badge tone="teal">demo</Badge>}
              {g.tags.slice(0, 5).map((t: string) => <Badge key={t}>{t}</Badge>)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Btn variant="primary" icon={Bookmark} loading={save.isPending} onClick={() => save.mutate()}>Save as idea</Btn>
              <WatchButton kind="game" value={String(g.appid)} label={g.name} />
              <a href={`#/keywords?q=${encodeURIComponent(g.name)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/[0.05] px-4 font-medium text-ink no-underline ring-1 ring-inset ring-white/10 hover:bg-white/[0.09]"><Sparkles className="size-4" aria-hidden />YouTube research</a>
              {[["Steam", g.links.steam], ["SteamDB", g.links.steamdb], ["ProtonDB", g.links.protondb]].map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium no-underline hover:bg-white/[0.05]">{l}<ExternalLink className="size-3.5" aria-hidden /></a>)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Reviews" icon={ThumbsUp} tone="teal" value={g.reviews.positive_pct === null ? "–" : `${g.reviews.positive_pct}%`} sub={`${g.reviews.score_desc} · ${n(g.reviews.total)}`} />
        <Stat label="Playing now" icon={UsersRound} value={g.players_now === null ? "–" : n(g.players_now)} sub="Steam, this moment" />
        <Stat label="Owners (est.)" icon={TrendingUp} tone="muted" value={g.owners_estimate ? g.owners_estimate.split(" .. ").map((x: string) => compact(Number(x.replace(/,/g, "")))).join("–") : "–"} sub="SteamSpy range" />
        <Stat label="Stored YouTube videos" icon={Monitor} tone={g.youtube_coverage_local_db.videos ? "muted" : "gold"} value={g.youtube_coverage_local_db.videos} sub={g.youtube_coverage_local_db.videos ? "already covered" : "open space?"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Brimlo checks" subtitle="From CLAUDE.md rules" icon={Check}>
          <ul className="space-y-3">
            {checks.map(([k, c]) => (
              <li key={k} className="flex gap-3">
                {c.ok ? <Check className="mt-0.5 size-5 shrink-0 text-teal" aria-label="pass" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-bad" aria-label="needs attention" />}
                <div><div className="font-medium text-ink">{k}</div><div className="text-sm text-ink2">{c.text}</div></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="YouTube coverage" subtitle="Videos already in your database" icon={Monitor}>
          {g.youtube_coverage_local_db.top.length === 0 ? <Empty>None stored yet. Use “YouTube research” above to search YouTube (~102 units).</Empty> : (
            <ul className="space-y-2.5">{g.youtube_coverage_local_db.top.map((v: any) => <li key={v.id}><VideoLink id={v.id} title={v.title} /><div className="text-sm text-muted">{v.channel} · {n(v.views)} views</div></li>)}</ul>
          )}
          {g.youtube_coverage_local_db.competitors.length > 0 && <p className="mt-3 text-sm text-ink2">Tracked competitors who covered it: {g.youtube_coverage_local_db.competitors.join(", ")}</p>}
        </Card>
      </div>

      <Card title="Community sentiment" subtitle="Steam reviews · free" icon={MessagesSquare} right={!rev.data && <Btn size="sm" icon={MessagesSquare} loading={rev.isPending} onClick={() => rev.mutate()}>Analyze reviews</Btn>}>
        {rev.error && <ErrorBox error={rev.error} />}
        {!rev.data ? <p className="text-ink2">Reads the newest reviews and shows what players praise and complain about. Good for your hook and for honest commentary.</p> : (() => {
          const r = rev.data.data;
          const share = r.sample.positive_share;
          return (
            <div className="space-y-5">
              <div>
                <div className="mb-1.5 flex justify-between text-sm"><span className="text-ink2">Positive in last {r.sample.size} reviews</span><b className="tabular-nums text-ink">{share === null ? "–" : `${Math.round(share * 100)}%`}</b></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-bad/30" role="img" aria-label={`${Math.round((share ?? 0) * 100)}% positive`}><div className="h-full rounded-full bg-teal" style={{ width: `${(share ?? 0) * 100}%` }} /></div>
                <p className="mt-1.5 text-xs text-muted">Median playtime at review: {r.sample.median_playtime_hours ?? "–"} h</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><ThumbsUp className="size-4 text-teal" aria-hidden />Players praise</div>
                  <div className="flex flex-wrap gap-1.5">{r.praise.length ? r.praise.map((t: string) => <Badge key={t} tone="teal">{t}</Badge>) : <span className="text-sm text-muted">–</span>}</div>
                  <ul className="mt-3 space-y-2">{r.quotes.positive.map((x: string, i: number) => <li key={i} className="flex gap-2 text-sm text-ink2"><Quote className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />{x}</li>)}</ul>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><ThumbsDown className="size-4 text-bad" aria-hidden />Players complain about</div>
                  <div className="flex flex-wrap gap-1.5">{r.complaints.length ? r.complaints.map((t: string) => <Badge key={t} tone="bad">{t}</Badge>) : <span className="text-sm text-muted">–</span>}</div>
                  <ul className="mt-3 space-y-2">{r.quotes.negative.map((x: string, i: number) => <li key={i} className="flex gap-2 text-sm text-ink2"><Quote className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />{x}</li>)}</ul>
                </div>
              </div>
              <p className="text-xs text-muted">{r.method}</p>
            </div>
          );
        })()}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Reddit" subtitle="r/incremental_games · official API" icon={MessagesSquare} right={s?.reddit?.configured && !reddit.data && <Btn size="sm" loading={reddit.isPending} onClick={() => reddit.mutate()}>Search Reddit</Btn>}>
          {!s?.reddit?.configured ? <Empty>Optional. Add a free Reddit app in <a href="#/settings">Settings → Reddit</a> to see posts and mood about this game.</Empty> : reddit.error ? <ErrorBox error={reddit.error} /> : !reddit.data ? <p className="text-ink2">Find posts about {g.name} and their mood.</p> : (
            <>
              <p className="mb-3 text-sm text-ink2">{reddit.data.summary}</p>
              <ul className="space-y-2.5">{reddit.data.data.posts.slice(0, 8).map((p: any) => <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer noopener" className="font-medium text-ink hover:text-teal">{p.title}</a><div className="text-xs text-muted">{n(p.score)} upvotes · {p.comments} comments · {p.created.slice(0, 10)}</div></li>)}</ul>
            </>
          )}
        </Card>
        <Card title="Latest news" subtitle="Steam announcements" icon={Newspaper}>
          {!g.latest_news.length ? <Empty>No news.</Empty> : <ul className="space-y-2.5">{g.latest_news.map((x: any) => <li key={x.url}><a href={x.url} target="_blank" rel="noreferrer noopener" className="font-medium text-ink hover:text-teal">{x.title}</a><div className="text-xs text-muted">{x.date} · {x.feed}</div></li>)}</ul>}
        </Card>
      </div>

      <Card title="Players over time" subtitle="One snapshot each day you check this game" icon={TrendingUp}>
        {hist.length < 2 ? <Empty icon={TrendingUp}>Check this game again on another day to build a trend.</Empty> : (
          <div className="h-48" role="img" aria-label={`Players over ${hist.length} days`}>
            <ResponsiveContainer>
              <AreaChart data={hist} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs><linearGradient id="plFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-s2)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-s2)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--color-muted)", strokeDasharray: "3 3" }} />
                <Area type="monotone" dataKey="players" name="Players" stroke="var(--color-s2)" strokeWidth={2} fill="url(#plFill)" dot={{ r: 4, fill: "var(--color-s2)", stroke: "var(--color-panel)", strokeWidth: 2 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
