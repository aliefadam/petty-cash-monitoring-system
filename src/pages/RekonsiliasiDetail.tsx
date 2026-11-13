import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PageHeader } from "../components/layout/AdminLayout";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { ConfirmDialog, Modal } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { SidePanel } from "../components/ui/SidePanel";
import { FileDrop } from "../components/ui/FileDrop";
import { MoneyInput, TextArea, TextInput } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { formatDate, formatRupiah, MONTHS } from "../lib/format";
import { extractKeywords, parseMonitoringFile } from "../lib/parser";
import type { DetectedCodeDetail, Transaction } from "../lib/types";
import { cn } from "../utils/cn";
import { router, usePage } from "@inertiajs/react";
import type { Reconciliation, Reference } from "../lib/types";

const reimburseOptions = ["", "Sudah", "Belum", "Partial"].map((value) => ({ value, label: value || "Kosong" }));
const reimburseFilterOptions = [
  { value: "", label: "Semua status" },
  { value: "Sudah", label: "Sudah" },
  { value: "Belum", label: "Belum" },
  { value: "Partial", label: "Partial" },
  { value: "__empty__", label: "Belum diisi" },
];

type MonitoringFilters = { date: string; month: string; inv: string; tl: string; rfq: string; pr: string; po: string; suratNo: string; referenceCode: string; reimburse: string };
const FILTER_STORAGE_KEY = "monitoring-po-filters";
const emptyFilters = (): MonitoringFilters => ({ date: "", month: "", inv: "", tl: "", rfq: "", pr: "", po: "", suratNo: "", referenceCode: "", reimburse: "" });
const readSavedFilters = (): MonitoringFilters => {
  if (typeof window === "undefined") return emptyFilters();
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(FILTER_STORAGE_KEY) ?? "null") as Partial<MonitoringFilters> | null;
    if (!saved) return emptyFilters();
    const defaults = emptyFilters();
    return Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof saved[key as keyof MonitoringFilters] === "string" ? saved[key as keyof MonitoringFilters] : ""])) as MonitoringFilters;
  } catch {
    return emptyFilters();
  }
};
const persistFilters = (filters: MonitoringFilters) => {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); } catch { /* Penyimpanan browser dapat dinonaktifkan. */ }
};

type ManualMonitoringRow = {
  date: string; inv: string; tl: string; rfq: string; pr: string; po: string; suratNo: string; referenceCode: string; referenceCodeGenerated: boolean;
  title: string; note: string; debit: number | null; credit: number | null;
  transactionLabel: string; reimburse: string;
};

