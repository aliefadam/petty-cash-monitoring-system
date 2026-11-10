import { useState } from "react";
import { PageHeader } from "../components/layout/AdminLayout";
import { DataTable, type Column } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Modal, ConfirmDialog } from "../components/ui/Modal";
import { MoneyInput, TextArea } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { formatDateTime, formatRupiah } from "../lib/format";
import type { Reference } from "../lib/types";
import { cn } from "../utils/cn";
import { router, usePage } from "@inertiajs/react";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Referensi() {
  const { references: refs } = usePage<{ references: Reference[] }>().props;
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ d?: string; a?: string }>({});
  const [created, setCreated] = useState<Reference | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Reference | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sorted = [...refs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const openAdd = () => {
    setDesc("");
    setAmount(null);
    setErrors({});
    setCreated(null);
    setOpen(true);
  };

  const copy = async (code: string) => {
    (await copyText(code)) ? toast.success("Disalin", `No. Referensi ${code} disalin ke clipboard.`) : toast.error("Gagal menyalin");
  };

  const save = () => {
    const e: typeof errors = {};
    if (!desc.trim()) e.d = "Deskripsi wajib diisi";
    if (!amount || amount <= 0) e.a = "Jumlah uang wajib diisi";
    setErrors(e);
    if (e.d || e.a) return;

    setSaving(true);
    router.post("/referensi", { description: desc.trim(), amount }, {
      onSuccess: (page) => {
        const item = (page.props.references as Reference[])[0];
        setCreated(item);
        toast.success("Nomor referensi dibuat", `Kode unik: ${item.code}`);
      },
      onError: (serverErrors) => toast.error("Gagal menyimpan", String(Object.values(serverErrors)[0] ?? "Data tidak valid")),
      onFinish: () => setSaving(false),
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    router.delete(`/referensi/${toDelete.id}`, { onSuccess: () => toast.success("Data dihapus", `No. Referensi ${toDelete.code} telah dihapus.`) });
    setConfirmOpen(false);
  };

  const total = refs.reduce((s, r) => s + r.amount, 0);

  const columns: Column<Reference>[] = [
    {
      key: "code",
      header: "No. Referensi",
      primary: true,
      cell: (r) => (
        <button
          onClick={() => copy(r.code)}
          title="Klik untuk menyalin"
          className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 font-mono text-sm font-extrabold tracking-[0.15em] text-blue-700 transition-all duration-300 hover:bg-blue-600 hover:text-white"
        >
          {r.code}
          <Icon name="copy" className="text-xs opacity-60 group-hover:opacity-100" />
        </button>
      ),
    },
    { key: "desc", header: "Deskripsi", cell: (r) => <span className="line-clamp-2 font-medium text-slate-700">{r.description}</span> },
    { key: "amount", header: "Jumlah", align: "right", cell: (r) => <span className="font-extrabold text-slate-800">{formatRupiah(r.amount)}</span> },
    { key: "date", header: "Dibuat", cell: (r) => <span className="text-xs font-medium text-slate-500">{formatDateTime(r.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="No. Referensi"
        subtitle="Buat nomor referensi unik (7 karakter alphanumeric) untuk setiap kebutuhan petty cash."
        action={
          <Button icon="plus" onClick={openAdd}>
            Tambah Referensi
          </Button>
        }
      />

      <div className="stagger mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-blue-100/70 bg-white p-4 shadow-lg shadow-blue-900/5">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Referensi</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{refs.length}</p>
        </div>
        <div className="rounded-2xl bg-linear-to-br from-blue-700 to-sky-500 p-4 text-white shadow-lg shadow-blue-600/25">
          <p className="text-xs font-bold text-blue-100 uppercase">Total Nilai</p>
          <p className="mt-1 truncate text-xl font-extrabold sm:text-2xl">{formatRupiah(total)}</p>
        </div>
      </div>

      <DataTable
        title="Daftar No. Referensi"
        subtitle="Klik kode untuk menyalin ke clipboard."
        data={sorted}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.code} ${r.description} ${r.amount}`}
        searchPlaceholder="Cari kode, deskripsi, atau jumlah..."
        onRefresh={() => router.reload({ only: ["references"] })}
        emptyTitle="Belum ada No. Referensi"
        emptyText="Klik tombol Tambah Referensi untuk membuat nomor referensi pertama."
        actions={(r) => (
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
        )}
      />

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={created ? "Referensi Berhasil Dibuat" : "Tambah No. Referensi"}
        subtitle={created ? "Nomor referensi unik telah dihasilkan sistem" : "Isi deskripsi dan jumlah uang"}
        icon={created ? "check" : "hastag"}
        footer={
          created ? (
            <>
              <Button variant="secondary" onClick={openAdd} icon="plus">
                Buat Lagi
              </Button>
              <Button onClick={() => setOpen(false)}>Selesai</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button icon="check" loading={saving} onClick={save}>
                Simpan & Generate
              </Button>
            </>
          )
        }
      >
        {created ? (
          <div className="animate-fade-up py-2 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-400 text-2xl text-white shadow-lg shadow-emerald-500/30">
              <Icon name="check" bold />
            </div>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">No. Referensi</p>
            <button
              onClick={() => copy(created.code)}
              className={cn(
                "mx-auto mt-2 flex cursor-pointer items-center gap-3 rounded-2xl bg-linear-to-r from-blue-50 to-sky-50 px-6 py-4 font-mono text-3xl font-extrabold tracking-[0.25em] text-blue-700",
                "ring-1 ring-blue-200 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
              )}
            >
              {created.code}
              <Icon name="copy" className="text-lg opacity-60" />
            </button>
            <p className="mt-5 text-sm font-semibold text-slate-700">{created.description}</p>
            <Badge tone="blue" className="mt-2 text-xs">
              {formatRupiah(created.amount)}
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <TextArea
              label="Deskripsi"
              value={desc}
              onChange={(v) => {
                setDesc(v);
                setErrors((e) => ({ ...e, d: undefined }));
              }}
              placeholder="Contoh: Pembelian ATK untuk kebutuhan proyek"
              error={errors.d}
              rows={3}
            />
            <MoneyInput
              label="Jumlah Uang"
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setErrors((e) => ({ ...e, a: undefined }));
              }}
              placeholder="0"
              error={errors.a}
            />
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4 text-xs leading-relaxed text-slate-600">
              <Icon name="info" className="mt-0.5 text-base text-blue-600" />
              Nomor referensi berupa 7 karakter alphanumeric (A-Z, 0-9) dan dijamin unik. Kode akan dibuat otomatis setelah data disimpan.
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus No. Referensi?"
        message={`Nomor referensi ${toDelete?.code ?? ""} akan dihapus permanen dan tidak dapat dikembalikan.`}
      />
    </>
  );
}
