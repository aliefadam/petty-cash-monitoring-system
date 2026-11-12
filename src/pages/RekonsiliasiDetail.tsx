import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PageHeader } from "../components/layout/AdminLayout";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { FileDrop } from "../components/ui/FileDrop";
import { MoneyInput, TextArea, TextInput } from "../components/ui/Input";
import { Badge, PREFIX_TONE } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { MONTHS, formatDate, formatRupiah } from "../lib/format";
import { extractKeywords, parseMonitoringFile, PREFIXES } from "../lib/parser";
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
const transactionLabelOptions = ["", "Debit", "Kredit", "Admin"].map((value) => ({ value, label: value || "Kosong" }));
const reimburseOptions = ["", "Sudah", "Belum", "Partial"].map((value) => ({ value, label: value || "Kosong" }));

type ManualMonitoringRow = {
  date: string; inv: string; tl: string; rfq: string; pr: string; po: string; suratNo: string;
  title: string; note: string; debit: number | null; credit: number | null; balance: number | null;
  transactionLabel: string; reimburse: string;
};

const emptyManualRow = (): ManualMonitoringRow => ({
  date: new Date().toISOString().slice(0, 10), inv: "", tl: "", rfq: "", pr: "", po: "", suratNo: "",
  title: "", note: "", debit: null, credit: null, balance: null, transactionLabel: "", reimburse: "",
});
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
  const { reconciliation: rec, references: refs = [] } = usePage<{ reconciliation: Reconciliation | null; references?: Reference[] }>().props;
  const toast = useToast();

  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);
  const [detailResults, setDetailResults] = useState<DetectedCodeDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manualRow, setManualRow] = useState<ManualMonitoringRow>(emptyManualRow);
  const [manualError, setManualError] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (!open || !selected) return;

    let cancelled = false;
    const codes = [...new Set(selected.keywords.map((keyword) => keyword.value))];
    setDetailLoading(true);
    setDetailResults([]);

    Promise.all(codes.map(async (code) => {
      try {
        const response = await axios.post<DetectedCodeDetail>("/rekonsiliasi/lookup-detail", { code }, {
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          withCredentials: true,
          withXSRFToken: true,
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

  const submitUpload = async () => {
    if (!uploadFile) {
      setUploadError("Pilih file monitoring terlebih dahulu.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const parsed = await parseMonitoringFile(uploadFile);
      const latestDate = parsed.transactions.reduce((latest, row) => row.date > latest ? row.date : latest, parsed.transactions[0].date);
      router.post("/rekonsiliasi", {
        file: uploadFile,
        month: Number(latestDate.slice(5, 7)),
        year: Number(latestDate.slice(0, 4)),
        transactions: parsed.transactions,
        summary: parsed.summary,
      }, {
        forceFormData: true,
        onSuccess: () => {
          setUpdateOpen(false);
          setUploadFile(null);
          toast.success("File diperbarui", `${parsed.transactions.length} baris monitoring berhasil dibaca.`);
        },
        onError: (errors) => setUploadError(String(Object.values(errors)[0] ?? "File gagal disimpan.")),
        onFinish: () => setUploading(false),
      });
    } catch (error) {
      setUploadError((error as Error).message || "File gagal dibaca.");
      setUploading(false);
    }
  };

  const submitManualRow = () => {
    setManualError("");
    setSavingManual(true);
    router.post("/rekonsiliasi/transactions", { transaction: manualRow }, {
      onSuccess: () => {
        setAddOpen(false);
        setManualRow(emptyManualRow());
        toast.success("Data ditambahkan", "Baris monitoring berhasil disimpan.");
      },
      onError: (errors) => setManualError(String(Object.values(errors)[0] ?? "Data tidak dapat disimpan.")),
      onFinish: () => setSavingManual(false),
    });
  };

  const stats = useMemo(() => {
    const txs = rec?.transactions ?? [];
    return {
      total: txs.length,
      detected: txs.filter((t) => t.keywords.length).length,
      debit: txs.reduce((sum, transaction) => sum + (transaction.debit ?? (transaction.type === "DB" ? transaction.amount : 0)), 0),
      credit: txs.reduce((sum, transaction) => sum + (transaction.credit ?? (transaction.type === "CR" ? transaction.amount : 0)), 0),
    };
  }, [rec]);

  const data = useMemo(() => {
    const txs = rec?.transactions ?? [];
    if (filter === "all") return txs;
    if (filter === "detected") return txs.filter((t) => t.keywords.length);
    if (filter === "none") return txs.filter((t) => !t.keywords.length);
    return txs.filter((t) => t.keywords.some((k) => kwKey(k) === filter));
  }, [rec, filter]);

  const openDetail = (t: Transaction) => {
    // Ambil ulang dari deskripsi agar transaksi lama yang disimpan sebelum
    // pola prefix bertingkat diperbaiki tetap mencari nomor tiket lengkap.
    setSelected({ ...t, keywords: extractKeywords(t.description) });
    setOpen(true);
  };

  const columns: Column<Transaction>[] = [
    { key: "number", header: "No", align: "center", cell: (t, index) => <span className="font-semibold text-slate-400">{t.rowNumber ?? index + 1}</span> },
    { key: "date", header: "Tgl Transaksi", cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-600">{formatDate(t.date)}</span> },
    { key: "inv", header: "INV", cell: (t) => <span className="font-medium text-slate-600">{t.inv || "â€”"}</span> },
    { key: "tl", header: "TL", cell: (t) => <span className="font-medium text-slate-600">{t.tl || "â€”"}</span> },
    { key: "rfq", header: "RFQ", cell: (t) => <span className="font-medium text-slate-600">{t.rfq || "â€”"}</span> },
    { key: "pr", header: "PR", cell: (t) => <span className="font-medium text-slate-600">{t.pr || "â€”"}</span> },
    {
      key: "po", header: "PO", primary: true, className: "min-w-44",
      cell: (t) => t.po ? <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-bold text-blue-700">{t.po}</span> : <span className="text-slate-300">â€”</span>,
    },
    { key: "suratNo", header: "Surat No", className: "min-w-36", cell: (t) => <span className="text-slate-600">{t.suratNo || "â€”"}</span> },
    { key: "title", header: "Title", className: "min-w-72", cell: (t) => <span className="line-clamp-2 font-medium text-slate-700">{t.title || "â€”"}</span> },
    { key: "note", header: "Note", className: "min-w-72", cell: (t) => <span className="line-clamp-2 text-slate-600">{t.note || "â€”"}</span> },
    {
      key: "debit", header: "Debit Â· Masuk", align: "right", cell: (t) => {
        const value = t.debit ?? (t.type === "DB" ? t.amount : null);
        return <span className="font-extrabold whitespace-nowrap text-emerald-600">{value !== null && value > 0 ? formatRupiah(value) : "â€”"}</span>;
      },
    },
    {
      key: "credit", header: "Kredit Â· Keluar", align: "right", cell: (t) => {
        const value = t.credit ?? (t.type === "CR" ? t.amount : null);
        return <span className="font-extrabold whitespace-nowrap text-rose-600">{value !== null && value > 0 ? formatRupiah(value) : "â€”"}</span>;
      },
    },
    { key: "balance", header: "Saldo", align: "right", cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-500">{t.balance !== null ? formatRupiah(t.balance) : "â€”"}</span> },
    { key: "transactionLabel", header: "Transaksi", cell: (t) => <span className="text-slate-600">{t.transactionLabel || "â€”"}</span> },
    { key: "reimburse", header: "Reimburse", cell: (t) => t.reimburse ? <Badge tone={t.reimburse === "Sudah" ? "green" : t.reimburse === "Belum" ? "amber" : "slate"}>{t.reimburse}</Badge> : <span className="text-slate-300">â€”</span> },
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
        title="Monitoring Rekonsiliasi"
        subtitle={rec ? `Sumber file: ${rec.fileName}` : "Belum ada file monitoring. Unggah file untuk mulai."}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="upload" onClick={() => { setUploadFile(null); setUploadError(""); setUpdateOpen(true); }}>Perbarui File</Button>
            <Button icon="plus" onClick={() => { setManualRow(emptyManualRow()); setManualError(""); setAddOpen(true); }}>Tambah Data</Button>
          </div>
        }
      />

      <div className="stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { l: "Saldo Awal", v: formatRupiah(rec?.openingBalance ?? 0), i: "wallet", c: "from-blue-600 to-sky-400" },
          { l: "Saldo Kurang", v: formatRupiah(rec?.balanceShortage ?? 0), i: "arrow-small-down", c: "from-rose-500 to-orange-400" },
          { l: "Saldo Update", v: formatRupiah(rec?.updatedBalance ?? 0), i: "refresh", c: "from-indigo-500 to-blue-400" },
          { l: "Belum Reimburse", v: formatRupiah(rec?.pendingReimburse ?? 0), i: "time-quarter-past", c: "from-emerald-500 to-teal-400" },
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
        title="Data Monitoring PO"
        subtitle={`${stats.total} baris · Debit masuk ${formatRupiah(stats.debit)} · Kredit keluar ${formatRupiah(stats.credit)}.`}
        data={data}
        columns={columns}
        rowKey={(t) => t.id}
        searchText={(t) => `${t.date} ${t.inv ?? ""} ${t.tl ?? ""} ${t.rfq ?? ""} ${t.pr ?? ""} ${t.po ?? ""} ${t.suratNo ?? ""} ${t.title ?? ""} ${t.note ?? ""} ${t.transactionLabel ?? ""} ${t.reimburse ?? ""} ${t.amount} ${t.keywords.map((k) => k.value).join(" ")}`}
        searchPlaceholder="Cari PO, PR, title, note, atau nominal..."
        onRefresh={() => router.reload({ only: ["reconciliation", "references"] })}
        pageSize={20}
        toolbar={<Select size="sm" value={filter} onChange={setFilter} options={FILTERS} />}
        emptyTitle="Tidak ada transaksi"
        emptyText="Tidak ada transaksi yang sesuai dengan filter."
        actions={(t) =>
          t.keywords.length ? (
            <Button size="sm" variant="soft" icon="eye" onClick={() => openDetail(t)}>
              Lihat Detail
            </Button>
          ) : (
            <span className="text-xs font-medium text-slate-300">â€”</span>
          )
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Detail Transaksi"
        subtitle={selected ? `${formatDate(selected.date)} · ${selected.type === "DB" ? "Debit · uang masuk" : "Kredit · uang keluar"}` : ""}
        icon="receipt"
        size="xl"
        footer={<Button onClick={() => setOpen(false)}>Tutup</Button>}
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-linear-to-br from-blue-50 to-sky-50 p-4 ring-1 ring-blue-100">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Jumlah</p>
              <p className={cn("text-2xl font-extrabold", selected.type === "DB" ? "text-emerald-600" : "text-rose-600")}>
                {selected.type === "DB" ? "+" : "-"} {formatRupiah(selected.amount)}
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
                          {ref!.code} Â· {formatRupiah(ref!.amount)}
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

      <Modal
        open={updateOpen}
        onClose={() => !uploading && setUpdateOpen(false)}
        title="Perbarui File Monitoring"
        subtitle="Unggah workbook format monitoring PO untuk mengganti data yang tampil."
        icon="upload"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUpdateOpen(false)} disabled={uploading}>Batal</Button>
            <Button icon="check" loading={uploading} onClick={submitUpload}>Baca & Perbarui</Button>
          </>
        }
      >
        <FileDrop
          label="File Monitoring PO (.xlsx)"
          file={uploadFile}
          onChange={(file) => { setUploadFile(file); setUploadError(""); }}
          error={uploadError}
        />
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => !savingManual && setAddOpen(false)}
        title="Tambah Data Monitoring"
        subtitle="Isi kolom sesuai format workbook. Nomor baris dibuat otomatis."
        icon="plus"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={savingManual}>Batal</Button>
            <Button icon="check" loading={savingManual} onClick={submitManualRow}>Simpan Data</Button>
          </>
        }
      >
        <div className="space-y-4">
          {manualError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{manualError}</div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput label="TGLTRANSAKSI" type="date" value={manualRow.date} onChange={(date) => setManualRow((row) => ({ ...row, date }))} />
            <TextInput label="INV" value={manualRow.inv} onChange={(inv) => setManualRow((row) => ({ ...row, inv }))} />
            <TextInput label="TL" value={manualRow.tl} onChange={(tl) => setManualRow((row) => ({ ...row, tl }))} />
            <TextInput label="RFQ" value={manualRow.rfq} onChange={(rfq) => setManualRow((row) => ({ ...row, rfq }))} />
            <TextInput label="PR" value={manualRow.pr} onChange={(pr) => setManualRow((row) => ({ ...row, pr }))} />
            <TextInput label="PO" value={manualRow.po} onChange={(po) => setManualRow((row) => ({ ...row, po }))} />
            <TextInput label="SURAT NO" value={manualRow.suratNo} onChange={(suratNo) => setManualRow((row) => ({ ...row, suratNo }))} />
          </div>
          <TextArea label="TITLE" rows={2} value={manualRow.title} onChange={(title) => setManualRow((row) => ({ ...row, title }))} />
          <TextArea label="NOTE" rows={3} value={manualRow.note} onChange={(note) => setManualRow((row) => ({ ...row, note }))} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MoneyInput label="DEBIT · Uang masuk" value={manualRow.debit} onChange={(debit) => setManualRow((row) => ({ ...row, debit }))} allowDecimal error={manualError && !manualRow.debit && !manualRow.credit ? manualError : undefined} />
            <MoneyInput label="KREDIT · Uang keluar" value={manualRow.credit} onChange={(credit) => setManualRow((row) => ({ ...row, credit }))} allowDecimal />
            <MoneyInput label="SALDO" value={manualRow.balance} onChange={(balance) => setManualRow((row) => ({ ...row, balance }))} allowDecimal />
            <Select label="TRANSAKSI" value={manualRow.transactionLabel} onChange={(transactionLabel) => setManualRow((row) => ({ ...row, transactionLabel }))} options={transactionLabelOptions} />
            <Select label="REIMBURSE" value={manualRow.reimburse} onChange={(reimburse) => setManualRow((row) => ({ ...row, reimburse }))} options={reimburseOptions} />
          </div>
        </div>
      </Modal>
    </>
  );
}
