import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PageHeader } from "../components/layout/AdminLayout";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { Badge, PREFIX_TONE } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { MONTHS, formatDate, formatRupiah } from "../lib/format";
import { extractKeywords, PREFIXES } from "../lib/parser";
import { navigate } from "../lib/router";
import type { DetectedCodeDetail, Keyword, Transaction } from "../lib/types";
import { cn } from "../utils/cn";
import { router, usePage } from "@inertiajs/react";
import type { Reconciliation, Reference } from "../lib/types";

const FILTERS = [
  { value: "all", label: "Semua transaksi", icon: "list-check" },
  { value: "detected", label: "Terdeteksi kata kunci", icon: "badge-check" },
  { value: "none", label: "Tanpa kata kunci", icon: "cross-circle" },
  ...PREFIXES.map((p) => ({ value: p, label: `Prefix ${p}-`, icon: "hastag" })),
  { value: "PO", label: "Nomor PO", icon: "document" },
];

const kwKey = (k: Keyword) => (k.kind === "po" ? "PO" : k.prefix!);
const formatDetailMoney = (amount: number, currency?: string | null) => {
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    try {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount || 0);
    } catch {
      // Gunakan format rupiah bila kode mata uang pada data lama tidak valid.
    }
  }
  return formatRupiah(amount);
};

function KeywordChip({ k }: { k: Keyword }) {
  return (
    <Badge tone={PREFIX_TONE[kwKey(k)]} className="font-mono tracking-wide">
      {k.value}
    </Badge>
  );
}

