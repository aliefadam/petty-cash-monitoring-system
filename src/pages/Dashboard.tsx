import { useMemo } from "react";
import { PageHeader } from "../components/layout/AdminLayout";
import { Icon } from "../components/ui/Icon";
import { Badge } from "../components/ui/Badge";
import { BarChart, DonutChart, useCountUp } from "../components/ui/Charts";
import { Button } from "../components/ui/Button";
import { MONTHS, MONTHS_SHORT, formatDate, formatRupiah } from "../lib/format";
import { navigate } from "../lib/router";
import { cn } from "../utils/cn";
import { usePage } from "@inertiajs/react";
import type { Reconciliation, Reference } from "../lib/types";

const COLORS: Record<string, string> = {
  OP: "#2563eb",
  TX: "#0ea5e9",
  PF: "#6366f1",
  BL: "#8b5cf6",
  RE: "#14b8a6",
  PAY: "#10b981",
  PO: "#f59e0b",
};

function StatCard({
  label,
  value,
  format,
  icon,
  note,
  featured,
  tone,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  icon: string;
  note: string;
  featured?: boolean;
  tone: string;
}) {
  const v = useCountUp(value);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-5 transition-all duration-500 hover:-translate-y-1.5 sm:p-6",
        featured
          ? "bg-linear-to-br from-blue-700 via-blue-600 to-sky-500 text-white shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40"
          : "border border-blue-100/70 bg-white shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/10"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150",
          featured ? "bg-white/20" : "bg-blue-100/70"
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className={cn("text-xs font-bold tracking-wide uppercase", featured ? "text-blue-100" : "text-slate-500")}>{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-extrabold sm:text-[1.65rem]", featured ? "text-white" : "text-slate-800")}>
            {format(Math.round(v))}
          </p>
        </div>
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl shadow-lg transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110",
            featured ? "bg-white/20 text-white ring-1 ring-white/30" : cn("bg-linear-to-br text-white", tone)
          )}
        >
          <Icon name={icon} />
        </span>
      </div>
      <p className={cn("relative mt-3 text-xs font-medium", featured ? "text-blue-100" : "text-slate-500")}>{note}</p>
    </div>
  );
}

const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);

