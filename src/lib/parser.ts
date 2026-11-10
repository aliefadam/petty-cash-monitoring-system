import * as XLSX from "xlsx";
import type { Keyword, Transaction } from "./types";
import { uid } from "./format";

export const PREFIXES = ["OP", "TX", "PF", "BL", "RE", "PAY"] as const;

/* ------------------------------------------------------------------ */
/* Deteksi kata kunci pada deskripsi                                   */
/* ------------------------------------------------------------------ */

export function extractKeywords(description: string): Keyword[] {
  const found: Keyword[] = [];
  const seen = new Set<string>();
  const text = description || "";

  // No. PO, mis. 1070/WO-PO/10/2026 , 1050/EL-PO/10/2026
  const poRe = /(?<![A-Z0-9])\d{2,6}\/[A-Z]{1,8}-PO\/\d{1,2}\/\d{4}(?![A-Z0-9])/gi;
  for (const m of text.matchAll(poRe)) {
    const value = m[0].toUpperCase();
    if (!seen.has(value)) {
      seen.add(value);
      found.push({ kind: "po", value });
    }
  }

  // Prefix: OP- TX- PF- BL- RE- PAY-
  const prefRe = new RegExp(`(?<![A-Z0-9])(${PREFIXES.join("|")})-([A-Z0-9]+(?:-[A-Z0-9]+)*)`, "gi");
  for (const m of text.matchAll(prefRe)) {
    const value = m[0].toUpperCase();
    if (!seen.has(value)) {
      seen.add(value);
      found.push({ kind: "prefix", value, prefix: m[1].toUpperCase() });
    }
  }

  return found;
}

/* ------------------------------------------------------------------ */
/* Parsing file Excel mutasi BCA                                       */
/* ------------------------------------------------------------------ */

type Cell = string | number | boolean | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, "0");

function toIso(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseDate(v: Cell, year: number, month: number): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    // cellDates menghasilkan waktu UTC-ish; gunakan komponen lokal dengan koreksi menit
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const p = XLSX.SSF.parse_date_code(v);
    if (p) return toIso(p.y, p.m, p.d);
    return null;
  }
  if (typeof v !== "string") return null;
  const s = v.replace(/^'+/, "").trim();
  if (!s) return null;
  if (/^PEND$/i.test(s)) return toIso(year, month, 1);

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return toIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return toIso(y, +m[2], +m[1]);
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})$/); // BCA: dd/mm
  if (m) return toIso(year, +m[2], +m[1]);
  return null;
}

function parseNumber(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const neg = s.startsWith("-");
  s = s.replace(/-/g, "");
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const thou = dec === "." ? "," : ".";
    s = s.split(thou).join("").replace(dec, ".");
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length !== 3) s = parts[0] + "." + parts[1];
    else s = parts.join("");
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[1].length === 3) s = parts.join("");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

interface Amt {
  value: number | null;
  type: "DB" | "CR" | null;
}

function parseAmount(v: Cell): Amt {
  if (typeof v === "number") return { value: Math.abs(v), type: v < 0 ? "DB" : v > 0 ? "CR" : null };
  if (typeof v !== "string") return { value: null, type: null };
  const s = v.trim();
  if (!s) return { value: null, type: null };
  let type: "DB" | "CR" | null = null;
  if (/\b(DB|DR|DEBIT|DEBET)\b/i.test(s)) type = "DB";
  else if (/\b(CR|CREDIT|KREDIT)\b/i.test(s)) type = "CR";
  const n = parseNumber(s);
  if (n === null) return { value: null, type };
  if (n < 0 && !type) type = "DB";
  return { value: Math.abs(n), type };
}

const norm = (v: Cell) => String(v ?? "").trim().toLowerCase();

interface ColMap {
  date: number;
  desc: number;
  desc2: number;
  branch: number;
  amount: number;
  debit: number;
  credit: number;
  type: number;
  balance: number;
}

function detectHeader(rows: Cell[][]): { index: number; map: ColMap } | null {
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const cells = rows[i].map(norm);
    const map: ColMap = { date: -1, desc: -1, desc2: -1, branch: -1, amount: -1, debit: -1, credit: -1, type: -1, balance: -1 };
    cells.forEach((c, idx) => {
      if (!c) return;
      if (map.date < 0 && /^(tanggal|tgl|date|trx date|transaction date)/.test(c)) map.date = idx;
      else if (map.desc < 0 && /(keterangan|deskripsi|description|remark|uraian|berita|detail)/.test(c)) map.desc = idx;
      else if (map.desc2 < 0 && /^(deskripsi|description|detail|uraian)$/.test(c)) map.desc2 = idx;
      else if (map.branch < 0 && /(cabang|branch|^cbg$)/.test(c)) map.branch = idx;
      else if (map.balance < 0 && /(saldo|balance)/.test(c)) map.balance = idx;
      else if (map.debit < 0 && /^(debit|debet|db|mutasi debit|mutasi debet)$/.test(c)) map.debit = idx;
      else if (map.credit < 0 && /^(kredit|credit|cr|mutasi kredit)$/.test(c)) map.credit = idx;
      else if (map.type < 0 && /^(tipe|type|dk|d\/k|cr\/db|db\/cr|jenis)/.test(c)) map.type = idx;
      else if (map.amount < 0 && /(jumlah|amount|nominal|mutasi)/.test(c)) map.amount = idx;
    });
    if (map.date >= 0 && map.desc >= 0 && (map.amount >= 0 || map.debit >= 0 || map.credit >= 0)) {
      // Beberapa rangkuman mutasi memakai dua baris header: Keterangan di
      // baris pertama, lalu Jenis Transfer dan Deskripsi di baris berikutnya.
      for (let j = i + 1; j < Math.min(rows.length, i + 3); j++) {
        rows[j].forEach((cell, idx) => {
          if (map.desc2 < 0 && /^(deskripsi|description|detail|uraian)$/.test(norm(cell))) map.desc2 = idx;
        });
      }
      return { index: i, map };
    }
  }
  return null;
}

