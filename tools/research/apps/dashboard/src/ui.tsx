import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { api } from "./api";

export const Card = ({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-panel p-5 ${className}`}>
    {(title || right) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {right}
      </div>
    )}
    {children}
  </section>
);

export const PageTitle = ({ title, sub }: { title: string; sub?: string }) => (
  <header className="mb-6">
    <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
    {sub && <p className="mt-1 max-w-3xl text-ink2">{sub}</p>}
  </header>
);

export function Btn({ variant = "ghost", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "danger" }) {
  const v = {
    gold: "bg-gradient-to-r from-gold to-gold2 text-bg font-semibold hover:brightness-110",
    ghost: "border border-line text-ink hover:bg-panel2",
    danger: "border border-bad/50 text-bad hover:bg-bad/10",
  }[variant];
  return <button {...p} className={`min-h-11 rounded-xl px-4 py-2 text-base transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`min-h-11 rounded-xl border border-line bg-bg px-3 py-2 text-ink placeholder:text-muted ${p.className ?? ""}`} />;

export const Badge = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "gold" | "teal" | "bad" }) => {
  const t = { muted: "border-line text-ink2", gold: "border-gold/50 text-gold", teal: "border-teal/50 text-teal", bad: "border-bad/50 text-bad" }[tone];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-sm ${t}`}>{children}</span>;
};

export const ErrorBox = ({ error }: { error: unknown }) => (
  <div role="alert" className="rounded-xl border border-bad/50 bg-bad/10 p-3 text-bad">
    ⚠ {error instanceof Error ? error.message : String(error)}
  </div>
);
export const Loading = ({ what = "Loading" }: { what?: string }) => <p className="text-muted">{what}…</p>;
export const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">{children}</p>;

export const Warnings = ({ list }: { list?: string[] }) =>
  list?.length ? (
    <ul className="mb-3 space-y-1 rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm text-ink2">
      {list.map((w) => (
        <li key={w}>⚠ {w}</li>
      ))}
    </ul>
  ) : null;

/** Progress bar. Value text is always shown, so meaning never depends on color. */
export function Progress({ label, value, goal, unit = "", note }: { label: string; value: number | null; goal: number; unit?: string; note?: string }) {
  const pct = value === null ? 0 : Math.min(100, (value / goal) * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-ink2">{label}</span>
        <span className="font-semibold text-ink">
          {value === null ? "unknown" : value.toLocaleString("en-US")} <span className="font-normal text-muted">/ {goal.toLocaleString("en-US")} {unit}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold2" style={{ width: `${Math.max(pct, value ? 1.5 : 0)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-sm text-muted">
        <span>{pct.toFixed(1)}%</span>
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}

export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) => (
  <div className="rounded-xl border border-line bg-bg p-4">
    <div className="text-sm text-muted">{label}</div>
    <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
    {sub && <div className="mt-1 text-sm text-ink2">{sub}</div>}
  </div>
);

/** Score pill 0–100 with a word, so color is never the only signal. */
export function Score({ value, label }: { value: number; label: string }) {
  const tone = label === "strong" || label === "low" ? "teal" : label === "ok" || label === "medium" ? "gold" : "bad";
  return (
    <Badge tone={tone as any}>
      {value}/100 · {label}
    </Badge>
  );
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api<any>("/api/settings"), staleTime: 15_000 });
}

/**
 * Two-step button for anything that spends YouTube quota. In demo mode it runs at once (costs nothing).
 */
export function CostButton({ cost, onRun, disabled, children, variant = "gold" }: { cost: number; onRun: () => void; disabled?: boolean; children: ReactNode; variant?: "gold" | "ghost" }) {
  const { data } = useSettings();
  const [armed, setArmed] = useState(false);
  const free = data?.mode === "demo" || cost === 0;
  return (
    <Btn
      variant={armed ? "danger" : variant}
      disabled={disabled}
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
      {armed ? `Confirm: spends ~${cost} unit${cost === 1 ? "" : "s"}` : free ? children : `${children} (~${cost} unit${cost === 1 ? "" : "s"})`}
    </Btn>
  );
}

export function DataTable({ columns, data, empty = "Nothing here yet.", onRow, initialSort, minW = 640 }: { columns: ColumnDef<any, any>[]; data: any[]; empty?: string; onRow?: (r: any) => void; initialSort?: SortingState; minW?: number }) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const t = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  if (!data.length) return <Empty>{empty}</Empty>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left" style={{ minWidth: minW }}>
        <thead className="bg-panel2 text-sm text-ink2">
          {t.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="whitespace-nowrap px-3 py-2.5 font-medium" aria-sort={h.column.getIsSorted() === "asc" ? "ascending" : h.column.getIsSorted() === "desc" ? "descending" : "none"}>
                  {h.column.getCanSort() ? (
                    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <span aria-hidden className="text-muted">{{ asc: "▲", desc: "▼" }[h.column.getIsSorted() as string] ?? "↕"}</span>
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {t.getRowModel().rows.map((r) => (
            <tr key={r.id} className={`border-t border-line ${onRow ? "cursor-pointer hover:bg-panel2" : ""}`} onClick={() => onRow?.(r.original)}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="px-3 py-2.5 align-middle">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Thumb = ({ src, alt }: { src?: string; alt: string }) =>
  src && !src.includes("/demo") ? <img src={src} alt={alt} loading="lazy" className="h-14 w-24 rounded-lg object-cover" /> : <div className="grid h-14 w-24 place-items-center rounded-lg bg-panel2 text-xs text-muted">no image</div>;

export const VideoLink = ({ id, title }: { id: string; title: string }) => (
  <a href={`#/video/${id}`} className="font-medium text-ink hover:text-teal hover:underline">
    {title}
  </a>
);

/** Tooltip for Recharts, in text tokens. */
export function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-panel2 px-3 py-2 text-sm shadow-lg">
      <div className="mb-1 text-ink2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          {p.name}: <b>{fmt ? fmt(p.value) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

export const exportLink = (table: string, format: "csv" | "json") => `/api/export?table=${table}&format=${format}`;
