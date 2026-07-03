"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
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

function pickDefaultSourceId(sources: ProductSource[]) {
  return [...sources].sort((a, b) => getSourcePriority(b) - getSourcePriority(a))[0]?.id ?? "";
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
          selected: true
        }
      ]);
      setMessage(`Đã thêm ${product.name}`);
    } catch (cause) {
      console.error(cause);
    }
  }

  async function analyzeInput() {
    const lines = inputText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;

    setViewMode("results");
    setMessage("");
    setError("");

    const initialRows: MappedRow[] = lines.map((line, idx) => ({
      id: `row-${Date.now()}-${idx}`,
      index: idx + 1,
      originalText: line,
      status: "pending",
      candidates: [],
      selectedProduct: null,
      selectedSourceId: "",
      quantity: 1,
      selected: true
    }));

    setMappedRows(initialRows);

    for (const row of initialRows) {
      void processAutoSearch(row);
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

      if (payload.items.length === 0) {
        nextStatus = "not-found";
      } else if (
        exactCandidate ||
        (payload.items.length === 1 && (payload.items[0]?.matchScore ?? 0) >= 92)
      ) {
        const productId = (exactCandidate ?? payload.items[0]).id;
        const srcRes = await fetch(`/api/products/${productId}/sources`);
        if (srcRes.ok) {
          selectedProduct = (await srcRes.json()) as ProductSourcesPayload;
          selectedSourceId = pickDefaultSourceId(selectedProduct.sources);
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

  function updateRowQuantity(rowId: string, quantity: number) {
    setMappedRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, quantity: quantity < 1 ? 1 : quantity } : row))
    );
  }

  function removeRow(rowId: string) {
    setMappedRows((prev) => prev.filter((row) => row.id !== rowId).map((row, idx) => ({ ...row, index: idx + 1 })));
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
    const activeRows = mappedRows.filter((row) => row.selected && row.status === "matched" && row.selectedProduct);
    if (!activeRows.length) {
      setError("Không có dòng nào hợp lệ (đã khớp) để lưu.");
      return;
    }

    const lines: PackingOrderLine[] = activeRows.map((row) => {
      const source = row.selectedProduct!.sources.find((item) => item.id === row.selectedSourceId)!;
      return {
        id: `${row.selectedProduct!.id}-${source.id}-${Date.now()}-${row.id}`,
        productName: row.selectedProduct!.name,
        contractOrPo: row.selectedProduct!.contractOrPo,
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
    });

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
    const activeRows = mappedRows.filter((row) => row.selected && row.status === "matched" && row.selectedProduct);
    if (!activeRows.length) {
      setError("Không có dòng nào hợp lệ (đã khớp) để xuất Excel.");
      return;
    }

    const lines: PackingOrderLine[] = activeRows.map((row) => {
      const source = row.selectedProduct!.sources.find((item) => item.id === row.selectedSourceId)!;
      return {
        id: `${row.selectedProduct!.id}-${source.id}-${Date.now()}-${row.id}`,
        productName: row.selectedProduct!.name,
        contractOrPo: row.selectedProduct!.contractOrPo,
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
    });

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
          <textarea
            className="search-input-textarea"
            placeholder={"Nhập hoặc dán danh sách hàng hóa cần tra cứu vào đây...\n\nLưu ý quan trọng: MỖI SẢN PHẨM VUI LÒNG NHẬP TRÊN 1 DÒNG RIÊNG BIỆT.\n\nVí dụ:\nBạc đạn 6023\nBulong M8 20\nMũi khoan 5 li"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="search-input-footer">
            <div className="flex items-center">
              <button className="attachment-btn" type="button">
                <Paperclip size={16} className="icon" /> Tệp đính kèm
              </button>
              <span className="attachment-info">Hỗ trợ file: .xlsx · .csv</span>
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
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
            <thead style={{ backgroundColor: "#f8fafc", position: "sticky", top: 0, zIndex: 5 }}>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAllSelection} style={{ cursor: "pointer" }} />
                </th>
                <th style={{ width: "40px" }}>STT</th>
                <th style={{ width: "15%" }}>YÊU CẦU GỐC</th>
                <th style={{ width: "20%" }}>SẢN PHẨM KHỚP (hệ thống)</th>
                <th style={{ width: "10%" }}>NGUỒN DỮ LIỆU</th>
                <th style={{ width: "80px" }}>HS CODE</th>
                <th style={{ width: "8%" }}>XUẤT XỨ</th>
                <th style={{ width: "8%" }}>Maker/Brand</th>
                <th style={{ width: "100px" }}>SỐ LƯỢNG</th>
                <th style={{ width: "90px", textAlign: "center" }}>Đ.VỊ TÍNH</th>
                <th style={{ width: "110px", textAlign: "right" }}>N.W / ĐV (KG)</th>
                <th style={{ width: "160px", textAlign: "right" }}>TRỌNG LƯỢNG N.W (KG)</th>
                <th style={{ width: "50px", textAlign: "center" }}>XÓA</th>
              </tr>
            </thead>
            <tbody>
              {mappedRows.map((row) => {
                const source = row.status === "matched" && row.selectedProduct
                  ? row.selectedProduct.sources.find((item) => item.id === row.selectedSourceId) ?? null
                  : null;

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
                    <td style={{ fontWeight: 500, color: "var(--muted)" }}>{row.index}</td>
                    <td><span style={{ fontWeight: 500 }}>{row.originalText}</span></td>
                    <td>
                      {row.status === "pending" && <span style={{ color: "var(--muted)" }}>Đang xử lý...</span>}
                      {row.status === "matched" && row.selectedProduct && (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} style={{ color: "var(--success)" }} />
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>{row.selectedProduct.name}</div>
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
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} style={{ color: "var(--danger)" }} />
                          <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>Không tìm thấy trong hệ thống.</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {row.status === "matched" && row.selectedProduct ? (
                        <select
                          className="form-input"
                          value={row.selectedSourceId}
                          onChange={(e) => setMappedRows((prev) => prev.map((item) => item.id === row.id ? { ...item, selectedSourceId: e.target.value } : item))}
                          style={{ minWidth: "190px", padding: "6px 8px", height: "36px" }}
                          disabled={!row.selected}
                        >
                          {row.selectedProduct.sources
                            .slice()
                            .sort((a, b) => getSourcePriority(b) - getSourcePriority(a))
                            .map((src) => (
                              <option key={src.id} value={src.id}>
                                {getSourceDisplayLabel(src)}
                              </option>
                            ))}
                        </select>
                      ) : (
                        source ? (source.type === "manual" ? "Thông tin cơ sở" : "Packing List") : "-"
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>{source?.hsCode || "-"}</td>
                    <td style={{ fontSize: "0.85rem" }}>{source?.origin || "-"}</td>
                    <td style={{ fontSize: "0.85rem" }}>{source?.brand || "-"}</td>
                    <td>
                      <div className="flex items-center gap-1" style={{ width: "100px" }}>
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => updateRowQuantity(row.id, row.quantity - 1)} disabled={!row.selected || row.status !== "matched"}>-</button>
                        <input type="number" value={row.quantity} onChange={(e) => updateRowQuantity(row.id, parseInt(e.target.value, 10) || 1)} className="form-input" style={{ padding: "4px", textAlign: "center", height: "32px" }} disabled={!row.selected || row.status !== "matched"} />
                        <button className="btn btn-ghost" style={{ padding: "4px 8px" }} onClick={() => updateRowQuantity(row.id, row.quantity + 1)} disabled={!row.selected || row.status !== "matched"}>+</button>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>{source?.unit || "-"}</td>
                    <td style={{ textAlign: "right" }}>{source?.unitWeightKg ? `${source.unitWeightKg}` : "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{source?.unitWeightKg ? `${(source.unitWeightKg * row.quantity).toFixed(2)}` : "-"}</td>
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
          <div className="card" style={{ width: "980px", maxHeight: "80vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <div className="card-header flex justify-between items-center" style={{ backgroundColor: "white" }}>
              <h3 className="card-title">Chọn sản phẩm cho: {resolvingRow.originalText}</h3>
              <button className="btn btn-ghost" style={{ padding: "4px" }} onClick={() => setResolvingRowId(null)}><X size={20} /></button>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "row", overflow: "hidden", padding: 0, flex: 1 }}>
              {sortedResolvingCandidates.length === 0 ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Không có gợi ý nào phù hợp.</p></div>
              ) : (
                <>
                  <div style={{ width: "40%", borderRight: "1px solid #e2e8f0", overflowY: "auto", padding: "16px", backgroundColor: "white" }}>
                    <div className="flex-col gap-3">
                      {sortedResolvingCandidates.map((cand) => {
                        const sources = getOrderedSourcesForProduct(cand);
                        const isHovered = hoveredResolveCandId === cand.id;
                        return (
                          <div
                            key={cand.id}
                            style={{
                              border: "1px solid",
                              borderColor: isHovered ? "#6366f1" : "#e2e8f0",
                              borderRadius: "8px",
                              padding: "12px",
                              backgroundColor: isHovered ? "#eef2ff" : "white",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              boxShadow: isHovered ? "0 2px 4px rgba(99, 102, 241, 0.1)" : "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={() => setHoveredResolveCandId(cand.id)}
                          >
                            <div style={{ fontWeight: 600, color: isHovered ? "#4338ca" : "var(--text)", fontSize: "1rem", marginBottom: "4px" }}>{cand.name}</div>
                            <div style={{ fontSize: "0.85rem", color: "#8b5cf6", marginTop: "4px", fontWeight: 500 }}>{sources.length} nguồn dữ liệu</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ width: "60%", overflowY: "auto", padding: "20px", backgroundColor: "#f8fafc" }}>
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
                            <div className="flex-col gap-3">
                              {sources.map((src) => (
                                <div key={src.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize: "0.9rem", flex: 1 }}>
                                    <div style={{ marginBottom: "10px" }}>
                                      <span className="badge" style={{ backgroundColor: src.type === "manual" ? "#e0e7ff" : "#dcfce7", color: src.type === "manual" ? "#3730a3" : "#166534", padding: "4px 8px" }}>
                                        {src.type === "manual" ? "Cơ sở" : getSourceCustomerName(src) || "Packing List"}
                                      </span>
                                    </div>
                                    <div style={{ color: "var(--muted)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px" }}>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>Maker/Brand:</span> <span>{src.brand || "N/A"}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>Xuất xứ:</span> <span>{src.origin || "N/A"}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>N.W/Đv:</span> <span>{src.unitWeightKg || 0}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>HS Code:</span> <span>{src.hsCode || "N/A"}</span>
                                    </div>
                                  </div>
                                  <button className="btn btn-primary" style={{ background: "linear-gradient(to right, #6366f1, #3b82f6)", padding: "8px 20px", fontSize: "0.9rem", height: "fit-content", marginLeft: "16px" }} onClick={() => selectCandidateForResolvingRow(cand.id, src.id)}>
                                    Chọn
                                  </button>
                                </div>
                              ))}
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
          <div className="card" style={{ width: "900px", maxHeight: "85vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <div className="card-header" style={{ padding: "16px 20px", backgroundColor: "white" }}>
              <div className="search-bar">
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
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "row", overflow: "hidden", padding: 0, flex: 1 }}>
              {isPending ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Đang tải...</p></div>
              ) : pickerProducts.length === 0 ? (
                <div style={{ padding: "20px", width: "100%", textAlign: "center" }}><p style={{ color: "var(--muted)" }}>Không tìm thấy sản phẩm.</p></div>
              ) : (
                <>
                  <div style={{ width: "40%", borderRight: "1px solid #e2e8f0", overflowY: "auto", padding: "16px", backgroundColor: "white" }}>
                    <div className="flex-col gap-3">
                      {pickerProducts.map((cand) => {
                        const sources = getOrderedSourcesForProduct(cand);
                        const isHovered = hoveredCandId === cand.id;
                        return (
                          <div
                            key={cand.id}
                            style={{
                              border: "1px solid",
                              borderColor: isHovered ? "#6366f1" : "#e2e8f0",
                              borderRadius: "8px",
                              padding: "12px",
                              backgroundColor: isHovered ? "#eef2ff" : "white",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              boxShadow: isHovered ? "0 2px 4px rgba(99, 102, 241, 0.1)" : "0 1px 2px rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={() => setHoveredCandId(cand.id)}
                          >
                            <div style={{ fontWeight: 600, color: isHovered ? "#4338ca" : "var(--text)", fontSize: "1rem", marginBottom: "4px" }}>{cand.name}</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>MPN: {cand.contractOrPo || "Không có"}</div>
                            <div style={{ fontSize: "0.85rem", color: "#8b5cf6", marginTop: "4px", fontWeight: 500 }}>{sources.length} nguồn dữ liệu</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ width: "60%", overflowY: "auto", padding: "20px", backgroundColor: "#f8fafc" }}>
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
                            <div className="flex-col gap-3">
                              {sources.map((src) => (
                                <div key={src.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                  <div style={{ fontSize: "0.9rem", flex: 1 }}>
                                    <div style={{ marginBottom: "10px" }}>
                                      <span className="badge" style={{ backgroundColor: src.type === "manual" ? "#e0e7ff" : "#dcfce7", color: src.type === "manual" ? "#3730a3" : "#166534", padding: "4px 8px" }}>
                                        {src.type === "manual" ? "Cơ sở" : "Packing List"}
                                      </span>
                                    </div>
                                    <div style={{ color: "var(--muted)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px" }}>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>Maker/Brand:</span> <span>{src.brand || "N/A"}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>Xuất xứ:</span> <span>{src.origin || "N/A"}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>N.W/Đv:</span> <span>{src.unitWeightKg || 0}</span>
                                      <span style={{ fontWeight: 600, color: "#475569" }}>HS Code:</span> <span>{src.hsCode || "N/A"}</span>
                                    </div>
                                  </div>
                                  <button className="btn btn-primary" style={{ background: "linear-gradient(to right, #6366f1, #3b82f6)", padding: "8px 20px", fontSize: "0.9rem", height: "fit-content", marginLeft: "16px" }} onClick={() => addProductRowFromPicker(cand, src.id)}>
                                    +Thêm
                                  </button>
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