function fallbackMap(rows: Cell[][], year: number, month: number): ColMap | null {
  // Cari baris pertama yang kolom pertamanya berupa tanggal, lalu tebak kolom lain.
  for (const r of rows) {
    for (let c = 0; c < r.length; c++) {
      if (parseDate(r[c], year, month)) {
        const strCols = r.map((x, i) => ({ i, len: typeof x === "string" && !parseDate(x, year, month) ? x.length : 0 }));
        const desc = strCols.filter((x) => x.i > c).sort((a, b) => b.len - a.len)[0];
        if (!desc || !desc.len) continue;
        let amount = -1;
        for (let k = desc.i + 1; k < r.length; k++) {
          if (parseAmount(r[k]).value !== null && amount < 0) amount = k;
        }
        if (amount < 0) continue;
        const balance = r.findIndex((x, i) => i > amount && parseAmount(x).value !== null);
        return { date: c, desc: desc.i, desc2: -1, branch: -1, amount, debit: -1, credit: -1, type: -1, balance };
      }
    }
  }
  return null;
}

export interface ParseResult {
  transactions: Transaction[];
  sheetName: string;
}

export async function parseBcaFile(file: File, year: number, month: number): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  if (!wb.SheetNames.length) throw new Error("File Excel tidak memiliki sheet");

  let best: ParseResult | null = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: "", blankrows: false });
    const txs = parseRows(rows, year, month);
    if (!best || txs.length > best.transactions.length) best = { transactions: txs, sheetName: name };
    if (txs.length) break;
  }
  if (!best || !best.transactions.length) {
    throw new Error("Tidak ada data mutasi yang dapat dibaca. Pastikan format file sesuai mutasi BCA.");
  }
  return best;
}

function parseRows(rows: Cell[][], year: number, month: number): Transaction[] {
  const header = detectHeader(rows);
  let map: ColMap | null = header?.map ?? null;
  let start = header ? header.index + 1 : 0;
  if (!map) {
    map = fallbackMap(rows, year, month);
    start = 0;
  }
  if (!map) return [];

  const out: Transaction[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const iso = parseDate(r[map.date], year, month);
    const desc = [r[map.desc], map.desc2 >= 0 ? r[map.desc2] : ""]
      .map((part) => String(part ?? "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ");

    if (!iso) {
      // Baris lanjutan deskripsi (BCA kadang memecah keterangan ke beberapa baris)
      const prev = out[out.length - 1];
      const hasAmt =
        (map.amount >= 0 && parseAmount(r[map.amount]).value !== null) ||
        (map.debit >= 0 && parseAmount(r[map.debit]).value) ||
        (map.credit >= 0 && parseAmount(r[map.credit]).value);
      if (prev && desc && !hasAmt && !/saldo|mutasi|total|jumlah|closing|opening/i.test(desc)) {
        prev.description = `${prev.description} ${desc}`.trim();
      }
      continue;
    }

    let value: number | null = null;
    let type: "DB" | "CR" | null = null;

    if (map.debit >= 0 || map.credit >= 0) {
      const d = map.debit >= 0 ? parseAmount(r[map.debit]).value : null;
      const c = map.credit >= 0 ? parseAmount(r[map.credit]).value : null;
      if (d) {
        value = d;
        type = "DB";
      } else if (c) {
        value = c;
        type = "CR";
      }
    }
    if (value === null && map.amount >= 0) {
      const a = parseAmount(r[map.amount]);
      value = a.value;
      type = a.type;
    }
    if (value === null) continue;
    // Baris saldo awal/akhir bukan transaksi, meskipun workbook menaruhnya
    // pada kolom Mutasi dengan nilai nol.
    if (value === 0) continue;

    if (!type && map.type >= 0) {
      const t = norm(r[map.type]);
      if (/^(cr|k|kr|kredit|credit)/.test(t)) type = "CR";
      else if (/^(db|d|dr|debit|debet)/.test(t)) type = "DB";
    }
    if (!type) {
      if (/\bCR\b/.test(desc)) type = "CR";
      else type = "DB";
    }

    const balance = map.balance >= 0 ? parseAmount(r[map.balance]).value : null;

    out.push({
      id: uid() + i,
      date: iso,
      description: desc,
      branch: map.branch >= 0 ? String(r[map.branch] ?? "").trim() : "",
      amount: value,
      type,
      balance,
      keywords: [],
    });
  }

  for (const t of out) t.keywords = extractKeywords(t.description);
  return out;
}