function Highlight({ text, keywords }: { text: string; keywords: Keyword[] }) {
  if (!keywords.length) return <>{text}</>;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const re = new RegExp(`(${keywords.map((k) => esc(k.value)).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-md bg-linear-to-r from-blue-100 to-sky-100 px-1 py-0.5 font-bold text-blue-700">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export default function RekonsiliasiDetail() {
  const { reconciliation: rec, references: refs } = usePage<{ reconciliation: Reconciliation; references: Reference[] }>().props;

  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);
  const [detailResults, setDetailResults] = useState<DetectedCodeDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open || !selected) return;

    let cancelled = false;
    const codes = [...new Set(selected.keywords.map((keyword) => keyword.value))];
    setDetailLoading(true);
    setDetailResults([]);

    Promise.all(codes.map(async (code) => {
      try {
        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
        const response = await axios.post<DetectedCodeDetail>("/rekonsiliasi/lookup-detail", { code }, {
          headers: { Accept: "application/json", ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}) },
        });
        return response.data;
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? String(error.response?.data?.message ?? "Detail tidak dapat dimuat.")
          : "Detail tidak dapat dimuat.";
        const kind = code.includes("/") ? "po" : "prefix";
        return { code, kind, source: kind === "po" ? "bmt-multisales" : "bmt-finance", found: false, items: [], error: message } satisfies DetectedCodeDetail;
      }
    })).then((results) => {
      if (!cancelled) setDetailResults(results);
    }).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, selected?.id]);

  const stats = useMemo(() => {
    const txs = rec?.transactions ?? [];
    return {
      total: txs.length,
      detected: txs.filter((t) => t.keywords.length).length,
      debit: txs.filter((t) => t.type === "DB").reduce((s, t) => s + t.amount, 0),
      credit: txs.filter((t) => t.type === "CR").reduce((s, t) => s + t.amount, 0),
    };
  }, [rec]);

  const data = useMemo(() => {
    const txs = rec?.transactions ?? [];
    if (filter === "all") return txs;
    if (filter === "detected") return txs.filter((t) => t.keywords.length);
    if (filter === "none") return txs.filter((t) => !t.keywords.length);
    return txs.filter((t) => t.keywords.some((k) => kwKey(k) === filter));
  }, [rec, filter]);

  const back = (
    <button
      onClick={() => navigate("/rekonsiliasi")}
      className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all duration-300 hover:-translate-x-1 hover:border-blue-300 hover:text-blue-700"
    >
      <Icon name="arrow-left" /> Kembali ke Rekonsiliasi
    </button>
  );

  if (!rec) {
    return (
      <>
        <PageHeader title="Rekonsiliasi" back={back} />
        <div className="flex flex-col items-center rounded-3xl border border-blue-100 bg-white px-6 py-20 text-center shadow-xl shadow-blue-900/5">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-3xl text-blue-500">
            <Icon name="folder-open" />
          </span>
          <p className="text-lg font-extrabold text-slate-800">Data tidak ditemukan</p>
          <p className="mt-1 mb-5 text-sm text-slate-500">Rekonsiliasi ini mungkin sudah dihapus.</p>
          <Button onClick={() => navigate("/rekonsiliasi")}>Kembali</Button>
        </div>
      </>
    );
  }

  const openDetail = (t: Transaction) => {
    // Ambil ulang dari deskripsi agar transaksi lama yang disimpan sebelum
    // pola prefix bertingkat diperbaiki tetap mencari nomor tiket lengkap.
    setSelected({ ...t, keywords: extractKeywords(t.description) });
    setOpen(true);
  };

  const columns: Column<Transaction>[] = [
    {
      key: "desc",
      header: "Deskripsi",
      primary: true,
      className: "max-w-md",
      cell: (t) => (
        <div>
          <p className="text-sm leading-relaxed font-medium text-slate-700">
            <Highlight text={t.description} keywords={t.keywords} />
          </p>
          {t.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.keywords.map((k) => (
                <KeywordChip key={k.value} k={k} />
              ))}
            </div>
          )}
        </div>
      ),
    },
    { key: "date", header: "Tanggal", cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-600">{formatDate(t.date)}</span> },
    {
      key: "type",
      header: "Tipe",
      align: "center",
      cell: (t) => (
        <Badge tone={t.type === "DB" ? "red" : "green"}>
          <Icon name={t.type === "DB" ? "arrow-small-up" : "arrow-small-down"} className="text-xs" />
          {t.type === "DB" ? "Debit" : "Kredit"}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Jumlah",
      align: "right",
      cell: (t) => (
        <span className={cn("font-extrabold whitespace-nowrap", t.type === "DB" ? "text-rose-600" : "text-emerald-600")}>
          {t.type === "DB" ? "-" : "+"} {formatRupiah(t.amount)}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Saldo",
      align: "right",
      cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-500">{t.balance !== null ? formatRupiah(t.balance) : "-"}</span>,
    },
  ];

  const linked = selected
    ? selected.keywords
        .filter((k) => k.kind === "prefix")
        .map((k) => ({ k, ref: refs.find((r) => k.value.toUpperCase().endsWith(`-${r.code}`)) }))
        .filter((x) => x.ref)
    : [];

  return (
    <>
      <PageHeader
        back={back}
        title={`Rekonsiliasi ${MONTHS[rec.month - 1]} ${rec.year}`}
        subtitle={`Sumber file: ${rec.fileName}`}
      />

      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { l: "Total Transaksi", v: String(stats.total), i: "list-check", c: "from-blue-600 to-sky-400" },
          { l: "Terdeteksi", v: String(stats.detected), i: "badge-check", c: "from-indigo-500 to-blue-400" },
          { l: "Pengeluaran", v: formatRupiah(stats.debit), i: "arrow-small-up", c: "from-rose-500 to-orange-400" },
          { l: "Pemasukan", v: formatRupiah(stats.credit), i: "arrow-small-down", c: "from-emerald-500 to-teal-400" },
        ].map((s) => (
          <div key={s.l} className="flex items-center gap-3 rounded-2xl border border-blue-100/70 bg-white p-4 shadow-lg shadow-blue-900/5 transition-all duration-300 hover:-translate-y-1">
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-lg text-white shadow-md", s.c)}>
              <Icon name={s.i} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{s.l}</p>
              <p className="truncate text-base font-extrabold text-slate-800 sm:text-lg">{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        title="Hasil Pembacaan Mutasi BCA"
        subtitle="Semua baris dari file Excel ditampilkan. Kata kunci ditandai otomatis."
        data={data}
        columns={columns}
        rowKey={(t) => t.id}
        searchText={(t) => `${t.description} ${t.date} ${t.amount} ${t.keywords.map((k) => k.value).join(" ")}`}
        searchPlaceholder="Cari deskripsi, kode, atau jumlah..."
        onRefresh={() => router.reload({ only: ["reconciliation", "references"] })}
        pageSize={10}
        toolbar={<Select size="sm" value={filter} onChange={setFilter} options={FILTERS} />}
        emptyTitle="Tidak ada transaksi"
        emptyText="Tidak ada transaksi yang sesuai dengan filter."
        actions={(t) =>
          t.keywords.length ? (
            <Button size="sm" variant="soft" icon="eye" onClick={() => openDetail(t)}>
              Lihat Detail
            </Button>
          ) : (
            <span className="text-xs font-medium text-slate-300">—</span>
          )
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Detail Transaksi"
        subtitle={selected ? `${formatDate(selected.date)} · ${selected.type === "DB" ? "Debit" : "Kredit"}` : ""}
        icon="receipt"
        size="xl"
        footer={<Button onClick={() => setOpen(false)}>Tutup</Button>}
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-linear-to-br from-blue-50 to-sky-50 p-4 ring-1 ring-blue-100">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Jumlah</p>
              <p className={cn("text-2xl font-extrabold", selected.type === "DB" ? "text-rose-600" : "text-emerald-600")}>
                {selected.type === "DB" ? "-" : "+"} {formatRupiah(selected.amount)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                <Highlight text={selected.description} keywords={selected.keywords} />
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Kata kunci terdeteksi</p>
              <div className="flex flex-wrap gap-2">
                {selected.keywords.map((k) => (
                  <KeywordChip key={k.value} k={k} />
                ))}
              </div>
            </div>

            {linked.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Cocok dengan No. Referensi</p>
                <div className="space-y-2">
                  {linked.map(({ k, ref }) => (
                    <div key={k.value} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                      <Icon name="link" className="text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{ref!.description}</p>
                        <p className="text-xs text-slate-500">
                          {ref!.code} · {formatRupiah(ref!.amount)}
                        </p>
                      </div>
                      <Badge tone={ref!.amount === selected.amount ? "green" : "amber"}>
                        {ref!.amount === selected.amount ? "Nominal sesuai" : "Nominal berbeda"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Informasi dari database</p>
                  <p className="text-xs text-slate-500">Detail kode dan harga berdasarkan sumber terkait.</p>
                </div>
                {detailLoading && <Icon name="refresh" className="animate-spin text-blue-600" />}
              </div>

              {detailLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-24 rounded-2xl" />
                  <div className="skeleton h-32 rounded-2xl" />
                </div>
              ) : detailResults.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  Tidak ada kode PO atau prefix yang dapat dicari.
                </div>
              ) : (
                <div className="space-y-4">
                  {detailResults.map((detail) => (
                    <section key={`${detail.source}-${detail.code}`} className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 bg-blue-50/60 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-800">{detail.title || detail.code}</p>
                          <p className="font-mono text-xs font-semibold text-blue-700">{detail.code}</p>
                        </div>
                        <Badge tone={detail.kind === "po" ? "amber" : "green"}>
                          {detail.kind === "po" ? "BMT Multisales" : "BMT Finance"}
                        </Badge>
                      </div>

                      {detail.error ? (
                        <p className="p-4 text-sm font-medium text-rose-600">{detail.error}</p>
                      ) : !detail.found ? (
                        <p className="p-4 text-sm text-slate-500">Kode ini tidak ditemukan di {detail.kind === "po" ? "database purchase order" : "database cash advance"}.</p>
                      ) : (
                        <div className="space-y-4 p-4">
                          {detail.description && <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{detail.description}</p>}
                          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                            {detail.date && <span>Tanggal: <b className="font-semibold text-slate-700">{detail.date}</b></span>}
                            {detail.status && <span>Status: <b className="font-semibold text-slate-700">{detail.status}</b></span>}
                            {detail.referencePo && <span>Referensi PO: <b className="font-semibold text-slate-700">{detail.referencePo}</b></span>}
                            {detail.currency && <span>Mata uang: <b className="font-semibold text-slate-700">{detail.currency}</b></span>}
                          </div>

                          {detail.items.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                              <table className="w-full min-w-[560px] text-left text-xs">
                                <thead className="bg-slate-50 font-bold text-slate-500">
                                  <tr>
                                    <th className="px-3 py-2.5">Item</th>
                                    <th className="px-3 py-2.5 text-right">Qty</th>
                                    <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.items.map((item, index) => (
                                    <tr key={`${item.name}-${index}`} className="border-t border-slate-100 align-top">
                                      <td className="px-3 py-3">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        {item.description && <p className="mt-0.5 text-slate-500">{item.description}</p>}
                                      </td>
                                      <td className="px-3 py-3 text-right whitespace-nowrap text-slate-600">{item.quantity}</td>
                                      <td className="px-3 py-3 text-right whitespace-nowrap text-slate-600">{formatDetailMoney(item.unitPrice, detail.currency)}</td>
                                      <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-slate-800">{formatDetailMoney(item.subtotal, detail.currency)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="border-t border-blue-100 bg-blue-50/60">
                                  <tr>
                                    <td colSpan={3} className="px-3 py-3 text-right font-bold text-slate-600">Total item</td>
                                    <td className="px-3 py-3 text-right font-extrabold whitespace-nowrap text-blue-700">{formatDetailMoney(detail.total ?? 0, detail.currency)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Belum ada rincian item aktif pada database.</p>
                          )}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
