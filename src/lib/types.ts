export type KeywordKind = "prefix" | "po";

export interface Keyword {
  kind: KeywordKind;
  /** Teks lengkap yang terdeteksi, mis. OP-A7K29QD atau 1070/WO-PO/10/2026 */
  value: string;
  /** Prefix (OP, TX, PF, BL, RE, PAY) bila kind === "prefix" */
  prefix?: string;
}

export interface Transaction {
  id: string;
  rowNumber?: number | null;
  date: string; // ISO yyyy-mm-dd
  description: string;
  branch: string;
  amount: number;
  type: "DB" | "CR";
  balance: number | null;
  keywords: Keyword[];
  inv?: string | null;
  tl?: string | null;
  rfq?: string | null;
  pr?: string | null;
  po?: string | null;
  suratNo?: string | null;
  referenceCode?: string | null;
  title?: string | null;
  note?: string | null;
  debit?: number | null;
  credit?: number | null;
  transactionLabel?: string | null;
  reimburse?: string | null;
}

export interface Reconciliation {
  id: string;
  month: number; // 1-12
  year: number;
  fileName: string;
  uploadedAt: string;
  openingBalance?: number | null;
  balanceShortage?: number | null;
  updatedBalance?: number | null;
  pendingReimburse?: number | null;
  transactions: Transaction[];
}

export interface Reference {
  id: string;
  code: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface DetectedCodeDetail {
  code: string;
  kind: "po" | "prefix" | "rfq" | "pr";
  source: string;
  found: boolean;
  title?: string | null;
  description?: string | null;
  date?: string | null;
  status?: string | null;
  type?: string | null;
  issueType?: string | null;
  referencePo?: string | null;
  currency?: string | null;
  total?: number;
  discount?: number;
  otherCharge?: number;
  tax?: number;
  error?: string;
  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    completedQuantity?: number;
  }>;
}

export interface Session {
  username: string;
  name: string;
}
