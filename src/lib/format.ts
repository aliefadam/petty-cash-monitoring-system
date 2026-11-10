export const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const formatRupiah = (n: number) => rupiah.format(n || 0);

export function formatCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)} jt`;
  if (abs >= 1_000) return `${trim(n / 1_000)} rb`;
  return String(Math.round(n));
}

const trim = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

export function formatDate(iso: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Menghasilkan kode referensi unik 7 karakter alphanumeric */
export function generateRefCode(existing: Set<string>) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const buf = new Uint32Array(7);
    crypto.getRandomValues(buf);
    let code = "";
    for (let i = 0; i < 7; i++) code += CODE_CHARS[buf[i] % CODE_CHARS.length];
    // pastikan campuran huruf & angka agar jelas alphanumeric
    if (!/[A-Z]/.test(code) || !/[0-9]/.test(code)) continue;
    if (!existing.has(code)) return code;
  }
  throw new Error("Gagal membuat nomor referensi unik");
}
