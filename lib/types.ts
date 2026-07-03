export type ImportType = "packing-list" | "lookup-list" | "base-catalog";

export type SourceType = "manual" | "customs-declaration";

export type SearchMode = "exact" | "similar" | "missing";

export interface ProductSource {
  id: string;
  productId?: string;
  type: SourceType;
  referenceCode: string;
  declaredAt?: string;
  quantity: number;
  unit: string;
  totalWeightKg: number;
  unitWeightKg: number;
  origin?: string;
  brand?: string;
  hsCode?: string;
  description?: string;
  dimensions?: string;
  notes?: string;
  metadata?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  normalizedName: string;
  contractOrPo?: string;
  aliases?: string[];
  baseInfo?: ProductSource;
  declarationHistory: ProductSource[];
}

export interface SearchSuggestion {
  id: string;
  productName: string;
  score: number;
  mode: SearchMode;
  sources: ProductSource[];
}

export interface SearchDemoState {
  query: string;
  matchedName: string;
  suggestions: SearchSuggestion[];
}

export interface ImportQueue {
  id: string;
  type: ImportType;
  title: string;
  acceptedFiles: string;
  description: string;
  mappedColumns: string[];
}

export interface PackingOrderLine {
  id: string;
  productName: string;
  contractOrPo?: string;
  origin?: string;
  brand?: string;
  quantity: number;
  unit: string;
  unitWeightKg: number;
  totalWeightKg: number;
  hsCode: string;
  sourceLabel: string;
  notes?: string;
}

export interface PackingOrderDraft {
  id: string;
  documentNo: string;
  customerName: string;
  customerAddress?: string;
  customerTaxCode?: string;
  documentDate: string;
  paymentTerm: string;
  deliveryMethod: string;
  deliveryWindow: string;
  packageCount: string;
  grossWeightKg: string;
  lines: PackingOrderLine[];
}
