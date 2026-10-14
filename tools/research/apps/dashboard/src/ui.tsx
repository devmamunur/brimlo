import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Info, LoaderCircle, Play, TriangleAlert, X, Zap, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { api, type Envelope } from "./api";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- surfaces ----------
export function Card({ title, subtitle, icon: Icon, right, children, className, bodyClass }: { title?: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("animate-in relative rounded-2xl border border-white/[0.07] bg-panel/70 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04),0_24px_48px_-28px_rgb(0_0_0/0.7)] backdrop-blur-sm", className)}>
      {(title || right) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold/15 to-gold2/5 text-gold ring-1 ring-gold/20">
                <Icon className="size-[18px]" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
            </div>
          </div>
          {right}
        </header>
      )}
      <div className={cx("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function PageTitle({ title, sub, icon: Icon, actions }: { title: string; sub?: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <header className="animate-in mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="mt-1 hidden size-12 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold2 text-bg shadow-lg shadow-gold/20 sm:grid">
            <Icon className="size-6" aria-hidden />
          </span>
        )}
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
          {sub && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-ink2">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

// ---------- controls ----------
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Btn({ variant = "secondary", size = "md", icon: Icon, loading, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant | "gold"; size?: "sm" | "md"; icon?: LucideIcon; loading?: boolean }) {
  const v = {
    primary: "bg-gradient-to-r from-gold to-gold2 text-bg font-semibold shadow-lg shadow-gold2/20 hover:brightness-110 active:brightness-95",
    gold: "bg-gradient-to-r from-gold to-gold2 text-bg font-semibold shadow-lg shadow-gold2/20 hover:brightness-110 active:brightness-95",
    secondary: "bg-white/[0.05] text-ink ring-1 ring-inset ring-white/10 hover:bg-white/[0.09]",
    ghost: "text-ink2 hover:bg-white/[0.06] hover:text-ink",
    danger: "text-bad ring-1 ring-inset ring-bad/30 hover:bg-bad/10",
  }[variant];
  const s = size === "sm" ? "min-h-9 gap-1.5 px-3 text-sm" : "min-h-11 gap-2 px-4 text-[15px]";
  return (
    <button {...p} className={cx("inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-45", v, s, className)}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Input({ icon: Icon, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }) {
  return (
    <div className={cx("relative", className)}>
      {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />}
      <input {...p} className={cx("min-h-11 w-full rounded-xl border border-white/10 bg-bg/60 py-2 text-ink placeholder:text-muted/80 transition focus:border-gold/50 focus:bg-bg focus:outline-none focus:ring-4 focus:ring-gold/10", Icon ? "pl-10 pr-3" : "px-3.5")} />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

const TONES = {
  muted: "bg-white/[0.04] text-ink2 ring-white/10",
  gold: "bg-gold/10 text-gold ring-gold/25",
  teal: "bg-teal/10 text-teal ring-teal/25",
  bad: "bg-bad/10 text-bad ring-bad/25",
} as const;
export type Tone = keyof typeof TONES;
export const Badge = ({ children, tone = "muted", dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) => (
  <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-inset", TONES[tone])}>
    {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
    {children}
  </span>
);

// ---------- feedback ----------
export const ErrorBox = ({ error }: { error: unknown }) => (
  <div role="alert" className="flex items-start gap-3 rounded-xl bg-bad/10 p-3.5 text-bad ring-1 ring-inset ring-bad/30">
    <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
    <span>{error instanceof Error ? error.message : String(error)}</span>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("animate-pulse rounded-xl bg-white/[0.06]", className)} aria-hidden />;
export const Loading = ({ rows = 3 }: { rows?: number; what?: string }) => (
  <div className="space-y-3" role="status" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={cx("h-14", i === 0 && "h-24")} />)}
  </div>
);

export const Empty = ({ children, icon: Icon = Info, action }: { children: ReactNode; icon?: LucideIcon; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 px-6 py-8 text-center text-muted">
    <span className="grid size-10 place-items-center rounded-full bg-white/[0.04] ring-1 ring-white/10"><Icon className="size-5" aria-hidden /></span>
    <div className="max-w-md text-[15px]">{children}</div>
    {action}
  </div>
);

export const Warnings = ({ list }: { list?: string[] }) =>
  list?.length ? (
    <ul className="space-y-1.5 rounded-xl bg-gold/[0.06] p-3.5 text-sm text-ink2 ring-1 ring-inset ring-gold/20">
      {list.map((w) => (
        <li key={w} className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />{w}</li>
      ))}
    </ul>
  ) : null;

// ---------- toasts ----------
interface Toast { id: number; title: string; body?: string; tone: "ok" | "bad" | "info" }
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {list.map((t) => {
          const Icon = t.tone === "bad" ? TriangleAlert : t.tone === "ok" ? CircleCheck : Info;
          return (
            <div key={t.id} className="animate-in pointer-events-auto flex gap-3 rounded-2xl border border-white/10 bg-panel2/95 p-4 shadow-2xl shadow-black/50 backdrop-blur">
              <Icon className={cx("mt-0.5 size-5 shrink-0", t.tone === "bad" ? "text-bad" : t.tone === "ok" ? "text-teal" : "text-gold")} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">{t.title}</div>
                {t.body && <div className="mt-0.5 text-sm text-ink2">{t.body}</div>}
              </div>
              <button className="text-muted hover:text-ink" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))} aria-label="Close"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Toast for a tool answer: summary + units spent. */
export function useToolToast() {
  const toast = useToast();
  return useCallback(
    (title: string, env: Envelope) =>
      toast({ title, body: `${env.quota_used ? `Used ${env.quota_used} units` : env.cached ? "From cache, 0 units" : "0 units"}${env.source === "demo" ? " · DEMO data" : ""}`, tone: env.warnings.some((w) => /quota/i.test(w)) ? "info" : "ok" }),
    [toast],
  );
}

// ---------- data display ----------
export function Progress({ label, value, goal, unit = "", note }: { label: string; value: number | null; goal: number; unit?: string; note?: string }) {
  const pct = value === null ? 0 : Math.min(100, (value / goal) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink2">{label}</span>
        <span className="tabular-nums text-ink">
          <b className="text-lg font-semibold">{value === null ? "unknown" : value.toLocaleString("en-US")}</b> <span className="text-sm text-muted">/ {goal.toLocaleString("en-US")} {unit}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold2 shadow-[0_0_12px_rgb(255_200_61/0.5)] transition-[width] duration-700" style={{ width: `${Math.max(pct, value ? 1.5 : 0)}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted tabular-nums">
        <span>{pct.toFixed(1)}%</span>
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}

/** Radial ring. The number is always printed in the middle, so meaning never depends on color. */
export function Ring({ value, max, size = 120, stroke = 10, label, sub }: { value: number; max: number; size?: number; stroke?: number; label: ReactNode; sub?: ReactNode }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const raw = Math.max(0, Math.min(1, max ? value / max : 0));
  // a tiny value would draw as a lone dot; show a short arc instead (the number in the middle stays exact)
  const pct = raw > 0 && raw < 0.03 ? 0.03 : raw;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${typeof label === "string" ? label : ""} ${Math.round(raw * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--color-gold)" /><stop offset="100%" stopColor="var(--color-gold2)" /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xl font-bold tabular-nums text-ink">{label}</div>
          {sub && <div className="text-xs text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "gold" }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon; tone?: "gold" | "teal" | "muted" }) {
  const t = { gold: "text-gold bg-gold/10 ring-gold/20", teal: "text-teal bg-teal/10 ring-teal/20", muted: "text-ink2 bg-white/[0.05] ring-white/10" }[tone];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted">{label}</span>
        {Icon && <span className={cx("grid size-8 place-items-center rounded-lg ring-1 ring-inset", t)}><Icon className="size-4" aria-hidden /></span>}
      </div>
      <div className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-2 text-sm text-ink2">{sub}</div>}
    </div>
  );
}

/** Score 0–100 with a word, so color is never the only signal. */
export function Score({ value, label }: { value: number; label: string }) {
  const tone: Tone = label === "strong" || label === "low" ? "teal" : label === "ok" || label === "medium" ? "gold" : "bad";
  return <Badge tone={tone} dot>{value}/100 · {label}</Badge>;
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings"), staleTime: 15_000 });
}

/** Two-step button for anything that spends YouTube quota. In demo mode it runs at once (costs nothing). */
export function CostButton({ cost, onRun, disabled, children, variant = "primary", icon, loading }: { cost: number; onRun: () => void; disabled?: boolean; children: ReactNode; variant?: "primary" | "secondary" | "gold" | "ghost"; icon?: LucideIcon; loading?: boolean }) {
  const { data } = useSettings();
  const [armed, setArmed] = useState(false);
  const free = data?.mode === "demo" || cost === 0;
  const units = `${cost} unit${cost === 1 ? "" : "s"}`;
  return (
    <Btn
      variant={armed ? "danger" : variant === "ghost" ? "secondary" : variant}
      icon={armed ? Zap : icon}
      loading={loading}
      disabled={disabled}
      title={free ? "Free" : `Uses about ${units} of today's YouTube quota`}
      onClick={() => {
        if (free || armed) {
          setArmed(false);
          onRun();
        } else {
          setArmed(true);
          setTimeout(() => setArmed(false), 6000);
        }
      }}
    >
      {armed ? `Confirm · ~${units}` : children}
      {!armed && !free && <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-xs font-semibold tabular-nums">~{cost}</span>}
    </Btn>
  );
}

export function DataTable({ columns, data, empty = "Nothing here yet.", onRow, initialSort, minW = 640 }: { columns: ColumnDef<any, any>[]; data: any[]; empty?: ReactNode; onRow?: (r: any) => void; initialSort?: SortingState; minW?: number }) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const t = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  if (!data.length) return <Empty>{empty}</Empty>;
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl ring-1 ring-inset ring-white/[0.07]">
      <table className="w-full border-collapse text-left" style={{ minWidth: minW }}>
        <thead className="sticky top-0 z-10 bg-panel2/95 backdrop-blur">
          {t.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="whitespace-nowrap px-3.5 py-3 text-xs font-semibold uppercase tracking-wider text-muted" aria-sort={h.column.getIsSorted() === "asc" ? "ascending" : h.column.getIsSorted() === "desc" ? "descending" : "none"}>
                  {h.column.getCanSort() ? (
                    <button className="inline-flex items-center gap-1 uppercase hover:text-ink" onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <span aria-hidden className={h.column.getIsSorted() ? "text-gold" : "opacity-40"}>{{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string] ?? "↕"}</span>
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {t.getRowModel().rows.map((r) => (
            <tr key={r.id} className={cx("transition-colors hover:bg-white/[0.035]", onRow && "cursor-pointer")} onClick={() => onRow?.(r.original)}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="px-3.5 py-3 align-middle tabular-nums text-ink">{flexRender(c.column.columnDef.cell, c.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Thumb = ({ src, alt }: { src?: string; alt: string }) =>
  src && !src.includes("/demo") ? (
    <img src={src} alt={alt} loading="lazy" className="aspect-video w-28 rounded-lg object-cover ring-1 ring-white/10" />
  ) : (
    <div className="grid aspect-video w-28 place-items-center rounded-lg bg-gradient-to-br from-panel2 to-bg ring-1 ring-white/10"><Play className="size-5 text-muted" aria-hidden /></div>
  );

export const VideoLink = ({ id, title }: { id: string; title: string }) => (
  <a href={`#/video/${id}`} className="font-medium text-ink no-underline decoration-teal/60 hover:text-teal hover:underline">{title}</a>
);

export function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-panel2/95 px-3.5 py-2.5 text-sm shadow-2xl shadow-black/50 backdrop-blur">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink2">
          <span className="inline-block size-2.5 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="tabular-nums text-ink">{fmt ? fmt(p.value) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

export const exportLink = (table: string, format: "csv" | "json") => `/api/export?table=${table}&format=${format}`;