export default function Dashboard() {
  const { reconciliations: recs, references: refs } = usePage<{ reconciliations: Reconciliation[]; references: Reference[] }>().props;

  const stats = useMemo(() => {
    const txs = recs.flatMap((r) => r.transactions);
    const detected = txs.filter((t) => (t.keywords ?? []).length > 0);
    const debit = txs.filter((t) => t.type === "DB").reduce((s, t) => s + t.amount, 0);
    const credit = txs.filter((t) => t.type === "CR").reduce((s, t) => s + t.amount, 0);
    const refTotal = refs.reduce((s, r) => s + r.amount, 0);

    const kw: Record<string, number> = {};
    for (const t of detected)
      for (const k of t.keywords ?? []) {
        const key = k.kind === "po" ? "PO" : k.prefix!;
        kw[key] = (kw[key] || 0) + 1;
      }

    const sorted = [...recs].sort((a, b) => a.year - b.year || a.month - b.month).slice(-6);
    const bars = sorted.map((r) => ({
      label: `${MONTHS_SHORT[r.month - 1]} ${String(r.year).slice(2)}`,
      a: r.transactions.filter((t) => t.type === "DB").reduce((s, t) => s + t.amount, 0),
      b: r.transactions.filter((t) => t.type === "CR").reduce((s, t) => s + t.amount, 0),
    }));

    return { txs, detected, debit, credit, refTotal, kw, bars, sorted };
  }, [recs, refs]);

  const donut = Object.entries(COLORS)
    .map(([label, color]) => ({ label, color, value: stats.kw[label] || 0 }))
    .filter((d) => d.value > 0);

  const rate = stats.txs.length ? Math.round((stats.detected.length / stats.txs.length) * 100) : 0;
  const recent = [...refs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan monitoring petty cash procurement PT. Buana Multi Teknik."
        action={
          <Button icon="plus" onClick={() => navigate("/rekonsiliasi")}>
            Rekonsiliasi Baru
          </Button>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <StatCard
          featured
          label="Total Pengeluaran"
          value={stats.debit}
          format={formatRupiah}
          icon="arrow-small-up"
          tone=""
          note={`Dari ${recs.length} bulan rekonsiliasi`}
        />
        <StatCard
          label="Total Pemasukan"
          value={stats.credit}
          format={formatRupiah}
          icon="arrow-small-down"
          tone="from-emerald-500 to-teal-400 shadow-emerald-500/30"
          note="Top up & kredit rekening"
        />
        <StatCard
          label="Transaksi Terdeteksi"
          value={stats.detected.length}
          format={num}
          icon="badge-check"
          tone="from-blue-600 to-sky-400 shadow-blue-500/30"
          note={`${rate}% dari ${num(stats.txs.length)} transaksi`}
        />
        <StatCard
          label="No. Referensi"
          value={refs.length}
          format={num}
          icon="hastag"
          tone="from-indigo-500 to-blue-400 shadow-indigo-500/30"
          note={`Total nilai ${formatRupiah(stats.refTotal)}`}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3 sm:mt-6 sm:gap-6">
        <div className="animate-fade-up rounded-3xl border border-blue-100/70 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6 lg:col-span-2" style={{ animationDelay: "200ms" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Pengeluaran vs Pemasukan</h3>
              <p className="text-xs text-slate-500">Hasil rekonsiliasi 6 bulan terakhir</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
              <Icon name="chart-histogram" />
            </span>
          </div>
          {stats.bars.length ? (
            <BarChart data={stats.bars} aLabel="Pengeluaran" bLabel="Pemasukan" />
          ) : (
            <Empty text="Belum ada data rekonsiliasi" />
          )}
        </div>

        <div className="animate-fade-up rounded-3xl border border-blue-100/70 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6" style={{ animationDelay: "280ms" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Kata Kunci Terdeteksi</h3>
              <p className="text-xs text-slate-500">Distribusi prefix & nomor PO</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-600">
              <Icon name="chart-pie" />
            </span>
          </div>
          {donut.length ? <DonutChart data={donut} centerLabel="Kata kunci" /> : <Empty text="Belum ada kata kunci terdeteksi" />}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 sm:mt-6 sm:gap-6">
        <div className="animate-fade-up rounded-3xl border border-blue-100/70 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6" style={{ animationDelay: "340ms" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Cakupan Deteksi per Bulan</h3>
              <p className="text-xs text-slate-500">Transaksi yang memiliki kata kunci</p>
            </div>
            <button onClick={() => navigate("/rekonsiliasi")} className="cursor-pointer text-xs font-bold text-blue-600 transition-colors hover:text-blue-800">
              Lihat semua
            </button>
          </div>
          <div className="space-y-4">
            {stats.sorted.length === 0 && <Empty text="Belum ada data rekonsiliasi" />}
            {[...stats.sorted].reverse().map((r) => {
              const d = r.transactions.filter((t) => (t.keywords ?? []).length).length;
              const p = r.transactions.length ? Math.round((d / r.transactions.length) * 100) : 0;
              return (
                <button key={r.id} onClick={() => navigate(`/rekonsiliasi/${r.id}`)} className="group block w-full cursor-pointer text-left">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700 transition-colors group-hover:text-blue-600">
                      {MONTHS[r.month - 1]} {r.year}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {d}/{r.transactions.length} transaksi · <b className="text-blue-600">{p}%</b>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                    <div className="h-full rounded-full bg-linear-to-r from-blue-600 to-sky-400 transition-all duration-1000" style={{ width: `${p}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="animate-fade-up rounded-3xl border border-blue-100/70 bg-white p-5 shadow-xl shadow-blue-900/5 sm:p-6" style={{ animationDelay: "400ms" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-800">No. Referensi Terbaru</h3>
              <p className="text-xs text-slate-500">5 referensi terakhir dibuat</p>
            </div>
            <button onClick={() => navigate("/referensi")} className="cursor-pointer text-xs font-bold text-blue-600 transition-colors hover:text-blue-800">
              Lihat semua
            </button>
          </div>
          <div className="space-y-2">
            {recent.length === 0 && <Empty text="Belum ada nomor referensi" />}
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors duration-300 hover:bg-blue-50/70">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-sky-400 text-lg text-white shadow-md shadow-blue-500/25">
                  <Icon name="receipt" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{r.description}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <Badge tone="blue" className="font-mono tracking-wider">{r.code}</Badge>
                  <p className="mt-1 text-xs font-bold text-slate-700">{formatRupiah(r.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-400">
        <Icon name="inbox-in" />
      </span>
      <p className="text-sm font-semibold text-slate-500">{text}</p>
    </div>
  );
}
