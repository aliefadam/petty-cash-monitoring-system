import { useState } from "react";
import { PageHeader } from "../components/layout/AdminLayout";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { Select } from "../components/ui/Select";
import { FileDrop } from "../components/ui/FileDrop";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { MONTHS, formatDateTime, formatRupiah } from "../lib/format";
import { parseBcaFile } from "../lib/parser";
import { navigate } from "../lib/router";
import type { Reconciliation } from "../lib/types";
import { router, usePage } from "@inertiajs/react";

const now = new Date();
const monthOptions = MONTHS.map((m, i) => ({ value: String(i + 1), label: m, icon: "calendar" }));
const yearOptions = Array.from({ length: 7 }, (_, i) => {
  const y = now.getFullYear() - 4 + i;
  return { value: String(y), label: String(y) };
});

export default function Rekonsiliasi() {
  const { reconciliations: recs } = usePage<{ reconciliations: Reconciliation[] }>().props;
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [errors, setErrors] = useState<{ f?: string; m?: string }>({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Reconciliation | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sorted = [...recs].sort((a, b) => b.year - a.year || b.month - a.month);

  const openAdd = () => {
    setFile(null);
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (!file) e.f = "File Excel mutasi BCA wajib diunggah";
    if (!month) e.m = "Pilih bulan";
    setErrors(e);
    if (e.f || e.m || !file) return;

    setBusy(true);
    try {
      const [result] = await Promise.all([parseBcaFile(file, Number(year), Number(month)), new Promise((r) => setTimeout(r, 900))]);
      const existing = recs.find((r) => r.month === Number(month) && r.year === Number(year));
      const detected = result.transactions.filter((t) => t.keywords.length).length;
      const transactions = result.transactions.map((transaction) => ({
        ...transaction,
        keywords: transaction.keywords.map((keyword) => ({ ...keyword })),
      }));
      router.post("/rekonsiliasi", { month: Number(month), year: Number(year), file, transactions }, {
        forceFormData: true,
        onSuccess: () => { toast.success(existing ? "Rekonsiliasi diperbarui" : "File berhasil dibaca", `${result.transactions.length} transaksi terbaca, ${detected} terdeteksi kata kunci.`); setOpen(false); },
        onError: (serverErrors) => { const message = Object.values(serverErrors)[0] ?? "Data rekonsiliasi tidak valid"; setErrors({ f: String(message) }); toast.error("Gagal menyimpan file", String(message)); },
        onFinish: () => setBusy(false),
      });
      return;
    } catch (err) {
      setErrors({ f: (err as Error).message });
      toast.error("Gagal membaca file", (err as Error).message);
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    router.delete(`/rekonsiliasi/${toDelete.id}`, { onSuccess: () => toast.success("Data dihapus", `Rekonsiliasi ${MONTHS[toDelete.month - 1]} ${toDelete.year} telah dihapus.`) });
    setConfirmOpen(false);
  };

  const sum = (r: Reconciliation, t: "DB" | "CR") => r.transactions.filter((x) => x.type === t).reduce((s, x) => s + x.amount, 0);

  const columns: Column<Reconciliation>[] = [
    {
      key: "period",
      header: "Periode",
      primary: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/25">
            <span className="text-[9px] leading-none font-bold uppercase">{MONTHS[r.month - 1].slice(0, 3)}</span>
            <span className="text-sm leading-tight font-extrabold">{String(r.year).slice(2)}</span>
          </span>
          <div>
            <p className="font-extrabold text-slate-800">
              {MONTHS[r.month - 1]} {r.year}
            </p>
            <p className="max-w-48 truncate text-xs font-medium text-slate-500">{r.fileName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "count",
      header: "Transaksi",
      align: "center",
      cell: (r) => <span className="font-bold text-slate-700">{r.transactions.length}</span>,
    },
    {
      key: "detected",
      header: "Terdeteksi",
      align: "center",
      cell: (r) => {
        const d = r.transactions.filter((t) => t.keywords.length).length;
        return (
          <Badge tone={d ? "blue" : "slate"}>
            <Icon name="badge-check" className="text-xs" /> {d} transaksi
          </Badge>
        );
      },
    },
    { key: "db", header: "Pengeluaran", align: "right", cell: (r) => <span className="font-bold text-rose-600">{formatRupiah(sum(r, "DB"))}</span> },
    { key: "cr", header: "Pemasukan", align: "right", cell: (r) => <span className="font-bold text-emerald-600">{formatRupiah(sum(r, "CR"))}</span> },
    { key: "date", header: "Diunggah", cell: (r) => <span className="text-xs font-medium text-slate-500">{formatDateTime(r.uploadedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Rekonsiliasi"
        subtitle="Unggah mutasi rekening BCA per bulan, sistem akan membaca & mendeteksi kode transaksi."
        action={
          <Button icon="plus" onClick={openAdd}>
            Tambah Rekonsiliasi
          </Button>
        }
      />

      <DataTable
        title="Rekonsiliasi per Bulan"
        subtitle="Pilih lihat detail untuk membuka hasil pembacaan file Excel."
        data={sorted}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${MONTHS[r.month - 1]} ${r.year} ${r.fileName}`}
        searchPlaceholder="Cari bulan, tahun, atau nama file..."
        onRefresh={() => router.reload({ only: ["reconciliations"] })}
        emptyTitle="Belum ada rekonsiliasi"
        emptyText="Klik Tambah Rekonsiliasi lalu unggah file Excel mutasi BCA."
        actions={(r) => (
          <>
            <Button size="sm" icon="eye" onClick={() => navigate(`/rekonsiliasi/${r.id}`)}>
              Lihat Detail
            </Button>
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              icon="trash"
              title="Hapus"
              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => {
                setToDelete(r);
                setConfirmOpen(true);
              }}
            />
          </>
        )}
      />

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Tambah Rekonsiliasi"
        subtitle="Unggah file Excel hasil mutasi BCA"
        icon="upload"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button icon="check" loading={busy} onClick={submit}>
              {busy ? "Membaca file..." : "Upload & Baca"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FileDrop
            label="File Excel Mutasi BCA"
            file={file}
            onChange={(f) => {
              setFile(f);
              setErrors((e) => ({ ...e, f: undefined }));
            }}
            error={errors.f}
          />
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <Select label="Bulan" value={month} onChange={setMonth} options={monthOptions} placeholder="Pilih bulan" error={errors.m} />
            </div>
            <div className="col-span-2">
              <Select label="Tahun" value={year} onChange={setYear} options={yearOptions} />
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl bg-blue-50/70 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3 text-xs leading-relaxed text-slate-600">
              <Icon name="info" className="mt-0.5 text-base text-blue-600" />
              <span>
                Format rangkuman mutasi didukung: kolom <b>Jenis Transfer</b> dan <b>Deskripsi</b> digabung otomatis; nilai mutasi negatif dibaca sebagai debit dan positif sebagai kredit. Kode seperti{" "}
                <b> OP-, TX-, PF-, BL-, RE-, PAY-</b> serta nomor PO juga terdeteksi.
              </span>
            </div>
            <a
              href="/Format_Mutasi_Rekening.xlsx"
              download="Format_Mutasi_Rekening.xlsx"
              className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold whitespace-nowrap text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-200 focus-visible:outline-none"
            >
              <Icon name="download" className="text-[1.05em]" />
              Contoh File
            </a>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus rekonsiliasi?"
        message={
          toDelete
            ? `Data rekonsiliasi ${MONTHS[toDelete.month - 1]} ${toDelete.year} (${toDelete.transactions.length} transaksi) akan dihapus permanen.`
            : ""
        }
      />
    </>
  );
}
