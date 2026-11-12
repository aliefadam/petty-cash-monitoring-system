import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  /** kolom utama dipakai sebagai judul di tampilan card (mobile) */
  primary?: boolean;
  hideOnCard?: boolean;
}

interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
  headerAction?: ReactNode;
  pageSize?: number;
  emptyTitle?: string;
  emptyText?: string;
}

export function DataTable<T>({
  title,
  subtitle,
  data,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Cari data...",
  onRefresh,
  actions,
  toolbar,
  headerAction,
  pageSize = 8,
  emptyTitle = "Belum ada data",
  emptyText = "Data akan tampil di sini.",
}: DataTableProps<T>) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) => searchText(r).toLowerCase().includes(q));
  }, [data, query, searchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  useEffect(() => setPage(1), [query]);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    onRefresh?.();
    timer.current = window.setTimeout(() => {
      setRefreshing(false);
      toast.success("Data diperbarui", "Data terbaru berhasil dimuat dari database.");
    }, 750);
  };

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary && !c.hideOnCard);

  const pages = pageList(current, totalPages);
  const from = filtered.length ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(current * pageSize, filtered.length);

  return (
    <div className="overflow-hidden rounded-3xl border border-blue-100/70 bg-white shadow-xl shadow-blue-900/5">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-blue-50 p-4 sm:p-6">
        {(title || headerAction) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>}
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group relative flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-10 pl-11 text-sm font-medium text-slate-800 transition-all duration-300 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            <button
              onClick={() => setQuery("")}
              className={cn(
                "absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-xs text-slate-400 transition-all duration-300 hover:bg-blue-50 hover:text-blue-600",
                query ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
              )}
            >
              <Icon name="cross" />
            </button>
          </div>
          {toolbar && <div className="sm:w-56">{toolbar}</div>}
          <button
            onClick={refresh}
            title="Refresh data"
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
          >
            <Icon name="refresh" className={cn("text-base", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {refreshing ? (
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="animate-fade-in flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-blue-100 to-sky-50 text-3xl text-blue-500">
              <Icon name={query ? "search-alt" : "folder-open"} />
            </div>
            <p className="text-base font-bold text-slate-800">{query ? "Data tidak ditemukan" : emptyTitle}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {query ? `Tidak ada hasil untuk "${query}". Coba kata kunci lain.` : emptyText}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="thin-scroll hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-blue-50/50 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    <th className="w-14 px-6 py-3.5">No</th>
                    {columns.map((c) => (
                      <th
                        key={c.key}
                        className={cn("px-4 py-3.5", c.align === "right" && "text-right", c.align === "center" && "text-center")}
                      >
                        {c.header}
                      </th>
                    ))}
                    {actions && <th className="px-6 py-3.5 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody key={`${current}-${query}`}>
                  {rows.map((row, i) => (
                    <tr
                      key={rowKey(row)}
                      style={{ animationDelay: `${i * 35}ms` }}
                      className="animate-fade-up group border-t border-slate-100 transition-colors duration-300 hover:bg-blue-50/50"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-400">{(current - 1) * pageSize + i + 1}</td>
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "px-4 py-4 align-middle text-slate-700",
                            c.align === "right" && "text-right",
                            c.align === "center" && "text-center",
                            c.className
                          )}
                        >
                          {c.cell(row, i)}
                        </td>
                      ))}
                      {actions && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">{actions(row)}</div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div key={`m-${current}-${query}`} className="space-y-3 bg-blue-50/30 p-4 md:hidden">
              {rows.map((row, i) => (
                <div
                  key={rowKey(row)}
                  style={{ animationDelay: `${i * 45}ms` }}
                  className="animate-fade-up rounded-2xl border border-blue-100/80 bg-white p-4 shadow-sm transition-shadow duration-300 active:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-sm font-bold text-slate-800">{primary.cell(row, i)}</div>
                    <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600">
                      #{(current - 1) * pageSize + i + 1}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-2.5 border-t border-dashed border-blue-100 pt-3">
                    {secondary.map((c) => (
                      <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                        <dt className="shrink-0 text-xs font-semibold text-slate-400">{c.header}</dt>
                        <dd className="min-w-0 text-right font-medium text-slate-700">{c.cell(row, i)}</dd>
                      </div>
                    ))}
                  </dl>
                  {actions && <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">{actions(row)}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!refreshing && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-3 border-t border-blue-50 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="text-xs font-medium text-slate-500">
            Menampilkan <span className="font-bold text-slate-700">{from}-{to}</span> dari{" "}
            <span className="font-bold text-slate-700">{filtered.length}</span> data
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <PageBtn disabled={current === 1} onClick={() => setPage(current - 1)}>
                <Icon name="angle-left" />
              </PageBtn>
              {pages.map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="px-1 text-slate-400">
                    …
                  </span>
                ) : (
                  <PageBtn key={p} active={p === current} onClick={() => setPage(p as number)}>
                    {p}
                  </PageBtn>
                )
              )}
              <PageBtn disabled={current === totalPages} onClick={() => setPage(current + 1)}>
                <Icon name="angle-right" />
              </PageBtn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-bold transition-all duration-300",
        active
          ? "bg-linear-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30"
          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}

function pageList(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push("...");
    out.push(n);
  });
  return out;
}
