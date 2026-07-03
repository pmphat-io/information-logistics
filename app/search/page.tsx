"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle,
  Database,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Paperclip,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Zap
} from "lucide-react";

import type { PackingOrderDraft, PackingOrderLine, ProductRecord, ProductSource } from "@/lib/types";

type ProductSearchItem = ProductRecord & {
  matchScore?: number;
  baseInfo?: ProductSource | null;
  declarationHistory?: ProductSource[];
};

type ProductSourcesPayload = {
  id: string;
  name: string;
  contractOrPo?: string;
  sources: ProductSource[];
};

type ExportHeader = Pick<
  PackingOrderDraft,
  | "documentNo"
  | "customerName"
  | "customerAddress"
  | "customerTaxCode"
  | "documentDate"
  | "paymentTerm"
  | "deliveryMethod"
  | "deliveryWindow"
  | "packageCount"
  | "grossWeightKg"
>;

type MappedRow = {
  id: string;
  index: number;
  originalText: string;
  status: "pending" | "matched" | "not-found" | "ambiguous";
  candidates: ProductSearchItem[];
  selectedProduct: ProductSourcesPayload | null;
  selectedSourceId: string;
  quantity: number;
  selected: boolean;
  makerBrandType?: "maker" | "brand";
  useManualEntry?: boolean;
  manualEntry?: {
    productName: string;
    hsCode: string;
    origin: string;
    brand: string;
    unit: string;
    unitWeightKg: number;
    description: string;
    dimensions: string;
    notes: string;
  };
};

type LookupImportRow = {
  rowNo: number;
  name: string;
  requestedQuantity?: number | null;
  notes?: string;
};

type SearchResultColumnKey =
  | "source"
  | "hsCode"
  | "origin"
  | "brand"
  | "quantity"
  | "unit"
  | "unitWeight"
  | "totalWeight"
  | "description"
  | "dimensions"
  | "notes";

const searchResultColumnOptions: Array<{ key: SearchResultColumnKey; label: string }> = [
  { key: "source", label: "Nguồn dữ liệu" },
  { key: "hsCode", label: "HS Code" },
  { key: "origin", label: "Xuất xứ" },
  { key: "brand", label: "Maker/Brand" },
  { key: "quantity", label: "Số lượng" },
  { key: "unit", label: "Đơn vị tính" },
  { key: "unitWeight", label: "N.W / ĐV (KG)" },
  { key: "totalWeight", label: "Trọng lượng N.W (KG)" },
  { key: "description", label: "Mô tả" },
  { key: "dimensions", label: "Kích thước" },
  { key: "notes", label: "Ghi chú" }
];

const defaultVisibleSearchColumns: Record<SearchResultColumnKey, boolean> = {
  source: true,
  hsCode: true,
  origin: true,
  brand: true,
  quantity: true,
  unit: true,
  unitWeight: true,
  totalWeight: true,
  description: false,
  dimensions: false,
  notes: false
};

const emptyHeader: ExportHeader = {
  documentNo: "",
  customerName: "",
  customerAddress: "",
  customerTaxCode: "",
  documentDate: new Date().toISOString().slice(0, 10),
  paymentTerm: "",
  deliveryMethod: "",
  deliveryWindow: "",
  packageCount: "",
  grossWeightKg: ""
};

function normalizeSearchText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(text: string) {
  return normalizeSearchText(text).replace(/\s+/g, "");
}

function compareProductSearchItems(left: ProductSearchItem, right: ProductSearchItem) {
  const scoreGap = (right.matchScore ?? 0) - (left.matchScore ?? 0);
  if (scoreGap !== 0) {
    return scoreGap;
  }

  return left.name.localeCompare(right.name, "vi", {
    sensitivity: "base",
    numeric: true
  });
}