const emptyManualRow = (): ManualMonitoringRow => ({
  date: new Date().toISOString().slice(0, 10), inv: "", tl: "", rfq: "", pr: "", po: "", suratNo: "", referenceCode: "", referenceCodeGenerated: false,
  title: "", note: "", debit: null, credit: null, transactionLabel: "", reimburse: "",
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

function DetailField({ label, value, tone = "neutral" }: { label: string; value: string | null | undefined; tone?: "neutral" | "green" | "red" }) {
  return (
    <div className={cn("min-w-0 rounded-xl px-3 py-2.5", tone === "green" ? "bg-emerald-50" : tone === "red" ? "bg-rose-50" : "bg-slate-50")}>
      <p className={cn("text-[10px] font-bold tracking-wide uppercase", tone === "green" ? "text-emerald-600" : tone === "red" ? "text-rose-600" : "text-slate-400")}>{label}</p>
      <p className={cn("mt-1 break-words whitespace-pre-wrap text-sm font-semibold", tone === "green" ? "text-emerald-700" : tone === "red" ? "text-rose-700" : "text-slate-700")}>{value?.trim() || "-"}</p>
    </div>
  );
}

export default function RekonsiliasiDetail() {
  const { reconciliation: rec, references: refs = [] } = usePage<{ reconciliation: Reconciliation | null; references?: Reference[] }>().props;
  const toast = useToast();

  const [filters, setFilters] = useState<MonitoringFilters>(readSavedFilters);
  const [draftFilters, setDraftFilters] = useState<MonitoringFilters>(readSavedFilters);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [generatingReference, setGeneratingReference] = useState(false);
  const [referenceError, setReferenceError] = useState("");

  useEffect(() => persistFilters(filters), [filters]);

  useEffect(() => {
    if (!open || !selected) return;

    let cancelled = false;
    const requests = new Map<string, { code: string; kind: "po" | "rfq" | "pr" | "prefix" }>();
    if (selected.po?.trim()) requests.set(`po:${selected.po.trim()}`, { code: selected.po.trim(), kind: "po" });
    if (selected.rfq?.trim()) requests.set(`rfq:${selected.rfq.trim()}`, { code: selected.rfq.trim(), kind: "rfq" });
    if (selected.pr?.trim()) requests.set(`pr:${selected.pr.trim()}`, { code: selected.pr.trim(), kind: "pr" });
    selected.keywords.forEach((keyword) => {
      const kind = keyword.kind === "po" ? "po" : "prefix";
      requests.set(`${kind}:${keyword.value}`, { code: keyword.value, kind });
    });
    setDetailLoading(true);
    setDetailResults([]);

    Promise.all([...requests.values()].map(async ({ code, kind }) => {
      try {
        const response = await axios.post<DetectedCodeDetail>("/rekonsiliasi/lookup-detail", { code, kind }, {
          headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
          withCredentials: true,
          withXSRFToken: true,
        });
        return response.data;
      } catch (error) {
        const message = axios.isAxiosError(error)
          ? String(error.response?.data?.message ?? "Detail tidak dapat dimuat.")
          : "Detail tidak dapat dimuat.";
        return { code, kind, source: kind === "prefix" ? "bmt-finance" : "bmt-multisales", found: false, items: [], error: message } satisfies DetectedCodeDetail;
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
        transactionsJson: JSON.stringify(parsed.transactions),
        summaryJson: JSON.stringify(parsed.summary),
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
    const options = {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        setAddOpen(false);
        setEditingTransaction(null);
        setManualRow(emptyManualRow());
        toast.success(editingTransaction ? "Data diperbarui" : "Data ditambahkan", `Baris monitoring berhasil ${editingTransaction ? "diperbarui" : "disimpan"}.`);
      },
      onError: (errors: Record<string, string>) => setManualError(String(Object.values(errors)[0] ?? "Data tidak dapat disimpan.")),
      onFinish: () => setSavingManual(false),
    };
    if (editingTransaction) {
      router.put(`/rekonsiliasi/transactions/${editingTransaction.id}`, { transaction: manualRow }, options);
    } else {
      router.post("/rekonsiliasi/transactions", { transaction: manualRow }, options);
    }
  };

  const openAdd = () => {
    setEditingTransaction(null);
    setManualRow(emptyManualRow());
    setManualError("");
    setReferenceError("");
    setAddOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setManualRow({
      date: transaction.date,
      inv: transaction.inv ?? "",
      tl: transaction.tl ?? "",
      rfq: transaction.rfq ?? "",
      pr: transaction.pr ?? "",
      po: transaction.po ?? "",
      suratNo: transaction.suratNo ?? "",
      referenceCode: transaction.referenceCode ?? "",
      referenceCodeGenerated: false,
      title: transaction.title ?? "",
      note: transaction.note ?? "",
      debit: transaction.debit ?? (transaction.type === "DB" ? transaction.amount : null),
      credit: transaction.credit ?? (transaction.type === "CR" ? transaction.amount : null),
      transactionLabel: transaction.transactionLabel ?? "",
      reimburse: transaction.reimburse ?? "",
    });
    setManualError("");
    setReferenceError("");
    setAddOpen(true);
  };

  const generateReference = async () => {
    setReferenceError("");
    setGeneratingReference(true);
    try {
      const response = await axios.post<{ code: string }>("/rekonsiliasi/references", {}, {
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
        withCredentials: true,
        withXSRFToken: true,
      });
      setManualRow((row) => ({ ...row, referenceCode: response.data.code, referenceCodeGenerated: true }));
      toast.success("Nomor referensi dibuat", "Kode terbaru akan disimpan bersama data transaksi.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? String(Object.values(error.response?.data?.errors ?? {})[0] ?? error.response?.data?.message ?? "Nomor referensi gagal dibuat.")
        : "Nomor referensi gagal dibuat.";
      setReferenceError(message);
    } finally {
      setGeneratingReference(false);
    }
  };

  const stats = useMemo(() => {
    const txs = rec?.transactions ?? [];
    return { total: txs.length };
  }, [rec]);

  const data = useMemo(() => {
    const txs = rec?.transactions ?? [];
    const equals = (value: string, target: string | null | undefined) => !value || (target ?? "").trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase();
    const filtered = txs.filter((transaction) =>
      (!filters.date || transaction.date === filters.date) &&
      (!filters.month || transaction.date.startsWith(filters.month)) &&
      equals(filters.inv, transaction.inv) &&
      equals(filters.tl, transaction.tl) &&
      equals(filters.rfq, transaction.rfq) &&
      equals(filters.pr, transaction.pr) &&
      equals(filters.po, transaction.po) &&
      (!filters.suratNo || (transaction.suratNo ?? "").toLocaleLowerCase().includes(filters.suratNo.trim().toLocaleLowerCase())) &&
      equals(filters.referenceCode, transaction.referenceCode) &&
      (!filters.reimburse || (filters.reimburse === "__empty__" ? !transaction.reimburse : equals(filters.reimburse, transaction.reimburse)))
    );
    return [...filtered].sort((a, b) =>
      b.date.localeCompare(a.date) ||
      (b.rowNumber ?? 0) - (a.rowNumber ?? 0) ||
      b.id.localeCompare(a.id)
    );
  }, [rec, filters]);

  const transactionMonthOptions = useMemo(() => {
    const months = [...new Set((rec?.transactions ?? []).map((transaction) => transaction.date.slice(0, 7)))].sort().reverse();
    return [
      { value: "", label: "Semua bulan" },
      ...months.map((month) => {
        const [year, monthNumber] = month.split("-").map(Number);
        return { value: month, label: `${MONTHS[monthNumber - 1]} ${year}` };
      }),
    ];
  }, [rec]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const openFilters = () => {
    setDraftFilters(filters);
    setFilterPanelOpen(true);
  };

  const openDetail = (t: Transaction) => {
    // Ambil ulang dari deskripsi agar transaksi lama yang disimpan sebelum
    // pola prefix bertingkat diperbaiki tetap mencari nomor tiket lengkap.
    setSelected({ ...t, keywords: extractKeywords(t.description) });
    setOpen(true);
  };

  const columns: Column<Transaction>[] = [
    { key: "date", header: "Tgl Transaksi", cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-600">{formatDate(t.date)}</span> },
    {
      key: "internalKey", header: "Internal Key", primary: true, className: "min-w-64",
      cell: (t) => {
        const keys = [
          ["INV", t.inv], ["TL", t.tl], ["RFQ", t.rfq], ["PR", t.pr], ["PO", t.po], ["SURAT NO", t.suratNo],
        ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));

        return keys.length ? (
          <div className="flex flex-wrap gap-1.5">
            {keys.map(([label, value]) => (
              <span
                key={label}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs font-semibold",
                  "bg-slate-100 text-slate-600"
                )}
              >
                <span className="shrink-0 font-sans text-[10px] font-bold tracking-wide opacity-70">{label}</span>
                <span className="break-all">{value}</span>
              </span>
            ))}
          </div>
        ) : <span className="text-slate-300">-</span>;
      },
    },
    { key: "title", header: "Title", className: "min-w-72", cell: (t) => <span className="line-clamp-2 font-medium text-slate-700">{t.title || "-"}</span> },
    {
      key: "type", header: "Tipe", align: "center", cell: (t) => (
        <Badge tone={t.type === "DB" ? "green" : "red"}>
          <Icon name={t.type === "DB" ? "arrow-small-down" : "arrow-small-up"} className="text-xs" />
          {t.type === "DB" ? "Debit" : "Kredit"}
        </Badge>
      ),
    },
    {
      key: "amount", header: "Jumlah", align: "right", cell: (t) => {
        const value = t.type === "DB" ? (t.debit ?? t.amount) : (t.credit ?? t.amount);
        const incoming = t.type === "DB";
        return <span className={cn("font-extrabold whitespace-nowrap", incoming ? "text-emerald-600" : "text-rose-600")}>
          {incoming ? "+" : "-"} {formatRupiah(value)}
        </span>;
      },
    },
    { key: "balance", header: "Saldo", align: "right", cell: (t) => <span className="font-semibold whitespace-nowrap text-slate-500">{t.balance !== null ? formatRupiah(t.balance) : "-"}</span> },
    { key: "reimburse", header: "Reimburse", cell: (t) => t.reimburse ? <Badge tone={t.reimburse === "Sudah" ? "green" : t.reimburse === "Belum" ? "amber" : "slate"}>{t.reimburse}</Badge> : <span className="text-slate-300">-</span> },
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
            <Button icon="plus" onClick={openAdd}>Tambah Data</Button>
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
        subtitle={activeFilterCount ? `${data.length} dari ${stats.total} baris.` : `${stats.total} baris.`}
        data={data}
        columns={columns}
        rowKey={(t) => t.id}
        searchText={(t) => `${t.date} ${t.inv ?? ""} ${t.tl ?? ""} ${t.rfq ?? ""} ${t.pr ?? ""} ${t.po ?? ""} ${t.suratNo ?? ""} ${t.referenceCode ?? ""} ${t.title ?? ""} ${t.note ?? ""} ${t.transactionLabel ?? ""} ${t.reimburse ?? ""} ${t.amount} ${t.keywords.map((k) => k.value).join(" ")}`}
        searchPlaceholder="Cari PO, PR, title, note, atau nominal..."
        showRefresh={false}
        pageSize={20}
        toolbar={
          <div className="relative">
            <Button size="md" variant="secondary" icon="filter" title="Filter data" onClick={openFilters}>
              Filter
            </Button>
            {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white">{activeFilterCount}</span>}
          </div>
        }
        toolbarClassName="sm:w-auto"
        emptyTitle="Tidak ada transaksi"
        emptyText="Tidak ada transaksi yang sesuai dengan filter."
        actions={(t) => (
          <div className="flex items-center justify-center gap-1.5">
            <Button size="sm" variant="soft" icon="eye" iconOnly title="Lihat detail" onClick={() => openDetail(t)} />
            <Button size="sm" variant="secondary" icon="edit" iconOnly title="Edit data" onClick={() => openEdit(t)} />
            <Button size="sm" variant="danger" icon="trash" iconOnly title="Hapus data" onClick={() => setDeletingTransaction(t)} />
          </div>
        )}
      />

      <SidePanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Filter Data Monitoring"
        subtitle="Pilih satu atau beberapa kriteria untuk menyaring data."
        footer={
          <>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => setDraftFilters(emptyFilters())}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              icon="check"
              onClick={() => { persistFilters(draftFilters); setFilters(draftFilters); setFilterPanelOpen(false); }}
              className="flex-1"
            >
              Terapkan Filter
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextInput label="TGL TRANSAKSI" type="date" value={draftFilters.date} onChange={(date) => setDraftFilters((current) => ({ ...current, date }))} />
          <Select label="BULAN TRANSAKSI" value={draftFilters.month} onChange={(month) => setDraftFilters((current) => ({ ...current, month }))} options={transactionMonthOptions} />
          <SearchableSelect label="INV" field="inv" value={draftFilters.inv} onChange={(inv) => setDraftFilters((current) => ({ ...current, inv }))} />
          <SearchableSelect label="TL" field="tl" value={draftFilters.tl} onChange={(tl) => setDraftFilters((current) => ({ ...current, tl }))} />
          <SearchableSelect label="RFQ" field="rfq" value={draftFilters.rfq} onChange={(rfq) => setDraftFilters((current) => ({ ...current, rfq }))} />
          <SearchableSelect label="PR" field="pr" value={draftFilters.pr} onChange={(pr) => setDraftFilters((current) => ({ ...current, pr }))} />
          <SearchableSelect label="PO" field="po" value={draftFilters.po} onChange={(po) => setDraftFilters((current) => ({ ...current, po }))} />
          <TextInput label="SURAT NO" value={draftFilters.suratNo} onChange={(suratNo) => setDraftFilters((current) => ({ ...current, suratNo }))} placeholder="Cari Surat No..." />
          <SearchableSelect label="NO. REFERENSI" field="reference" value={draftFilters.referenceCode} onChange={(referenceCode) => setDraftFilters((current) => ({ ...current, referenceCode }))} />
          <Select label="STATUS REIMBURSE" value={draftFilters.reimburse} onChange={(reimburse) => setDraftFilters((current) => ({ ...current, reimburse }))} options={reimburseFilterOptions} />
        </div>
      </SidePanel>

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
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-sm font-extrabold text-slate-800">Informasi baris monitoring</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Tanggal transaksi" value={formatDate(selected.date)} />
                <DetailField label="INV" value={selected.inv} />
                <DetailField label="TL" value={selected.tl} />
                <DetailField label="RFQ" value={selected.rfq} />
                <DetailField label="PR" value={selected.pr} />
                <DetailField label="PO" value={selected.po} />
                <DetailField label="Surat No" value={selected.suratNo} />
                <DetailField label="No. Referensi" value={selected.referenceCode} />
                <DetailField label="Title" value={selected.title} />
                <DetailField label="Note" value={selected.note} />
                <DetailField label="Tipe" value={selected.type === "DB" ? "Debit · uang masuk" : "Kredit · uang keluar"} tone={selected.type === "DB" ? "green" : "red"} />
                <DetailField label="Debit" value={selected.debit !== null && selected.debit !== undefined ? formatRupiah(selected.debit) : "-"} tone="green" />
                <DetailField label="Kredit" value={selected.credit !== null && selected.credit !== undefined ? formatRupiah(selected.credit) : "-"} tone="red" />
                <DetailField label="Saldo" value={selected.balance !== null ? formatRupiah(selected.balance) : "-"} />
                <DetailField label="Reimburse" value={selected.reimburse} />
              </div>
            </section>

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
                  Tidak ada internal key PO, RFQ, PR, atau prefix yang dapat dicari.
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
                        <Badge tone={detail.source === "bmt-finance" ? "green" : "amber"}>
                          {detail.source === "bmt-finance" ? "BMT Finance" : `BMT Multisales · ${detail.kind.toUpperCase()}`}
                        </Badge>
                      </div>

                      {detail.error ? (
                        <p className="p-4 text-sm font-medium text-rose-600">{detail.error}</p>
                      ) : !detail.found ? (
                        <p className="p-4 text-sm text-slate-500">Kode {detail.kind.toUpperCase()} ini tidak ditemukan di database.</p>
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
                          ) : detail.kind !== "rfq" ? (
                            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Belum ada rincian item aktif pada database.</p>
                          ) : null}
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
        onClose={() => { if (!savingManual) { setAddOpen(false); setEditingTransaction(null); } }}
        title={editingTransaction ? "Edit Data Monitoring" : "Tambah Data Monitoring"}
        subtitle={editingTransaction ? "Perbarui informasi pada baris monitoring ini." : "Isi kolom sesuai format workbook. Nomor baris dibuat otomatis."}
        icon={editingTransaction ? "edit" : "plus"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAddOpen(false); setEditingTransaction(null); }} disabled={savingManual}>Batal</Button>
            <Button icon="check" loading={savingManual} onClick={submitManualRow}>{editingTransaction ? "Simpan Perubahan" : "Simpan Data"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {manualError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{manualError}</div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput label="TGLTRANSAKSI" type="date" value={manualRow.date} onChange={(date) => setManualRow((row) => ({ ...row, date }))} />
            <SearchableSelect label="INV" field="inv" value={manualRow.inv} onChange={(inv) => setManualRow((row) => ({ ...row, inv }))} />
            <SearchableSelect label="TL" field="tl" value={manualRow.tl} onChange={(tl) => setManualRow((row) => ({ ...row, tl }))} />
            <SearchableSelect label="RFQ" field="rfq" value={manualRow.rfq} onChange={(rfq) => setManualRow((row) => ({ ...row, rfq }))} />
            <SearchableSelect label="PR" field="pr" value={manualRow.pr} onChange={(pr) => setManualRow((row) => ({ ...row, pr }))} />
            <SearchableSelect label="PO" field="po" value={manualRow.po} onChange={(po) => setManualRow((row) => ({ ...row, po }))} />
            <TextInput label="SURAT NO" value={manualRow.suratNo} onChange={(suratNo) => setManualRow((row) => ({ ...row, suratNo }))} />
            <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                <div className="flex items-end gap-2 rounded-2xl border border-blue-100 bg-blue-50/50 p-2">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    label="NO. REFERENSI"
                    field="reference"
                    value={manualRow.referenceCode}
                    onChange={(referenceCode) => { setReferenceError(""); setManualRow((row) => ({ ...row, referenceCode, referenceCodeGenerated: false })); }}
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="md" variant="primary" icon="refresh" title="Generate No. Referensi" loading={generatingReference} disabled={generatingReference} onClick={generateReference}>
                    Generate No. Referensi
                  </Button>
                  <Button
                    size="md"
                    variant="danger"
                    icon="cross"
                    title="Kosongkan No. Referensi"
                    disabled={!manualRow.referenceCode || generatingReference}
                    onClick={() => { setReferenceError(""); setManualRow((row) => ({ ...row, referenceCode: "", referenceCodeGenerated: false })); }}
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>
              {referenceError && <p className="mt-1.5 text-xs font-medium text-rose-600">{referenceError}</p>}
            </div>
          </div>
          <TextArea label="TITLE" rows={2} value={manualRow.title} onChange={(title) => setManualRow((row) => ({ ...row, title }))} />
          <TextArea label="NOTE" rows={3} value={manualRow.note} onChange={(note) => setManualRow((row) => ({ ...row, note }))} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MoneyInput label="DEBIT · Uang masuk" value={manualRow.debit} onChange={(debit) => setManualRow((row) => ({ ...row, debit }))} allowDecimal error={manualError && !manualRow.debit && !manualRow.credit ? manualError : undefined} />
            <MoneyInput label="KREDIT · Uang keluar" value={manualRow.credit} onChange={(credit) => setManualRow((row) => ({ ...row, credit }))} allowDecimal />
            <Select label="REIMBURSE" value={manualRow.reimburse} onChange={(reimburse) => setManualRow((row) => ({ ...row, reimburse }))} options={reimburseOptions} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingTransaction)}
        onClose={() => setDeletingTransaction(null)}
        onConfirm={() => {
          if (!deletingTransaction) return;
          router.delete(`/rekonsiliasi/transactions/${deletingTransaction.id}`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => toast.success("Data dihapus", "Baris monitoring berhasil dihapus."),
            onFinish: () => setDeletingTransaction(null),
          });
        }}
        title="Hapus data monitoring?"
        message={deletingTransaction ? `Data tanggal ${formatDate(deletingTransaction.date)}${deletingTransaction.title ? ` dengan title “${deletingTransaction.title}”` : ""} akan dihapus permanen.` : "Data ini akan dihapus permanen."}
      />
    </>
  );
}
