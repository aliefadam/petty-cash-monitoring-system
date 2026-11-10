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
  date: string; // ISO yyyy-mm-dd
  description: string;
  branch: string;
  amount: number;
  type: "DB" | "CR";
  balance: number | null;
  keywords: Keyword[];
}

export interface Reconciliation {
  id: string;
  month: number; // 1-12
  year: number;
  fileName: string;
  uploadedAt: string;
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
  kind: "po" | "prefix";
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