function parseSourceMetadata(metadata: unknown) {
  if (typeof metadata !== "string" || !metadata.trim()) {
    return null;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function getSourceCustomerName(source: ProductSource) {
  const metadata = parseSourceMetadata(source.metadata);
  return String(metadata?.customerName ?? "").trim();
}

function parseDeclaredAtToTimestamp(value: string | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const localMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (localMatch) {
    return Date.UTC(Number(localMatch[3]), Number(localMatch[2]) - 1, Number(localMatch[1]));
  }

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareSourceTextAsc(left: string | undefined, right: string | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""), "vi", {
    sensitivity: "base",
    numeric: true
  });
}

function sortDeclarationSources(sources: ProductSource[]) {
  return [...sources].sort((left, right) => {
    const leftDate = parseDeclaredAtToTimestamp(left.declaredAt);
    const rightDate = parseDeclaredAtToTimestamp(right.declaredAt);

    if (leftDate !== null && rightDate !== null && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    if (leftDate !== null && rightDate === null) {
      return -1;
    }

    if (leftDate === null && rightDate !== null) {
      return 1;
    }

    const byCustomerName = compareSourceTextAsc(getSourceCustomerName(left), getSourceCustomerName(right));
    if (byCustomerName !== 0) {
      return byCustomerName;
    }

    return compareSourceTextAsc(left.referenceCode, right.referenceCode);
  });
}

function getOrderedSourcesForProduct(product: ProductSearchItem) {
  return [
    ...(product.baseInfo ? [product.baseInfo] : []),
    ...sortDeclarationSources(product.declarationHistory || [])
  ];
}

function getSourceDisplayLabel(source: ProductSource) {
  return source.type === "manual"
    ? `Thông tin cơ sở${source.referenceCode ? ` • ${source.referenceCode}` : ""}`
    : `Packing List${source.referenceCode ? ` • Số PK ${source.referenceCode}` : ""}`;
}

function createEmptyManualEntry(productName: string) {
  return {
    productName,
    hsCode: "",
    origin: "",
    brand: "",
    unit: "",
    unitWeightKg: 0,
    description: "",
    dimensions: "",
    notes: ""
  };
}

function getSourceShortLabel(source: ProductSource) {
  return source.type === "manual" ? "Thông tin cơ sở" : `Số PK ${source.referenceCode || "-"}`;
}

function getSourceDeclaredAtLabel(source: ProductSource) {
  return String(source.declaredAt ?? "").trim();
}

function getSourceTooltipLabel(source: ProductSource) {
  if (source.type === "manual") {
    return "Thông tin cơ sở";
  }

  const parts = [
    getSourceCustomerName(source) || "Khách hàng chưa có",
    `Số PK ${source.referenceCode || "-"}`,
    getSourceDeclaredAtLabel(source) || "Chưa có ngày"
  ];

  return parts.join(" • ");
}

function getSourceOptionLabel(source: ProductSource) {
  if (source.type === "manual") {
    return "Thông tin cơ sở";
  }

  const customerName = getSourceCustomerName(source) || "Khách hàng chưa có";
  const declaredAt = getSourceDeclaredAtLabel(source);
  return `Số PK ${source.referenceCode || "-"} - ${customerName}${declaredAt ? ` - ${declaredAt}` : ""}`;
}

function getSearchSelectableSources(sources: ProductSource[]) {
  const declarationSources = sortDeclarationSources(
    sources.filter((source) => source.type !== "manual")
  );
  const manualSources = sources
    .filter((source) => source.type === "manual")
    .sort((left, right) => getSourcePriority(right) - getSourcePriority(left));

  return [...declarationSources, ...manualSources];
}

function getSourcePriority(source: ProductSource) {
  let score = source.type === "manual" ? 6 : 0;
  if (source.unit) score += 3;
  if (source.unitWeightKg) score += 4;
  if (source.hsCode) score += 3;
  if (source.origin) score += 2;
  if (source.brand) score += 2;
  if (source.description) score += 1;
  if (source.dimensions) score += 1;
  if (source.declaredAt) score += 1;
  return score;
}

function pickDefaultSourceId(sources: ProductSource[], preferLatestDeclaration = false) {
  if (preferLatestDeclaration) {
    const latestDeclaration = sortDeclarationSources(
      sources.filter((source) => source.type !== "manual")
    )[0];
    if (latestDeclaration) {
      return latestDeclaration.id;
    }
  }

  return [...sources].sort((a, b) => getSourcePriority(b) - getSourcePriority(a))[0]?.id ?? "";
}

function parseRequestedQuantityValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLookupInputLine(line: string) {
  const segments = line.split("||");
  const name = String(segments[0] ?? "").trim();
  const quantity = parseRequestedQuantityValue(segments[1]);

  return {
    name,
    quantity
  };
}

export default function SearchPage() {
  const [viewMode, setViewMode] = useState<"input" | "results">("input");
  const [inputText, setInputText] = useState("");
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [exportHeader, setExportHeader] = useState<ExportHeader>(emptyHeader);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productPickerQuery, setProductPickerQuery] = useState("");
  const deferredProductPickerQuery = useDeferredValue(productPickerQuery);
  const [pickerProducts, setPickerProducts] = useState<ProductSearchItem[]>([]);
  const [hoveredCandId, setHoveredCandId] = useState<string | null>(null);
  const [hoveredResolveCandId, setHoveredResolveCandId] = useState<string | null>(null);
  const [showExportForm, setShowExportForm] = useState(false);
  const [visibleSearchColumns, setVisibleSearchColumns] = useState<Record<SearchResultColumnKey, boolean>>(defaultVisibleSearchColumns);
  const lookupFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showProductPicker) return;
    const normalized = deferredProductPickerQuery.trim();
    startTransition(() => {
      const url = normalized ? `/api/products?q=${encodeURIComponent(normalized)}` : "/api/products";
      fetch(url)
        .then((res) => res.json())
        .then((payload) => setPickerProducts(payload.items))
        .catch(console.error);
    });
  }, [showProductPicker, deferredProductPickerQuery]);

  async function addProductRowFromPicker(product: ProductSearchItem, sourceId: string) {
    try {
      const srcRes = await fetch(`/api/products/${product.id}/sources`);
      if (!srcRes.ok) return;

      const srcPayload = (await srcRes.json()) as ProductSourcesPayload;
      const resolvedSourceId = sourceId || pickDefaultSourceId(srcPayload.sources);

      setMappedRows((prev) => [
        ...prev,
        {
          id: `row-picker-${Date.now()}`,
          index: prev.length + 1,
          originalText: product.name,
          status: "matched",
          candidates: [],
          selectedProduct: srcPayload,
          selectedSourceId: resolvedSourceId,
          quantity: 1,
          selected: true,
          makerBrandType: "maker",
          useManualEntry: false,
          manualEntry: createEmptyManualEntry(product.name)
        }
      ]);
      setMessage(`Đã thêm ${product.name}`);
    } catch (cause) {
      console.error(cause);
    }
  }

  async function analyzeInput() {
    const entries = inputText
      .split("\n")
      .map((line) => parseLookupInputLine(line.trim()))
      .filter((entry) => entry.name);
    if (!entries.length) return;

    await analyzeLookupEntries(entries);
  }

  async function analyzeLookupEntries(entries: Array<{ name: string; quantity: number }>) {
    if (!entries.length) return;

    setViewMode("results");
    setMessage("");
    setError("");

    const initialRows: MappedRow[] = entries.map((entry, idx) => ({
      id: `row-${Date.now()}-${idx}`,
      index: idx + 1,
      originalText: entry.name,
      status: "pending",
      candidates: [],
      selectedProduct: null,
      selectedSourceId: "",
      quantity: entry.quantity,
      selected: true,
      makerBrandType: "maker",
      useManualEntry: false,
      manualEntry: createEmptyManualEntry(entry.name)
    }));

    setMappedRows(initialRows);

    for (const row of initialRows) {
      void processAutoSearch(row);
    }
  }

  async function handleLookupFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/imports/lookup-list", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể đọc file import.");
      }

      const rows = Array.isArray(payload?.rows) ? (payload.rows as LookupImportRow[]) : [];
      const entries = rows
        .map((row) => ({
          name: String(row.name ?? "").trim(),
          quantity: parseRequestedQuantityValue(row.requestedQuantity)
        }))
        .filter((entry) => entry.name);

      if (!entries.length) {
        throw new Error("File import chưa có dòng dữ liệu hợp lệ.");
      }

      await analyzeLookupEntries(entries);
      setMessage(`Đã nạp ${entries.length} dòng từ file Excel.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể import file Excel.");
    }
  }

  async function processAutoSearch(row: MappedRow) {
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(row.originalText)}`);
      if (!response.ok) throw new Error("Search failed");

      const payload = (await response.json()) as { items: ProductSearchItem[] };
      const normalizedRowText = normalizeSearchText(row.originalText);
      const compactRowText = compactSearchText(row.originalText);

      const exactCandidate =
        payload.items.find((item) => item.normalizedName === normalizedRowText) ||
        payload.items.find((item) => compactSearchText(item.normalizedName) === compactRowText) ||
        payload.items.find((item) => normalizeSearchText(item.name) === normalizedRowText) ||
        payload.items.find((item) => compactSearchText(item.name) === compactRowText) ||
        null;

      let nextStatus: MappedRow["status"] = "ambiguous";
      let selectedProduct: ProductSourcesPayload | null = null;
      let selectedSourceId = "";

      const autoCandidate =
        exactCandidate ||
        (payload.items.length === 1 && (payload.items[0]?.matchScore ?? 0) >= 92 ? payload.items[0] : null);
      const preferLatestDeclaration =
        Boolean(exactCandidate) || (autoCandidate?.matchScore ?? 0) >= 100;

      if (payload.items.length === 0) {
        nextStatus = "not-found";
      } else if (autoCandidate) {
        const productId = autoCandidate.id;
        const srcRes = await fetch(`/api/products/${productId}/sources`);
        if (srcRes.ok) {
          selectedProduct = (await srcRes.json()) as ProductSourcesPayload;
          selectedSourceId = pickDefaultSourceId(selectedProduct.sources, preferLatestDeclaration);
          nextStatus = "matched";
        }
      }

      setMappedRows((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: nextStatus,
                candidates: payload.items,
                selectedProduct,
                selectedSourceId
              }
            : item
        )
      );
    } catch {
      setMappedRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: "not-found" } : item)));
    }
  }

  function toggleRowSelection(rowId: string) {
    setMappedRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, selected: !row.selected } : row)));
  }

  function toggleAllSelection() {
    const allSelected = mappedRows.every((row) => row.selected);
    setMappedRows((prev) => prev.map((row) => ({ ...row, selected: !allSelected })));
  }

  function selectAllRows() {
    setMappedRows((prev) => prev.map((row) => ({ ...row, selected: true })));
  }

  function clearRowSelection() {
    setMappedRows((prev) => prev.map((row) => ({ ...row, selected: false })));
  }

  function updateRowQuantity(rowId: string, quantity: number) {
    setMappedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, quantity: quantity < 1 ? 1 : quantity } : row))
    );
  }

  function removeRow(rowId: string) {
    setMappedRows((prev) => prev.filter((row) => row.id !== rowId).map((row, idx) => ({ ...row, index: idx + 1 })));
  }

  function removeSelectedRows() {
    setMappedRows((prev) => prev.filter((row) => !row.selected).map((row, idx) => ({ ...row, index: idx + 1 })));
  }

  function toggleSearchColumn(column: SearchResultColumnKey) {
    setVisibleSearchColumns((prev) => ({ ...prev, [column]: !prev[column] }));
  }

  function enableManualEntry(rowId: string) {
    setMappedRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              useManualEntry: true,
              manualEntry: row.manualEntry ?? createEmptyManualEntry(row.originalText)
            }
          : row
      )
    );
  }

  function disableManualEntry(rowId: string) {
    setMappedRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, useManualEntry: false } : row)));
  }

  function updateManualEntryField(
    rowId: string,
    field: "productName" | "hsCode" | "origin" | "brand" | "unit" | "unitWeightKg" | "description" | "dimensions" | "notes",
    value: string
  ) {
    setMappedRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              useManualEntry: true,
              manualEntry: {
                ...(row.manualEntry ?? createEmptyManualEntry(row.originalText)),
                [field]: field === "unitWeightKg" ? (Number(value.replace(",", ".")) || 0) : value
              }
            }
          : row
      )
    );
  }

  function addManualRowFromPicker() {
    const name = productPickerQuery.trim() || "Hàng hóa nhập tay";
    setMappedRows((prev) => [
      ...prev,
      {
        id: `row-manual-${Date.now()}`,
        index: prev.length + 1,
        originalText: name,
        status: "not-found",
        candidates: [],
        selectedProduct: null,
        selectedSourceId: "",
        quantity: 1,
        selected: true,
        makerBrandType: "maker",
        useManualEntry: true,
        manualEntry: createEmptyManualEntry(name)
      }
    ]);
    setShowProductPicker(false);
    setProductPickerQuery("");
  }

  function buildPackingOrderLine(row: MappedRow): PackingOrderLine | null {
    if (row.useManualEntry) {
      const manual = row.manualEntry ?? createEmptyManualEntry(row.originalText);
      return {
        id: `manual-${Date.now()}-${row.id}`,
        productName: manual.productName || row.originalText,
        contractOrPo: "",
        origin: manual.origin,
        brand: manual.brand,
        quantity: row.quantity,
        unit: manual.unit,
        unitWeightKg: manual.unitWeightKg,
        totalWeightKg: Number((manual.unitWeightKg * row.quantity).toFixed(6)),
        hsCode: manual.hsCode,
        sourceLabel: "Yêu cầu gốc / Nhập tay",
        notes: manual.notes
      };
    }

    if (row.status !== "matched" || !row.selectedProduct) {
      return null;
    }

    const source = row.selectedProduct.sources.find((item) => item.id === row.selectedSourceId);
    if (!source) {
      return null;
    }

    return {
      id: `${row.selectedProduct.id}-${source.id}-${Date.now()}-${row.id}`,
      productName: row.selectedProduct.name,
      contractOrPo: row.selectedProduct.contractOrPo,
      origin: source.origin,
      brand: source.brand,
      quantity: row.quantity,
      unit: source.unit || "",
      unitWeightKg: source.unitWeightKg,
      totalWeightKg: Number((source.unitWeightKg * row.quantity).toFixed(6)),
      hsCode: source.hsCode || "",
      sourceLabel: source.type === "manual" ? `Cơ sở ${source.referenceCode}` : `Số PK ${source.referenceCode}`,
      notes: source.notes
    };
  }

  function updateMakerBrandType(rowId: string, makerBrandType: "maker" | "brand") {
    setMappedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, makerBrandType } : row))
    );
  }

  async function selectCandidateForResolvingRow(candidateId: string, sourceId: string) {
    if (!resolvingRowId) return;

    try {
      const srcRes = await fetch(`/api/products/${candidateId}/sources`);
      if (!srcRes.ok) return;

      const srcPayload = (await srcRes.json()) as ProductSourcesPayload;
      setMappedRows((prev) =>
        prev.map((row) =>
          row.id === resolvingRowId
            ? {
                ...row,
                status: "matched",
                selectedProduct: srcPayload,
                selectedSourceId: sourceId || pickDefaultSourceId(srcPayload.sources)
              }
            : row
        )
      );
      setResolvingRowId(null);
    } catch (cause) {
      console.error(cause);
    }
  }

  async function saveOrder() {
    const lines = mappedRows
      .filter((row) => row.selected)
      .map(buildPackingOrderLine)
      .filter((line): line is PackingOrderLine => Boolean(line));
    if (!lines.length) {
      setError("Không có dòng nào hợp lệ để lưu.");
      return;
    }

    const response = await fetch(activeDraftId ? `/api/packing-orders/${activeDraftId}` : "/api/packing-orders", {
      method: activeDraftId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...exportHeader, lines })
    });

    const payload = (await response.json()) as { error?: string; id?: string };
    if (!response.ok) {
      setError(payload.error ?? "Không lưu được phiên làm việc.");
      return;
    }

    setActiveDraftId(payload.id ?? activeDraftId);
    setError("");
    setMessage(activeDraftId ? "Đã cập nhật phiên làm việc." : "Đã lưu phiên làm việc.");
  }

  async function exportDraft() {
    const lines = mappedRows
      .filter((row) => row.selected)
      .map(buildPackingOrderLine)
      .filter((line): line is PackingOrderLine => Boolean(line));
    if (!lines.length) {
      setError("Không có dòng nào hợp lệ để xuất Excel.");
      return;
    }

    const response = await fetch("/api/packing-orders/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...exportHeader, lines })
    });

    if (!response.ok) {
      setError("Xuất file Excel thất bại.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const fileName = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "packing-list.xls";
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setError("");
    setMessage("Đã xuất file Excel.");
  }

  if (viewMode === "input") {
    return (
      <div className="search-input-wrapper">
        <div className="search-input-header">
          <h1>
            Tra cứu <span>Thông tin</span> hàng hóa
          </h1>
          <p>Nhập danh sách các mặt hàng cần tra cứu thông tin nguồn gốc, lịch sử khai báo.</p>
        </div>
        <div className="search-input-container">
          <div className="magic-badge">
            <Zap size={14} /> Nhập thông tin hàng hóa
          </div>
          <input
            ref={lookupFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleLookupFileChange}
          />
          <textarea
            className="search-input-textarea"
            placeholder={"Nhập hoặc dán danh sách hàng hóa cần tra cứu vào đây...\n\nMỗi dòng nhập theo cú pháp: Tên hàng hóa || Số lượng\nNếu chỉ nhập tên hàng thì hệ thống tự hiểu số lượng = 1.\n\nVí dụ:\nBạc đạn 6023\nBulong M8 20 || 5\nMũi khoan 5 li || 12"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="search-input-footer">
            <div className="search-input-actions">
              <button className="attachment-btn" type="button" onClick={() => lookupFileInputRef.current?.click()}>
                <Paperclip size={16} className="icon" /> Nhập danh sách từ file excel
              </button>
              <a className="attachment-btn" href="/api/imports/lookup-list/template">
                <Download size={16} className="icon" /> Tải mẫu file import
              </a>
              <span className="attachment-info">Hỗ trợ file: .xlsx, .xls</span>
            </div>
            <button className="analyze-btn" onClick={analyzeInput} disabled={!inputText.trim()}>
              <Zap size={16} /> Tra cứu ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allSelected = mappedRows.length > 0 && mappedRows.every((row) => row.selected);
  const selectedRowCount = mappedRows.filter((row) => row.selected).length;
  const resolvingRow = mappedRows.find((row) => row.id === resolvingRowId);
  const sortedResolvingCandidates = resolvingRow ? [...resolvingRow.candidates].sort(compareProductSearchItems) : [];

  return (
    <>
      <div className="page-header" style={{ marginBottom: "16px" }}>
        <button className="btn btn-ghost" onClick={() => setViewMode("input")} style={{ padding: "8px 12px", marginRight: "16px" }}>
          &larr; Trở lại
        </button>
        <div className="page-header-icon">
          <Search size={20} />
        </div>
        <div className="page-header-text">
          <h2>Kết Quả Tra Cứu Hàng Loạt</h2>
          <p>Hệ thống đã tự động đối chiếu các dòng dữ liệu. Bạn có thể xác nhận lại ở bên dưới.</p>
        </div>
      </div>

      {message && <div className="badge badge-success mb-4 flex gap-2" style={{ width: "fit-content", padding: "8px 12px", fontSize: "0.9rem" }}><div /> {message}</div>}
      {error && <div className="badge badge-warn mb-4 flex gap-2" style={{ width: "fit-content", padding: "8px 12px", backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "0.9rem" }}><div /> {error}</div>}

      <div className="card mb-6">
        <div className="card-header" style={{ padding: "12px 20px" }}>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <span className="badge badge-primary">Tất cả {mappedRows.length}</span>
              <span className="badge badge-success">Đã khớp {mappedRows.filter((row) => row.status === "matched").length}</span>
              <span className="badge badge-warn">Cần xem {mappedRows.filter((row) => row.status === "ambiguous" || row.status === "not-found").length}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={selectAllRows} disabled={mappedRows.length === 0 || allSelected}>
              Chọn tất cả
            </button>
            <button className="btn btn-outline" onClick={clearRowSelection} disabled={selectedRowCount === 0}>
              Bỏ chọn
            </button>
            <button
              className="btn btn-outline"
              onClick={removeSelectedRows}
              disabled={selectedRowCount === 0}
              style={{ color: "var(--danger)", borderColor: "#fecaca", backgroundColor: "#fff5f5" }}
            >
              <Trash2 size={16} /> Xóa ({selectedRowCount})
            </button>
            <button className="btn btn-outline" onClick={saveOrder}>
              <Save size={16} /> Lưu phiên
            </button>
            <button className="btn btn-outline" onClick={exportDraft}>
              <Download size={16} /> Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={() => setShowExportForm(true)}>
              <FileSpreadsheet size={16} /> Xuất Packing List
            </button>
          </div>
        </div>

        <div className="table-container">
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", backgroundColor: "#f8fafc" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>Hiển thị cột:</span>
            {searchResultColumnOptions.map((column) => (
              <label key={column.key} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--text)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={visibleSearchColumns[column.key]}
                  onChange={() => toggleSearchColumn(column.key)}
                  style={{ cursor: "pointer" }}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead style={{ backgroundColor: "#f8fafc", position: "sticky", top: 0, zIndex: 5 }}>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} style={{ cursor: "pointer" }} />
                </th>
                <th style={{ width: "40px", textAlign: "center" }}>STT</th>
                <th style={{ width: "15%", textAlign: "center" }}>YÊU CẦU GỐC</th>
                <th style={{ width: "20%", textAlign: "center" }}>SẢN PHẨM KHỚP (hệ thống)</th>
                {visibleSearchColumns.source && <th style={{ width: "10%", textAlign: "center" }}>NGUỒN DỮ LIỆU</th>}
                {visibleSearchColumns.hsCode && <th style={{ width: "80px", textAlign: "center" }}>HS CODE</th>}
                {visibleSearchColumns.origin && <th style={{ width: "8%", textAlign: "center" }}>XUẤT XỨ</th>}
                {visibleSearchColumns.brand && <th style={{ width: "8%", textAlign: "center" }}>Maker/Brand</th>}
                {visibleSearchColumns.quantity && <th style={{ width: "100px", textAlign: "center" }}>SỐ LƯỢNG</th>}
                {visibleSearchColumns.unit && <th style={{ width: "90px", textAlign: "center" }}>Đ.VỊ TÍNH</th>}
                {visibleSearchColumns.unitWeight && <th style={{ width: "110px", textAlign: "center" }}>N.W / ĐV (KG)</th>}
                {visibleSearchColumns.totalWeight && <th style={{ width: "160px", textAlign: "center" }}>TRỌNG LƯỢNG N.W (KG)</th>}
                {visibleSearchColumns.description && <th style={{ width: "14%", textAlign: "center" }}>MÔ TẢ</th>}
                {visibleSearchColumns.dimensions && <th style={{ width: "10%", textAlign: "center" }}>KÍCH THƯỚC</th>}
                {visibleSearchColumns.notes && <th style={{ width: "12%", textAlign: "center" }}>GHI CHÚ</th>}
                <th style={{ width: "50px", textAlign: "center" }}>XÓA</th>
              </tr>
            </thead>
            <tbody>
              {mappedRows.map((row) => {
                const source = row.status === "matched" && row.selectedProduct
                  ? row.selectedProduct.sources.find((item) => item.id === row.selectedSourceId) ?? null
                  : null;
                const sourceTooltip = source ? getSourceTooltipLabel(source) : undefined;
                const manualEntry = row.manualEntry ?? createEmptyManualEntry(row.originalText);
                const quantityDisabled = !row.selected || (!row.useManualEntry && row.status !== "matched");
                const makerBrandType = row.makerBrandType ?? "maker";

                return (
                  <tr
                    key={row.id}
                    style={{
                      backgroundColor: row.selected ? "white" : "#f8fafc",
                      opacity: row.selected ? 1 : 0.6,
                      borderLeft: row.selected ? "3px solid var(--primary)" : "3px solid transparent"
                    }}
                  >
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRowSelection(row.id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ fontWeight: 500, color: "var(--muted)", textAlign: "center" }}>{row.index}</td>
                    <td><span style={{ fontWeight: 500 }}>{row.originalText}</span></td>
                    <td>
                      {row.useManualEntry && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <input
                            className="form-input"
                            value={manualEntry.productName}
                            onChange={(e) => updateManualEntryField(row.id, "productName", e.target.value)}
                            placeholder="Tên hàng hóa"
                            disabled={!row.selected}
                            style={{ minWidth: "220px", padding: "6px 8px", height: "36px" }}
                          />
                          {row.selectedProduct ? (
                            <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "0.8rem", width: "fit-content" }} onClick={() => disableManualEntry(row.id)}>
                              Dùng dữ liệu khớp
                            </button>
                          ) : null}
                        </div>
                      )}
                      {!row.useManualEntry && (
                        <>
                      {row.status === "pending" && <span style={{ color: "var(--muted)" }}>Đang xử lý...</span>}
                      {row.status === "matched" && row.selectedProduct && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} style={{ color: "var(--success)" }} />
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{row.selectedProduct.name}</div>
                          </div>
                          <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                            {row.candidates.length > 0 && (
                              <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "0.8rem", width: "fit-content" }} onClick={() => setResolvingRowId(row.id)}>
                                Chọn lại sản phẩm khớp
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {row.status === "ambiguous" && (
                        <div className="flex items-center gap-3">
                          <span style={{ color: "#d97706", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
                            <HelpCircle size={16} /> Nhiều kết quả tương đồng.
                          </span>
                          <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "0.8rem", borderColor: "#d97706", color: "#d97706" }} onClick={() => setResolvingRowId(row.id)}>
                            + Chọn thủ công
                          </button>
                        </div>
                      )}
                      {row.status === "not-found" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                          <div className="flex items-center gap-2">
                            <AlertCircle size={16} style={{ color: "var(--danger)" }} />
                            <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>Không tìm thấy trong hệ thống.</span>
                          </div>
                          <button className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "0.8rem" }} onClick={() => enableManualEntry(row.id)}>
                            Nhập thủ công
                          </button>
                        </div>
                      )}
                        </>
                      )}
                    </td>
                    {visibleSearchColumns.source && (
                    <td>
                      {row.useManualEntry ? (
                        <span />
                      ) : row.status === "matched" && row.selectedProduct ? (
                        <div title={sourceTooltip}>
                          <select
                            className="form-input"
                            value={row.selectedSourceId}
                            onChange={(e) => setMappedRows((prev) => prev.map((item) => item.id === row.id ? { ...item, selectedSourceId: e.target.value } : item))}
                            style={{ minWidth: "190px", padding: "6px 8px", height: "36px" }}
                            disabled={!row.selected}
                            title={sourceTooltip}
                          >
                            {getSearchSelectableSources(row.selectedProduct.sources).map((src) => (
                              <option key={src.id} value={src.id}>
                                {getSourceOptionLabel(src)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span title={sourceTooltip}>{source ? getSourceShortLabel(source) : "-"}</span>
                      )}
                    </td>
                    )}
                    {visibleSearchColumns.hsCode && <td style={{ textAlign: "center" }}>{row.useManualEntry ? <input className="form-input" value={manualEntry.hsCode} onChange={(e) => updateManualEntryField(row.id, "hsCode", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "90px" }} /> : source?.hsCode || "-"}</td>}
                    {visibleSearchColumns.origin && <td style={{ textAlign: "center" }}>{row.useManualEntry ? <input className="form-input" value={manualEntry.origin} onChange={(e) => updateManualEntryField(row.id, "origin", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "90px" }} /> : source?.origin || "-"}</td>}
                    {visibleSearchColumns.brand && (
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                        {row.useManualEntry ? (
                          <input className="form-input" value={manualEntry.brand} onChange={(e) => updateManualEntryField(row.id, "brand", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "100px" }} />
                        ) : (
                          <span>{source?.brand || "-"}</span>
                        )}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              border: "1px solid",
                              borderColor: makerBrandType === "maker" ? "#bfdbfe" : "#e2e8f0",
                              backgroundColor: makerBrandType === "maker" ? "#dbeafe" : "white",
                              color: makerBrandType === "maker" ? "#1d4ed8" : "#64748b"
                            }}
                            disabled={!row.selected}
                            onClick={() => updateMakerBrandType(row.id, "maker")}
                          >
                            Maker
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              border: "1px solid",
                              borderColor: makerBrandType === "brand" ? "#bfdbfe" : "#e2e8f0",
                              backgroundColor: makerBrandType === "brand" ? "#dbeafe" : "white",
                              color: makerBrandType === "brand" ? "#1d4ed8" : "#64748b"
                            }}
                            disabled={!row.selected}
                            onClick={() => updateMakerBrandType(row.id, "brand")}
                          >
                            Brand
                          </button>
                        </div>
                      </div>
                    </td>
                    )}
                    {visibleSearchColumns.quantity && (
                    <td style={{ textAlign: "center" }}>
                      <div className="flex items-center gap-1" style={{ width: "100px", margin: "0 auto" }}>
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => updateRowQuantity(row.id, row.quantity - 1)} disabled={quantityDisabled}>-</button>
                        <input type="number" value={row.quantity} onChange={(e) => updateRowQuantity(row.id, parseInt(e.target.value, 10) || 1)} className="form-input" style={{ padding: "4px", textAlign: "center", height: "32px" }} disabled={quantityDisabled} />
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => updateRowQuantity(row.id, row.quantity + 1)} disabled={quantityDisabled}>+</button>
                      </div>
                    </td>
                    )}
                    {visibleSearchColumns.unit && <td style={{ textAlign: "center" }}>{row.useManualEntry ? <input className="form-input" value={manualEntry.unit} onChange={(e) => updateManualEntryField(row.id, "unit", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "80px" }} /> : source?.unit || "-"}</td>}
                    {visibleSearchColumns.unitWeight && <td style={{ textAlign: "right" }}>{row.useManualEntry ? <input className="form-input" type="number" step="0.001" value={manualEntry.unitWeightKg || ""} onChange={(e) => updateManualEntryField(row.id, "unitWeightKg", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "90px" }} /> : source?.unitWeightKg ? `${source.unitWeightKg}` : "-"}</td>}
                    {visibleSearchColumns.totalWeight && <td style={{ textAlign: "right", fontWeight: 600 }}>{row.useManualEntry ? `${(manualEntry.unitWeightKg * row.quantity).toFixed(2)}` : source?.unitWeightKg ? `${(source.unitWeightKg * row.quantity).toFixed(2)}` : "-"}</td>}
                    {visibleSearchColumns.description && <td>{row.useManualEntry ? <input className="form-input" value={manualEntry.description} onChange={(e) => updateManualEntryField(row.id, "description", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "120px" }} /> : source?.description || "-"}</td>}
                    {visibleSearchColumns.dimensions && <td style={{ textAlign: "center" }}>{row.useManualEntry ? <input className="form-input" value={manualEntry.dimensions} onChange={(e) => updateManualEntryField(row.id, "dimensions", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "120px" }} /> : source?.dimensions || "-"}</td>}
                    {visibleSearchColumns.notes && <td>{row.useManualEntry ? <input className="form-input" value={manualEntry.notes} onChange={(e) => updateManualEntryField(row.id, "notes", e.target.value)} disabled={!row.selected} style={{ padding: "6px 8px", height: "36px", minWidth: "120px" }} /> : source?.notes || "-"}</td>}
                    <td style={{ textAlign: "center" }}>
                      <button className="btn btn-ghost" style={{ color: "var(--danger)", padding: "6px" }} onClick={() => removeRow(row.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid var(--line)" }}>
          <button className="btn btn-ghost" style={{ color: "var(--primary)", fontWeight: 600 }} onClick={() => setShowProductPicker(true)}>
            <Plus size={16} /> Thêm hàng hóa
          </button>
        </div>
      </div>

      {resolvingRow && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "min(1280px, 96vw)", height: "88vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <div className="card-header flex justify-between items-center" style={{ backgroundColor: "white" }}>
              <div className="flex items-center" style={{ gap: "12px" }}>
                <h3 className="card-title">Chọn sản phẩm cho: {resolvingRow.originalText}</h3>
                <button
                  className="btn btn-outline"
                  style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  onClick={() => {
                    enableManualEntry(resolvingRow.id);
                    setResolvingRowId(null);
                  }}
                >
                  Nhập thủ công
                </button>
              </div>
              <button className="btn btn-ghost" style={{ padding: "4px" }} onClick={() => setResolvingRowId(null)}><X size={20} /></button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "row", overflow: "hidden", padding: 0, flex: 1, minHeight: 0 }}>
              {sortedResolvingCandidates.length === 0 ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Không có gợi ý nào phù hợp.</p></div>
              ) : (
                <>
                  <div style={{ width: "36%", borderRight: "1px solid #e2e8f0", overflowY: "auto", backgroundColor: "white" }}>
                    <div style={{ padding: "16px", borderBottom: "1px solid var(--line)", backgroundColor: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", color: "var(--muted)", position: "sticky", top: 0, zIndex: 5 }}>
                      DANH MỤC HÀNG HÓA KHỚP ({sortedResolvingCandidates.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {sortedResolvingCandidates.map((cand, idx) => {
                        const sources = getOrderedSourcesForProduct(cand);
                        const isHovered = hoveredResolveCandId === cand.id;
                        return (
                          <div
                            key={cand.id}
                            onClick={() => setHoveredResolveCandId(cand.id)}
                            onMouseEnter={() => setHoveredResolveCandId(cand.id)}
                            style={{
                              padding: "16px",
                              borderBottom: "1px solid var(--line)",
                              backgroundColor: isHovered ? "#eff6ff" : "white",
                              borderLeft: isHovered ? "4px solid var(--primary)" : "4px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                              <div style={{ fontWeight: isHovered ? 600 : 500, color: isHovered ? "var(--primary)" : "inherit", flex: 1 }}>
                                {idx + 1}. {cand.name}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                                <span className="badge" style={{ backgroundColor: isHovered ? "#dbeafe" : "#f1f5f9", color: isHovered ? "#1e40af" : "#64748b" }}>
                                  {sources.length} nguồn
                                </span>
                                <span className="badge" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                                  Khớp {cand.matchScore ?? 0}%
                                </span>
                              </div>
                            </div>
                            <div style={{ display: "none" }}>
                              {sources.length} nguồn dữ liệu
                            </div>
                            <div style={{ display: "none" }}>
                              <span className="badge" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                                Khớp {cand.matchScore ?? 0}%
                              </span>
                            </div>
                            {cand.aliases && cand.aliases.length > 0 && (
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "8px" }}>
                                Alias: {cand.aliases.join(", ")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ width: "64%", overflowY: "auto", padding: "20px 24px", backgroundColor: "#f8fafc" }}>
                    {hoveredResolveCandId ? (
                      (() => {
                        const cand = sortedResolvingCandidates.find((item) => item.id === hoveredResolveCandId);
                        if (!cand) return null;
                        const sources = getOrderedSourcesForProduct(cand);
                        return (
                          <div>
                            <h4 style={{ marginBottom: "16px", fontWeight: 600, color: "var(--text)", fontSize: "1.1rem" }}>
                              Nguồn dữ liệu của: <span style={{ color: "#4f46e5" }}>{cand.name}</span>
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              {sources.map((src) => (
                                <div key={src.id} className="card" style={{ border: src.type === "manual" ? "1px solid #c7d2fe" : "1px solid #bbf7d0", boxShadow: "none", margin: 0 }}>
                                  <div className="card-header flex justify-between items-center" style={{ backgroundColor: src.type === "manual" ? "#e0e7ff" : "#dcfce7", padding: "12px 16px", gap: "16px" }}>
                                    <h3 className="card-title" style={{ fontSize: "0.9rem", margin: 0, display: "flex", alignItems: "center", gap: "8px", color: src.type === "manual" ? "#3730a3" : "#166534" }}>
                                      {src.type === "manual" ? <Database size={16} /> : <FileSpreadsheet size={16} />}
                                      {src.type === "manual" ? "Cơ sở (Thủ công / Excel)" : `${getSourceCustomerName(src) || "Khách hàng chưa có"} • Số PK: ${src.referenceCode || "-"}`}
                                      {src.type !== "manual" && src.declaredAt && (
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534", marginLeft: "8px", backgroundColor: "rgba(255,255,255,0.75)", padding: "3px 10px", borderRadius: "999px" }}>
                                          {new Date(src.declaredAt).toLocaleDateString("vi-VN")}
                                        </span>
                                      )}
                                    </h3>
                                    <button className="btn btn-primary" style={{ background: "linear-gradient(to right, #6366f1, #3b82f6)", padding: "8px 20px", fontSize: "0.9rem", height: "fit-content", flexShrink: 0 }} onClick={() => selectCandidateForResolvingRow(cand.id, src.id)}>
                                      Chọn
                                    </button>
                                  </div>
                                  <div className="card-body" style={{ padding: "16px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.9rem" }}>
                                      <div><span style={{ color: "var(--muted)" }}>Xuất xứ:</span> <strong>{src.origin || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Thương hiệu:</span> <strong>{src.brand || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>HS Code:</span> <strong>{src.hsCode || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Mô tả:</span> <strong>{src.description || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Kích thước:</span> <strong>{src.dimensions || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Trọng lượng:</span> <strong>{src.unitWeightKg || "-"} kg/{src.unit || "đv"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Số lượng:</span> <strong>{src.quantity || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Tổng N.W:</span> <strong>{src.totalWeightKg || "-"} kg</strong></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sources.length === 0 && (
                                <div style={{ padding: "16px", color: "var(--muted)", textAlign: "center", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>Sản phẩm này chưa có nguồn dữ liệu.</div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "1.1rem", marginBottom: "8px", fontWeight: 500 }}>Chưa chọn hàng hóa</p>
                          <p>Rê chuột vào hàng hóa bên trái để xem nguồn dữ liệu</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showProductPicker && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "min(1280px, 96vw)", height: "88vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <div className="card-header" style={{ padding: "16px 20px", backgroundColor: "white" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div className="search-bar" style={{ flex: 1 }}>
                  <Search size={18} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: "1rem", padding: "12px 12px 12px 44px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    placeholder="Lọc theo tên, thương hiệu..."
                    value={productPickerQuery}
                    onChange={(e) => setProductPickerQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "0.9rem" }} onClick={addManualRowFromPicker}>
                  <Plus size={16} /> Thêm thủ công
                </button>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "row", overflow: "hidden", padding: 0, flex: 1, minHeight: 0 }}>
              {isPending ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Đang tải...</p></div>
              ) : pickerProducts.length === 0 ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Không tìm thấy sản phẩm.</p></div>
              ) : (
                <>
                  <div style={{ width: "36%", borderRight: "1px solid #e2e8f0", overflowY: "auto", backgroundColor: "white" }}>
                    <div style={{ padding: "16px", borderBottom: "1px solid var(--line)", backgroundColor: "#f8fafc", fontWeight: 600, fontSize: "0.9rem", color: "var(--muted)", position: "sticky", top: 0, zIndex: 5 }}>
                      DANH MỤC HÀNG HÓA ({pickerProducts.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {pickerProducts.map((cand, idx) => {
                        const sources = getOrderedSourcesForProduct(cand);
                        const isHovered = hoveredCandId === cand.id;
                        return (
                          <div
                            key={cand.id}
                            onClick={() => setHoveredCandId(cand.id)}
                            onMouseEnter={() => setHoveredCandId(cand.id)}
                            style={{
                              padding: "16px",
                              borderBottom: "1px solid var(--line)",
                              backgroundColor: isHovered ? "#eff6ff" : "white",
                              borderLeft: isHovered ? "4px solid var(--primary)" : "4px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                              <div style={{ fontWeight: isHovered ? 600 : 500, color: isHovered ? "var(--primary)" : "inherit", flex: 1 }}>
                                {idx + 1}. {cand.name}
                              </div>
                              <span className="badge" style={{ backgroundColor: isHovered ? "#dbeafe" : "#f1f5f9", color: isHovered ? "#1e40af" : "#64748b", flexShrink: 0 }}>
                                {sources.length} nguồn
                              </span>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "8px" }}>
                              MPN: {cand.contractOrPo || "Không có"}
                            </div>
                            {cand.aliases && cand.aliases.length > 0 && (
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "8px" }}>
                                Alias: {cand.aliases.join(", ")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ width: "64%", overflowY: "auto", padding: "20px 24px", backgroundColor: "#f8fafc" }}>
                    {hoveredCandId ? (
                      (() => {
                        const cand = pickerProducts.find((item) => item.id === hoveredCandId);
                        if (!cand) return null;
                        const sources = getOrderedSourcesForProduct(cand);
                        return (
                          <div>
                            <h4 style={{ marginBottom: "16px", fontWeight: 600, color: "var(--text)", fontSize: "1.1rem" }}>
                              Thêm từ nguồn của: <span style={{ color: "#4f46e5" }}>{cand.name}</span>
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              {sources.map((src) => (
                                <div key={src.id} className="card" style={{ border: src.type === "manual" ? "1px solid #c7d2fe" : "1px solid #bbf7d0", boxShadow: "none", margin: 0 }}>
                                  <div className="card-header flex justify-between items-center" style={{ backgroundColor: src.type === "manual" ? "#e0e7ff" : "#dcfce7", padding: "12px 16px", gap: "16px" }}>
                                    <h3 className="card-title" style={{ fontSize: "0.9rem", margin: 0, display: "flex", alignItems: "center", gap: "8px", color: src.type === "manual" ? "#3730a3" : "#166534" }}>
                                      {src.type === "manual" ? <Database size={16} /> : <FileSpreadsheet size={16} />}
                                      {src.type === "manual" ? "Cơ sở (Thủ công / Excel)" : `${getSourceCustomerName(src) || "Khách hàng chưa có"} • Số PK: ${src.referenceCode || "-"}`}
                                      {src.type !== "manual" && src.declaredAt && (
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534", marginLeft: "8px", backgroundColor: "rgba(255,255,255,0.75)", padding: "3px 10px", borderRadius: "999px" }}>
                                          {new Date(src.declaredAt).toLocaleDateString("vi-VN")}
                                        </span>
                                      )}
                                    </h3>
                                    <button className="btn btn-primary" style={{ background: "linear-gradient(to right, #6366f1, #3b82f6)", padding: "8px 20px", fontSize: "0.9rem", height: "fit-content", flexShrink: 0 }} onClick={() => addProductRowFromPicker(cand, src.id)}>
                                      + Thêm
                                    </button>
                                  </div>
                                  <div className="card-body" style={{ padding: "16px" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.9rem" }}>
                                      <div><span style={{ color: "var(--muted)" }}>Xuất xứ:</span> <strong>{src.origin || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Thương hiệu:</span> <strong>{src.brand || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>HS Code:</span> <strong>{src.hsCode || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Mô tả:</span> <strong>{src.description || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Kích thước:</span> <strong>{src.dimensions || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Trọng lượng:</span> <strong>{src.unitWeightKg || "-"} kg/{src.unit || "đv"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Số lượng:</span> <strong>{src.quantity || "-"}</strong></div>
                                      <div><span style={{ color: "var(--muted)" }}>Tổng N.W:</span> <strong>{src.totalWeightKg || "-"} kg</strong></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {sources.length === 0 && (
                                <div style={{ padding: "16px", color: "var(--muted)", textAlign: "center", backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>Sản phẩm này chưa có nguồn dữ liệu.</div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "1.1rem", marginBottom: "8px", fontWeight: 500 }}>Chưa chọn hàng hóa</p>
                          <p>Rê chuột vào hàng hóa bên trái để xem các nguồn dữ liệu</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="card-header flex justify-between items-center" style={{ borderTop: "1px solid var(--line)", backgroundColor: "white", borderBottom: "none" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Zap size={14} style={{ color: "#d97706" }} /> Có thể thêm nhiều dòng - đóng cửa sổ khi xong.
              </div>
              <button className="btn btn-outline" onClick={() => setShowProductPicker(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      {showExportForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "650px", backgroundColor: "white", borderRadius: "12px", overflow: "hidden" }}>
            <div className="card-header flex justify-between items-center" style={{ backgroundColor: "#f8fafc", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 className="card-title" style={{ fontSize: "1.1rem", fontWeight: 600 }}>Thông tin Packing List</h3>
              <button className="btn btn-ghost" style={{ padding: "4px" }} onClick={() => setShowExportForm(false)}><X size={20} /></button>
            </div>
            <div className="card-body" style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Khách hàng</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.customerName} onChange={(e) => setExportHeader((prev) => ({ ...prev, customerName: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Địa chỉ</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.customerAddress || ""} onChange={(e) => setExportHeader((prev) => ({ ...prev, customerAddress: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>MST</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.customerTaxCode || ""} onChange={(e) => setExportHeader((prev) => ({ ...prev, customerTaxCode: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Số chứng từ</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.documentNo} onChange={(e) => setExportHeader((prev) => ({ ...prev, documentNo: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Ngày</label>
                  <input type="date" className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.documentDate} onChange={(e) => setExportHeader((prev) => ({ ...prev, documentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Thanh toán</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.paymentTerm} onChange={(e) => setExportHeader((prev) => ({ ...prev, paymentTerm: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Phương thức giao hàng</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.deliveryMethod} onChange={(e) => setExportHeader((prev) => ({ ...prev, deliveryMethod: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: "6px", display: "block", color: "#475569" }}>Thời hạn giao hàng</label>
                  <input className="form-input" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={exportHeader.deliveryWindow} onChange={(e) => setExportHeader((prev) => ({ ...prev, deliveryWindow: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <button className="btn btn-outline" style={{ padding: "8px 20px" }} onClick={() => setShowExportForm(false)}>Hủy</button>
                <button className="btn btn-primary" style={{ padding: "8px 20px", background: "var(--primary)" }} onClick={() => { setShowExportForm(false); exportDraft(); }}>
                  <FileSpreadsheet size={16} style={{ marginRight: "6px" }} /> Tiến hành Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
