"use client";

import { useEffect, useState } from "react";
import { Database, Upload, Lock, Plus, CheckCircle2, AlertCircle, FileSpreadsheet, Edit2, Trash2, Search, X, Zap, Save, List, Key, Unlock, Shield, Download } from "lucide-react";
import { ProductRecord } from "@/lib/types";

const MANUAL_INPUT_DELIMITER = "||";

function formatCompareValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Chưa có";
  }

  return String(value);
}

function isDifferentValue(left: unknown, right: unknown) {
  const normalize = (value: unknown) => String(value ?? "").trim();
  return normalize(left) !== normalize(right);
}

function normalizeDuplicateText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeImportKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
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

function getSourceCustomerName(source: any) {
  const metadata = parseSourceMetadata(source?.metadata);
  return String(metadata?.customerName ?? "").trim();
}

function findMatchingDeclarationSource(candidate: any, importContext: any) {
  if (!candidate?.declarationHistory?.length || !importContext) {
    return null;
  }

  const referenceCode = normalizeImportKey(importContext.documentNo);
  const declaredAt = normalizeImportKey(importContext.documentDate);
  const customerName = normalizeImportKey(importContext.customerName);

  return (
    candidate.declarationHistory.find((source: any) => {
      const metadata = parseSourceMetadata(source.metadata);
      return (
        normalizeImportKey(source.referenceCode) === referenceCode &&
        normalizeImportKey(source.declaredAt) === declaredAt &&
        normalizeImportKey(metadata?.customerName) === customerName
      );
    }) ?? null
  );
}

function getDuplicateKey(row: any) {
  const productKey = row.isNewProduct ? "" : normalizeDuplicateText(row.selectedProductId);
  const nameKey = normalizeDuplicateText(row.rowContext?.name || row.originalName);
  return productKey || nameKey;
}

function applyDuplicateSelection(rows: any[]) {
  const seen = new Set<string>();

  return rows.map((row) => {
    const key = getDuplicateKey(row);

    if (!key) {
      return row;
    }

    if (seen.has(key)) {
      return { ...row, checked: false, autoUncheckedDuplicate: true };
    }

    seen.add(key);
    return { ...row, checked: row.checked ?? true, autoUncheckedDuplicate: false };
  });
}

function parseManualProductLine(line: string) {
  const parts = line.split(MANUAL_INPUT_DELIMITER).map((part) => part.trim());

  if (parts.length === 1) {
    return {
      name: line.trim(),
      quantity: 1,
      dimensions: "",
      description: "",
      unit: 'Cái',
    };
  }

  const [name, unit, unitWeightKg, origin, brand, hsCode, dimensions, description] = parts;

  return {
    name: name || line.trim(),
    contractOrPo: "",
    brand: brand || "",
    origin: origin || "",
    hsCode: hsCode || "",
    dimensions: dimensions || "",
    description: description || "",
    unit: unit || "Cái",
    unitWeightKg: unitWeightKg || "",
    quantity: 1,
    notes: "",
  };
}

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  // Input & Import State
  const [inputText, setInputText] = useState("");
  const [viewMode, setViewMode] = useState<'input' | 'results'>('input');
  const [importContext, setImportContext] = useState<any>(null);
  const [commonContext, setCommonContext] = useState<any>({
    customerName: "", customerAddress: "", taxCode: "", documentNo: "", documentDate: "", paymentTerm: "", deliveryMethod: "", deliveryWindow: ""
  });
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null);

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editAliases, setEditAliases] = useState("");

  // Edit Source Modal
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [editOrigin, setEditOrigin] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editHsCode, setEditHsCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDimensions, setEditDimensions] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editUnitWeightKg, setEditUnitWeightKg] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editTotalWeightKg, setEditTotalWeightKg] = useState("");

  // Restore admin unlock from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem('adminUnlocked') === 'true') {
      setAdminUnlocked(true);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setSelectedSourceIds([]);
  }, [selectedProductId]);

  useEffect(() => {
    if (mappedRows.length === 0) return;

    const nextRows = applyDuplicateSelection(mappedRows);
    const hasChanged = nextRows.some((row, index) =>
      row.checked !== mappedRows[index]?.checked ||
      row.autoUncheckedDuplicate !== mappedRows[index]?.autoUncheckedDuplicate
    );

    if (hasChanged) {
      setMappedRows(nextRows);
    }
  }, [mappedRows]);

  async function loadProducts(q?: string) {
    try {
      const res = await fetch(q ? `/api/products?q=${encodeURIComponent(q)}` : '/api/products');
      const data = await res.json();
      const items = data.items || [];
      setProducts(items);
      if (items.length > 0 && (!selectedProductId || !items.find((i: ProductRecord) => i.id === selectedProductId))) {
        setSelectedProductId(items[0].id);
      } else if (items.length === 0) {
        setSelectedProductId(null);
      }
    } catch (e) {
      console.error(e);
      setError("Không thể tải danh sách sản phẩm");
    }
  }

  async function unlockAdmin() {
    setError("");
    setMessage("");
    setIsAuthenticating(true);

    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const payload = await response.json();

      if (!payload.success) {
        setAdminUnlocked(false);
        setError("Mật khẩu quản trị không đúng.");
      } else {
        setAdminUnlocked(true);
        sessionStorage.setItem('adminUnlocked', 'true');
        setMessage("Đã mở khóa tính năng quản trị.");
      }
    } catch (e) {
      setError("Có lỗi xảy ra khi xác thực.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleFileUpload(type: "packing-list" | "base-catalog", file: File | null) {
    if (!file) return;
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      
      const response = await fetch("/api/imports/analyze", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Import thất bại.");
        return;
      }
      
      setImportContext(payload.importContext);
      
      setCommonContext({
        customerName: payload.importContext.customerName || "", 
        customerAddress: payload.importContext.customerAddress || "", 
        taxCode: payload.importContext.taxCode || "", 
        documentNo: payload.importContext.documentNo || "", 
        documentDate: payload.importContext.documentDate || "", 
        paymentTerm: payload.importContext.paymentTerm || "", 
        deliveryMethod: payload.importContext.deliveryMethod || "", 
        deliveryWindow: payload.importContext.deliveryWindow || ""
      });

      setMappedRows(payload.mappedRows.map((r: any) => {
        // Mặc định chọn nguồn dữ liệu theo loại file nhập vào
        const defaultSourceType = payload.importContext.type === 'packing-list' ? 'customs-declaration' : 'manual';
        return { 
          ...r, 
          checked: true,
          sourceType: defaultSourceType
        };
      }));
      if (payload.mappedRows.length > 0) setResolvingRowId(payload.mappedRows[0].id);
      setViewMode('results');
    } catch (e) {
      setError("Lỗi kết nối khi phân tích file.");
    } finally {
      setIsLoading(false);
      // Reset input file
      const input1 = document.getElementById('packing-upload') as HTMLInputElement;
      if (input1) input1.value = '';
      const input2 = document.getElementById('base-upload') as HTMLInputElement;
      if (input2) input2.value = '';
    }
  }

  async function handleSaveManual() {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError("");
    setMessage("");

    const lines = inputText.split('\n').filter(l => l.trim().length > 0);
    const parsedProducts = lines.map(l => {
      // Basic split logic if they provided some quantity, unit.
      // Usually they just paste names: "Bulong M8 20"
      return {
        name: l.trim(),
        quantity: 1,
        unit: 'Cái',
      }
    });

    try {
      const response = await fetch("/api/imports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedProducts })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Phân tích thất bại.");
        return;
      }

      setImportContext(payload.importContext);
      
      setCommonContext({
        customerName: "", customerAddress: "", taxCode: "", documentNo: "", documentDate: "", paymentTerm: "", deliveryMethod: "", deliveryWindow: ""
      });

      setMappedRows(payload.mappedRows.map((r: any) => ({ 
        ...r, 
        checked: true,
        sourceType: 'manual' 
      })));
      
      if (payload.mappedRows.length > 0) setResolvingRowId(payload.mappedRows[0].id);
      setViewMode('results');
    } catch (e) {
      setError("Lỗi khi gọi API phân tích hàng hóa.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveManualStructured() {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError("");
    setMessage("");

    const lines = inputText.split('\n').filter((line) => line.trim().length > 0);
    const parsedProducts = lines.map((line) => parseManualProductLine(line));

    try {
      const response = await fetch("/api/imports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedProducts })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Phân tích thất bại.");
        return;
      }

      setImportContext(payload.importContext);

      setCommonContext({
        customerName: "",
        customerAddress: "",
        taxCode: "",
        documentNo: "",
        documentDate: "",
        paymentTerm: "",
        deliveryMethod: "",
        deliveryWindow: ""
      });

      setMappedRows(payload.mappedRows.map((r: any) => ({
        ...r,
        checked: true,
        sourceType: 'manual'
      })));

      if (payload.mappedRows.length > 0) setResolvingRowId(payload.mappedRows[0].id);
      setViewMode('results');
    } catch (e) {
      setError("Lỗi khi gọi API phân tích hàng hóa.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmImport() {
    setIsLoading(true);
    setError("");
    try {
      if (isMissingPackingListRequiredFields) {
        setError("Packing List bắt buộc phải có Khách hàng và Số PK trước khi lưu.");
        setIsLoading(false);
        return;
      }
      const checkedRows = mappedRows.filter(row => row.checked);
      if (checkedRows.length === 0) {
        setError("Vui lòng tích chọn ít nhất một sản phẩm để lưu.");
        setIsLoading(false);
        return;
      }
      const rowsPayload = checkedRows.map(row => {
        return {
          action: row.isNewProduct ? "create" : "update",
          productId: row.selectedProductId,
          name: row.rowContext.name,
          contractOrPo: row.rowContext.contractOrPo,
          origin: row.rowContext.origin,
          brand: row.rowContext.brand,
          hsCode: row.rowContext.hsCode,
          description: row.rowContext.description,
          dimensions: row.rowContext.dimensions,
          unitWeightKg: row.rowContext.unitWeightKg,
          quantity: row.rowContext.quantity,
          totalWeightKg: row.rowContext.totalWeightKg,
          unit: row.rowContext.unit,
          notes: row.rowContext.notes,
          sourceType: row.sourceType // send sourceType
        }
      });
      const response = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importContext, commonContext, rows: rowsPayload })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Lỗi lưu dữ liệu");
        return;
      }
      setMessage(`Đã lưu thành công ${payload.count} dòng dữ liệu.`);
      setViewMode('input');
      setMappedRows([]);
      setInputText("");
      await loadProducts();
    } catch(e) {
      setError("Lỗi kết nối.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này và TOÀN BỘ nguồn dữ liệu liên quan?")) return;
    
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Xóa thất bại.");
        return;
      }
      setMessage("Đã xóa sản phẩm.");
      await loadProducts();
    } catch (e) {
      setError("Lỗi gọi API xóa.");
    }
  }

  async function handleDeleteSelectedProducts() {
    if (selectedProductIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedProductIds.length} hàng hóa đã chọn cùng toàn bộ nguồn dữ liệu liên quan?`)) return;

    try {
      const results = await Promise.all(
        selectedProductIds.map((id) => fetch(`/api/products/${id}`, { method: "DELETE" }))
      );

      if (results.some((response) => !response.ok)) {
        setError("Xóa hàng loạt hàng hóa thất bại.");
        return;
      }

      setMessage(`Đã xóa ${selectedProductIds.length} hàng hóa.`);
      setSelectedProductIds([]);
      await loadProducts(searchQuery);
    } catch (e) {
      setError("Lỗi gọi API xóa hàng loạt hàng hóa.");
    }
  }

  async function handleUpdate() {
    if (!editingProduct) return;
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, aliases: editAliases })
      });
      if (!response.ok) {
        setError("Cập nhật thất bại.");
        return;
      }
      setMessage("Đã cập nhật sản phẩm.");
      setEditingProduct(null);
      await loadProducts(searchQuery);
    } catch (e) {
      setError("Lỗi API cập nhật.");
    }
  }

  async function handleUpdateSource() {
    if (!editingSource) return;
    try {
      const response = await fetch(`/api/product-sources/${editingSource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: editOrigin,
          brand: editBrand,
          hsCode: editHsCode,
          description: editDescription,
          dimensions: editDimensions,
          unit: editUnit,
          unitWeightKg: editUnitWeightKg,
          quantity: editQuantity,
          totalWeightKg: editTotalWeightKg
        })
      });
      if (!response.ok) {
        setError("Cập nhật nguồn thất bại.");
        return;
      }
      setMessage("Đã cập nhật nguồn dữ liệu.");
      setEditingSource(null);
      await loadProducts(searchQuery);
    } catch (e) {
      setError("Lỗi API cập nhật nguồn.");
    }
  }

  async function handleDeleteSource(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa nguồn dữ liệu này?")) return;

    try {
      const response = await fetch(`/api/product-sources/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Xóa nguồn dữ liệu thất bại.");
        return;
      }
      setMessage("Đã xóa nguồn dữ liệu.");
      setEditingSource(null);
      await loadProducts(searchQuery);
    } catch (e) {
      setError("Lỗi gọi API xóa nguồn dữ liệu.");
    }
  }

  async function handleDeleteSelectedSources() {
    if (selectedSourceIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedSourceIds.length} nguồn dữ liệu đã chọn?`)) return;

    try {
      const results = await Promise.all(
        selectedSourceIds.map((id) => fetch(`/api/product-sources/${id}`, { method: "DELETE" }))
      );

      if (results.some((response) => !response.ok)) {
        setError("Xóa hàng loạt nguồn dữ liệu thất bại.");
        return;
      }

      setMessage(`Đã xóa ${selectedSourceIds.length} nguồn dữ liệu.`);
      setSelectedSourceIds([]);
      await loadProducts(searchQuery);
    } catch (e) {
      setError("Lỗi gọi API xóa hàng loạt nguồn dữ liệu.");
    }
  }
  const duplicateBuckets = mappedRows.reduce((acc, row) => {
    const key = getDuplicateKey(row);

    if (!key) {
      return acc;
    }

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(row.id);
    return acc;
  }, {} as Record<string, string[]>);

  const duplicateRowIds = new Set(
    (Object.values(duplicateBuckets) as string[][])
      .filter((ids) => ids.length > 1)
      .flatMap((ids) => ids.slice(1))
  );

  const duplicateCount = duplicateRowIds.size;
  const isPackingListImport = importContext?.type === "packing-list";
  const isMissingPackingListRequiredFields =
    isPackingListImport &&
    (!String(commonContext?.customerName || "").trim() ||
      !String(commonContext?.documentNo || "").trim());

  function dismissDuplicateRows() {
    setMappedRows((prev) =>
      prev.map((row) => (duplicateRowIds.has(row.id) ? { ...row, checked: false } : row))
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-icon">
          <Database size={20} />
        </div>
        <div className="page-header-text">
          <h2>Quản Trị Dữ Liệu</h2>
          <p>Khu vực thêm, sửa, xóa hàng hóa và các nguồn dữ liệu gốc.</p>
        </div>
      </div>

      {message && <div className="badge badge-success mb-4 flex gap-2" style={{ width: 'fit-content', padding: '8px 12px' }}><CheckCircle2 size={16} /> {message}</div>}
      {error && <div className="badge badge-warn mb-4 flex gap-2" style={{ width: 'fit-content', padding: '8px 12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}><AlertCircle size={16} /> {error}</div>}

      {viewMode === 'input' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px', alignItems: 'stretch' }}>
            
            {/* KHU VỰC THÊM HÀNG HÓA */}
        <div style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="search-input-container" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="magic-badge">
              <Zap size={14} /> Nhập thông tin hàng hóa cần thêm
            </div>
            <textarea 
              className="search-input-textarea"
              style={{ flex: 1 }}
              placeholder="Nhập hoặc dán danh sách hàng hóa vào đây...&#10;&#10;Mỗi sản phẩm trên 1 dòng.&#10;Format: Tên hàng || Đơn vị tính || Trọng lượng/Đơn vị || Xuất xứ || Maker/Brand || HS Code&#10;Ví dụ:&#10;Bulong M8 20mm || Cái || 0.05 || VN || Mecsu || 73181510"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || !adminUnlocked}
            />
            <div className="search-input-footer">
              <div className="flex items-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="file" 
                  accept=".xls,.xlsx"
                  id="base-upload"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload("base-catalog", e.target.files?.[0] || null)}
                />
                <button 
                  className="attachment-btn"
                  onClick={() => document.getElementById('base-upload')?.click()}
                  disabled={isLoading || !adminUnlocked}
                >
                  <Database size={16} className="icon" style={{ color: '#0284c7' }} /> 
                  Nhập danh sách từ file excel
                </button>

                <a
                  className="attachment-btn"
                  href="/api/imports/base-catalog/template"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={16} className="icon" style={{ color: '#0284c7' }} />
                  Tải mẫu file import
                </a>

                <input 
                  type="file" 
                  accept=".xls,.xlsx"
                  id="packing-upload"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload("packing-list", e.target.files?.[0] || null)}
                />
                <button 
                  className="attachment-btn"
                  onClick={() => document.getElementById('packing-upload')?.click()}
                  disabled={isLoading || !adminUnlocked}
                >
                  <FileSpreadsheet size={16} className="icon" style={{ color: '#16a34a' }} /> 
                  Nhập từ file packing list
                </button>
              </div>
              <button className="analyze-btn" onClick={handleSaveManualStructured} disabled={!inputText.trim() || isLoading || !adminUnlocked}>
                <Plus size={16} /> Lưu hàng hóa
              </button>
            </div>
          </div>
        </div>

        {/* MỞ KHÓA QUẢN TRỊ */}
        <div style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="search-input-container" style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="magic-badge" style={adminUnlocked ? { backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' } : {}}>
              {adminUnlocked ? <Unlock size={14} /> : <Key size={14} />} {adminUnlocked ? "Đã Mở Khóa" : "Mở Khóa Quản Trị"}
            </div>
            
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="flex-col items-center gap-2 text-center" style={{ marginBottom: '24px' }}>
                <div className="page-header-icon" style={{ margin: '0 auto', backgroundColor: adminUnlocked ? '#dcfce7' : '#f8fafc', color: adminUnlocked ? '#166534' : 'var(--primary)' }}>
                  {adminUnlocked ? <Shield size={24} /> : <Lock size={24} />}
                </div>
                <p className="hint text-center" style={{ margin: '12px 0 0 0', fontSize: '0.85rem' }}>
                  {adminUnlocked ? "Bạn có thể thêm, sửa, xóa dữ liệu." : "Nhập mật khẩu admin để thêm, sửa, xóa dữ liệu."}
                </p>
              </div>

              {!adminUnlocked ? (
                <form onSubmit={e => { e.preventDefault(); unlockAdmin(); }} className="form-group gap-4" style={{ margin: 0 }}>
                  <div className="form-group">
                    <input
                      type="password"
                      className="form-input text-center"
                      placeholder="Nhập mật khẩu (******)"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={isAuthenticating}>
                    {isAuthenticating ? "Đang xác thực..." : "MỞ KHÓA"}
                  </button>
                </form>
              ) : (
                <button 
                  className="btn btn-outline w-full" 
                  onClick={() => {
                    setAdminUnlocked(false);
                    setAdminPassword("");
                    sessionStorage.removeItem('adminUnlocked');
                    setMessage("Đã khóa tính năng quản trị.");
                  }}
                >
                  KHÓA LẠI
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

        {/* DANH SÁCH HÀNG HÓA */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="card-title flex items-center gap-2">
              <Database size={16} /> Danh sách hàng hóa
            </h3>
	            <div className="flex items-center gap-2">
	              <button className="btn btn-outline" disabled={products.length === 0} onClick={() => setSelectedProductIds(products.map((p) => p.id))}>
	                Chọn tất cả
	              </button>
	              <button className="btn btn-outline" disabled={selectedProductIds.length === 0} onClick={() => setSelectedProductIds([])}>
	                Bỏ chọn
	              </button>
	              <button
	                className="btn btn-outline"
	                style={{ borderColor: selectedProductIds.length > 0 ? '#ef4444' : 'var(--line)', color: selectedProductIds.length > 0 ? '#b91c1c' : 'var(--muted)' }}
	                disabled={!adminUnlocked || selectedProductIds.length === 0}
	                onClick={handleDeleteSelectedProducts}
	              >
	                <Trash2 size={14} /> Xóa ({selectedProductIds.length})
	              </button>
	              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Tìm kiếm nhanh..." 
                  style={{ paddingLeft: '32px', width: '250px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadProducts(searchQuery)}
                />
              </div>
              <button className="btn btn-outline" onClick={() => loadProducts(searchQuery)}>Lọc</button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'flex', minHeight: '600px', maxHeight: '700px' }}>
              {/* LEFT PANE - PRODUCT LIST */}
              <div style={{ width: '35%', borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--line)', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', color: 'var(--muted)', position: 'sticky', top: 0, zIndex: 5 }}>
                  DANH MỤC HÀNG HÓA ({products.length})
                </div>
                {products.length === 0 ? (
                  <div className="text-center" style={{ padding: '24px', color: 'var(--muted)' }}>Không có dữ liệu hàng hóa.</div>
                ) : (
	                  <div style={{ display: 'flex', flexDirection: 'column' }}>
	                    {products.map((p, idx) => {
	                      const isSelected = selectedProductId === p.id;
	                      const isChecked = selectedProductIds.includes(p.id);
	                      const sourceCount = (p.baseInfo ? 1 : 0) + (p.declarationHistory ? p.declarationHistory.length : 0);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => setSelectedProductId(p.id)}
                          style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--line)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                            borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                            transition: 'all 0.2s'
                          }}
                        >
	                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
	                            <input
	                              type="checkbox"
	                              checked={isChecked}
	                              onChange={(e) => {
	                                e.stopPropagation();
	                                setSelectedProductIds((prev) =>
	                                  prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
	                                );
	                              }}
	                              style={{ marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
	                            />
	                            <div style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--primary)' : 'inherit', flex: 1 }}>
	                              {idx + 1}. {p.name}
	                            </div>
                            <div className="badge" style={{ backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1e40af' : '#64748b', flexShrink: 0 }}>
                              {sourceCount} nguồn
                            </div>
                          </div>
                          {p.aliases && p.aliases.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '8px' }}>
                              Alias: {p.aliases.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* RIGHT PANE - SOURCES & DETAILS */}
	              <div style={{ width: '65%', overflowY: 'auto', backgroundColor: '#fafafa', position: 'relative' }}>
	                {products.find(p => p.id === selectedProductId) ? (() => {
	                  const selectedProduct = products.find(p => p.id === selectedProductId)!;
	                  const availableSourceIds = [
	                    ...(selectedProduct.baseInfo ? [selectedProduct.baseInfo.id] : []),
	                    ...(selectedProduct.declarationHistory?.map((src: any) => src.id) || [])
	                  ].filter(Boolean);
	                  return (
                  <>
                    <div style={{ padding: '20px 24px', backgroundColor: 'white', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--foreground)' }}>{selectedProduct.name}</h2>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedProduct.baseInfo && <span className="badge badge-primary">Thông tin cơ sở</span>}
                          {selectedProduct.declarationHistory && selectedProduct.declarationHistory.length > 0 && (
                            <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{selectedProduct.declarationHistory.length} Packing List</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', borderColor: adminUnlocked ? '#3b82f6' : 'var(--line)', color: adminUnlocked ? '#3b82f6' : 'var(--muted)' }}
                          disabled={!adminUnlocked}
                          onClick={() => {
                            setEditingProduct(selectedProduct);
                            setEditName(selectedProduct.name);
                            setEditAliases(selectedProduct.aliases ? selectedProduct.aliases.join(', ') : "");
                          }}
                        >
                          <Edit2 size={16} /> Sửa
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', borderColor: adminUnlocked ? '#ef4444' : 'var(--line)', color: adminUnlocked ? '#ef4444' : 'var(--muted)' }}
                          disabled={!adminUnlocked}
                          onClick={() => handleDelete(selectedProduct.id)}
                        >
                          <Trash2 size={16} /> Xóa
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ padding: '24px' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Chi tiết Nguồn dữ liệu
                      </h4>
                      
	                      <div className="flex items-center gap-2" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
	                        <button className="btn btn-outline" disabled={availableSourceIds.length === 0} onClick={() => setSelectedSourceIds(availableSourceIds)}>
	                          Chọn tất cả nguồn
	                        </button>
	                        <button className="btn btn-outline" disabled={selectedSourceIds.length === 0} onClick={() => setSelectedSourceIds([])}>
	                          Bỏ chọn nguồn
	                        </button>
	                        <button
	                          className="btn btn-outline"
	                          style={{ borderColor: selectedSourceIds.length > 0 ? '#ef4444' : 'var(--line)', color: selectedSourceIds.length > 0 ? '#b91c1c' : 'var(--muted)' }}
	                          disabled={!adminUnlocked || selectedSourceIds.length === 0}
	                          onClick={handleDeleteSelectedSources}
	                        >
	                          <Trash2 size={14} /> Xóa nguồn ({selectedSourceIds.length})
	                        </button>
	                      </div>
	                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {selectedProduct.baseInfo && (
                          <div className="card" style={{ border: '1px solid #c7d2fe', boxShadow: 'none', margin: 0 }}>
	                            <div className="card-header flex justify-between items-center" style={{ backgroundColor: '#e0e7ff', padding: '12px 16px 12px 44px', position: 'relative' }}>
	                              <input
	                                type="checkbox"
	                                checked={selectedSourceIds.includes(selectedProduct.baseInfo.id)}
	                                onChange={() =>
	                                  setSelectedSourceIds((prev) =>
	                                    prev.includes(selectedProduct.baseInfo!.id)
	                                      ? prev.filter((id) => id !== selectedProduct.baseInfo!.id)
	                                      : [...prev, selectedProduct.baseInfo!.id]
	                                  )
	                                }
	                                style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px', position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
	                              />
	                              <h3 className="card-title" style={{ fontSize: '0.9rem', color: '#3730a3', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={16} /> Cơ sở (Manual/Base)
                              </h3>
                              {adminUnlocked && (
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '4px 8px', height: 'auto', color: '#3730a3' }}
                                  onClick={() => {
                                    setEditingSource(selectedProduct.baseInfo);
                                    setEditOrigin(selectedProduct.baseInfo!.origin || "");
                                    setEditBrand(selectedProduct.baseInfo!.brand || "");
                                    setEditHsCode(selectedProduct.baseInfo!.hsCode || "");
                                    setEditDescription(selectedProduct.baseInfo!.description || "");
                                    setEditDimensions(selectedProduct.baseInfo!.dimensions || "");
                                    setEditUnit(selectedProduct.baseInfo!.unit || "");
                                    setEditUnitWeightKg(selectedProduct.baseInfo!.unitWeightKg?.toString() || "");
                                    setEditQuantity(selectedProduct.baseInfo!.quantity?.toString() || "");
                                    setEditTotalWeightKg(selectedProduct.baseInfo!.totalWeightKg?.toString() || "");
                                  }}
                                >
                                  <Edit2 size={14} /> Sửa
                                </button>
                              )}
                            </div>
                            <div className="card-body" style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--muted)' }}>Xuất xứ:</span> <strong>{selectedProduct.baseInfo.origin || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Thương hiệu:</span> <strong>{selectedProduct.baseInfo.brand || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>HS Code:</span> <strong>{selectedProduct.baseInfo.hsCode || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Mô tả:</span> <strong>{selectedProduct.baseInfo.description || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Kích thước:</span> <strong>{selectedProduct.baseInfo.dimensions || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Trọng lượng:</span> <strong>{selectedProduct.baseInfo.unitWeightKg || '-'} kg/{selectedProduct.baseInfo.unit || 'đv'}</strong></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {selectedProduct.declarationHistory?.map((src: any, i: number) => (
                          <div key={src.id || i} className="card" style={{ border: '1px solid #bbf7d0', boxShadow: 'none', margin: 0 }}>
	                            <div className="card-header flex justify-between items-center" style={{ backgroundColor: '#dcfce7', padding: '12px 16px 12px 44px', position: 'relative' }}>
	                              <input
	                                type="checkbox"
	                                checked={selectedSourceIds.includes(src.id)}
	                                onChange={() =>
	                                  setSelectedSourceIds((prev) =>
	                                    prev.includes(src.id) ? prev.filter((id) => id !== src.id) : [...prev, src.id]
	                                  )
	                                }
	                                style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px', position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
	                              />
	                              <h3 className="card-title" style={{ fontSize: '0.9rem', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileSpreadsheet size={16} /> {getSourceCustomerName(src) || 'Khách hàng chưa có'} • Số PK: {src.referenceCode || '-'}
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginLeft: '8px', backgroundColor: 'rgba(255,255,255,0.75)', padding: '3px 10px', borderRadius: '999px' }}>
                                  {src.declaredAt ? new Date(src.declaredAt).toLocaleDateString('vi-VN') : ''}
                                </span>
                              </h3>
                              {adminUnlocked && (
                                <div className="flex gap-2">
                                  <button 
                                    className="btn btn-ghost" 
                                    style={{ padding: '4px 8px', height: 'auto', color: '#166534' }}
                                    onClick={() => {
                                      setEditingSource(src);
                                      setEditOrigin(src.origin || "");
                                      setEditBrand(src.brand || "");
                                      setEditHsCode(src.hsCode || "");
                                      setEditDescription(src.description || "");
                                      setEditDimensions(src.dimensions || "");
                                      setEditUnit(src.unit || "");
                                      setEditUnitWeightKg(src.unitWeightKg?.toString() || "");
                                      setEditQuantity(src.quantity?.toString() || "");
                                      setEditTotalWeightKg(src.totalWeightKg?.toString() || "");
                                    }}
                                  >
                                    <Edit2 size={14} /> Sửa
                                  </button>
                                  <button 
                                    className="btn btn-ghost" 
                                    style={{ padding: '4px 8px', height: 'auto', color: '#b91c1c' }}
                                    onClick={() => handleDeleteSource(src.id)}
                                  >
                                    <Trash2 size={14} /> Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="card-body" style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--muted)' }}>Xuất xứ:</span> <strong>{src.origin || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Thương hiệu:</span> <strong>{src.brand || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>HS Code:</span> <strong>{src.hsCode || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Mô tả:</span> <strong>{src.description || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Kích thước:</span> <strong>{src.dimensions || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Trọng lượng:</span> <strong>{src.unitWeightKg || '-'} kg/{src.unit || 'đv'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Số lượng:</span> <strong>{src.quantity || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Tổng N.W:</span> <strong>{src.totalWeightKg || '-'} kg</strong></div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!selectedProduct.baseInfo && (!selectedProduct.declarationHistory || selectedProduct.declarationHistory.length === 0)) && (
                          <div className="text-center" style={{ padding: '40px', color: 'var(--muted)', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                            Chưa có dữ liệu nguồn cho sản phẩm này.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );})() : (
                  <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--muted)' }}>
                    <div className="text-center">
                      <Database size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                      <p>Chọn một sản phẩm bên trái để xem chi tiết.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* GLOBAL FORM cho Packing List */}
          {importContext?.type === 'packing-list' && (
            <div className="card">
              <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', backgroundColor: '#f8fafc' }}>
                <h3 className="card-title" style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Thông Tin Chung (Packing List)</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>Các thông tin này sẽ được áp dụng cho toàn bộ mặt hàng trong danh sách bên dưới khi lưu.</p>
              </div>
	              <div className="card-body" style={{ padding: '20px' }}>
	                {isMissingPackingListRequiredFields && (
	                  <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#9a3412', fontSize: '0.9rem' }}>
	                    Cần nhập đủ <strong>Khách hàng</strong> và <strong>Số PK</strong> thì mới lưu được dữ liệu Packing List.
	                  </div>
	                )}
	                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Khách hàng</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.customerName} onChange={e => setCommonContext({ ...commonContext, customerName: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Địa chỉ</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.customerAddress} onChange={e => setCommonContext({ ...commonContext, customerAddress: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>MST</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.taxCode} onChange={e => setCommonContext({ ...commonContext, taxCode: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Số (Reference)</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.documentNo} onChange={e => setCommonContext({ ...commonContext, documentNo: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Ngày</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.documentDate} onChange={e => setCommonContext({ ...commonContext, documentDate: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Thanh toán</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.paymentTerm} onChange={e => setCommonContext({ ...commonContext, paymentTerm: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Phương thức</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.deliveryMethod} onChange={e => setCommonContext({ ...commonContext, deliveryMethod: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Thời hạn giao</label>
                    <input className="form-input" style={{ fontSize: '0.9rem' }} value={commonContext.deliveryWindow} onChange={e => setCommonContext({ ...commonContext, deliveryWindow: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}

        <div className="card">
          {/* HEADER BAR */}
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="card-title flex items-center gap-2" style={{ margin: 0 }}>
              <CheckCircle2 size={16} /> Xác nhận nhập dữ liệu
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '8px' }}>
                ({mappedRows.filter(r => r.checked).length}/{mappedRows.length} đã chọn)
              </span>
            </h3>
            <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={() => setMappedRows(prev => prev.map(r => ({ ...r, checked: true })))}
              >
                Chọn tất cả
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setMappedRows(prev => prev.map(r => ({ ...r, checked: false })))}
              >
                Bỏ chọn tất cả
              </button>
              <button
                className="btn btn-outline"
                onClick={dismissDuplicateRows}
                disabled={duplicateCount === 0}
              >
                Bỏ chọn dòng trùng ({duplicateCount})
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => { setViewMode('input'); setMappedRows([]); setInputText(""); }}
                disabled={isLoading}
              >
                <X size={14} /> Hủy bỏ
              </button>
              <button 
                className="btn btn-primary flex items-center gap-2" 
                onClick={handleConfirmImport} 
                disabled={isLoading || mappedRows.filter(r => r.checked).length === 0 || isMissingPackingListRequiredFields}
              >
                <Save size={16} /> Lưu ({mappedRows.filter(r => r.checked).length} dòng)
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'flex', minHeight: '600px', maxHeight: '700px' }}>
              {/* LEFT PANE - IMPORT ROWS */}
              <div style={{ width: '40%', borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted)', position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>DANH SÁCH ({mappedRows.length})</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 400 }}>
                    <span style={{ color: '#166534' }}>● {mappedRows.filter(r => !r.isNewProduct).length} trùng</span>
                    {' · '}
                    <span style={{ color: '#ca8a04' }}>● {mappedRows.filter(r => r.isNewProduct).length} mới</span>
                    {' · '}
                    <span style={{ color: '#b45309' }}>● {duplicateCount} dòng lặp</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {mappedRows.map((row) => {
                    const isActive = resolvingRowId === row.id;
                    const isDuplicate = duplicateRowIds.has(row.id);
                    const selectedCandidate = row.candidates.find((c: any) => c.id === row.selectedProductId);
                    const matchedDeclarationSource = row.sourceType === 'customs-declaration'
                      ? findMatchingDeclarationSource(selectedCandidate, importContext)
                      : null;
                    return (
                      <div 
                        key={row.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--line)',
                          cursor: 'pointer',
                          backgroundColor: isActive ? '#eff6ff' : row.checked ? 'white' : '#fafafa',
                          borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                          opacity: row.checked ? 1 : 0.5,
                          transition: 'all 0.15s'
                        }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setMappedRows(prev => prev.map(r => r.id === row.id ? { ...r, checked: !r.checked } : r));
                          }}
                          style={{ marginTop: '3px', accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                        />
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setResolvingRowId(row.id)}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ minWidth: 0, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--primary)' : 'inherit', fontSize: '1rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                              {row.index}. {row.originalName}
                            </div>
                            {row.isNewProduct ? (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fef08a', color: '#854d0e', flexShrink: 0, fontWeight: 600 }}>Mới</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534', flexShrink: 0, fontWeight: 600 }}>Khớp</span>
                            )}
                            {isDuplicate && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#ffedd5', color: '#9a3412', flexShrink: 0, fontWeight: 600 }}>Dòng trùng</span>
                            )}
                            {row.autoUncheckedDuplicate && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', flexShrink: 0, fontWeight: 600 }}>Tự bỏ tích</span>
                            )}
                            {matchedDeclarationSource && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', flexShrink: 0, fontWeight: 600 }}>Trùng Packing List</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                            → {row.isNewProduct ? 'Tạo sản phẩm mới' : (row.candidates.find((c:any) => c.id === row.selectedProductId)?.name || 'Chưa rõ')}
                          </div>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMappedRows(prev => {
                              const next = prev.filter(r => r.id !== row.id);
                              if (resolvingRowId === row.id) {
                                setResolvingRowId(next.length > 0 ? next[0].id : null);
                              }
                              return next;
                            });
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', opacity: 0.4, padding: '2px', flexShrink: 0, marginTop: '2px', transition: 'opacity 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
                          title="Xóa khỏi danh sách"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {mappedRows.length === 0 && (
                    <div className="text-center" style={{ padding: '40px', color: 'var(--muted)' }}>
                      Không còn sản phẩm nào trong danh sách.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE - EDIT MAPPED ROW */}
              <div style={{ width: '60%', overflowY: 'auto', backgroundColor: '#fafafa', position: 'relative' }}>
                {mappedRows.find(r => r.id === resolvingRowId) ? (() => {
                  const r = mappedRows.find(r => r.id === resolvingRowId)!;
                  const selectedCandidate = r.candidates.find((c: any) => c.id === r.selectedProductId);
                  const matchedDeclarationSource = r.sourceType === 'customs-declaration'
                    ? findMatchingDeclarationSource(selectedCandidate, importContext)
                    : null;
                  const existingBaseInfo = matchedDeclarationSource || selectedCandidate?.baseInfo;
                  const editableFields = [
                    { key: "name", label: "Tên sản phẩm", oldValue: selectedCandidate?.name, newValue: r.rowContext.name, type: "text" },
                    { key: "contractOrPo", label: "Contract/PO", oldValue: selectedCandidate?.contractOrPo, newValue: r.rowContext.contractOrPo, type: "text" },
                    { key: "brand", label: "Maker/Brand", oldValue: existingBaseInfo?.brand, newValue: r.rowContext.brand, type: "text" },
                    { key: "origin", label: "Xuất xứ", oldValue: existingBaseInfo?.origin, newValue: r.rowContext.origin, type: "text" },
                    { key: "hsCode", label: "HS Code", oldValue: existingBaseInfo?.hsCode, newValue: r.rowContext.hsCode, type: "text" },
                    { key: "description", label: "Mô tả", oldValue: existingBaseInfo?.description, newValue: r.rowContext.description, type: "text" },
                    { key: "dimensions", label: "Kích thước", oldValue: existingBaseInfo?.dimensions, newValue: r.rowContext.dimensions, type: "text" },
                    { key: "unit", label: "Đơn vị tính", oldValue: existingBaseInfo?.unit, newValue: r.rowContext.unit, type: "text" },
                    { key: "unitWeightKg", label: "N.W/ĐV (KG)", oldValue: existingBaseInfo?.unitWeightKg, newValue: r.rowContext.unitWeightKg, type: "number", step: "0.01" },
                    { key: "quantity", label: "Số lượng", oldValue: existingBaseInfo?.quantity, newValue: r.rowContext.quantity, type: "number", step: "1" },
                    { key: "notes", label: "Ghi chú", oldValue: existingBaseInfo?.notes, newValue: r.rowContext.notes, type: "text" },
                  ];
                  const hasExistingColumn = !r.isNewProduct;

                  return (
                    <>
                      {/* Sticky header with product matching */}
                      <div style={{ padding: '20px 24px', backgroundColor: 'white', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--foreground)', flex: 1, minWidth: 0, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            #{r.index} {r.originalName}
                          </h2>
                          {r.isNewProduct ? (
                            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', backgroundColor: '#fef08a', color: '#854d0e', fontWeight: 600 }}>Sản phẩm mới</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 600 }}>Đã khớp</span>
                          )}
                        </div>
                        
                        <div className="form-group" style={{ margin: '0 0 16px 0' }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Ghép nối với sản phẩm</label>
                          <select 
                            className="form-input"
                            value={r.isNewProduct ? "NEW" : (r.selectedProductId || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMappedRows(prev => prev.map(x => {
                                if (x.id !== r.id) return x;
                                if (val === "NEW") return { ...x, isNewProduct: true, selectedProductId: null };
                                if (val === "") return { ...x, isNewProduct: false, selectedProductId: null };
                                return { ...x, isNewProduct: false, selectedProductId: val };
                              }));
                            }}
                            style={{ fontSize: '1rem' }}
                          >
                            <option value="NEW">✨ Tạo sản phẩm mới</option>
                            {r.candidates.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name} (Khớp {c.matchScore}%)</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>Nguồn dữ liệu</label>
                          <select 
                            className="form-input"
                            value={r.sourceType || 'manual'}
                            onChange={(e) => {
                              setMappedRows(prev => prev.map(x => x.id === r.id ? { ...x, sourceType: e.target.value } : x));
                            }}
                            style={{ fontSize: '1rem' }}
                          >
                            <option value="manual">Cơ sở (Thủ công / Excel)</option>
                            <option value="customs-declaration">Packing List</option>
                          </select>
                        </div>
                      </div>

                      {/* Editable fields */}
                      <div style={{ padding: '20px 24px' }}>
                        <h4 style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Edit2 size={12} /> Bảng thông tin nguồn cơ sở
                        </h4>

                        <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          {hasExistingColumn && (
                            <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
                              Đang ghép với: <strong style={{ color: 'var(--foreground)' }}>{selectedCandidate?.name || 'Chưa chọn sản phẩm'}</strong>
                            </div>
                          )}

                          {matchedDeclarationSource && (
                            <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.9rem' }}>
                              Hàng hóa này đã có dữ liệu từ cùng Packing List. Khi lưu, hệ thống sẽ cập nhật nguồn Packing List hiện có thay vì thêm mới.
                            </div>
                          )}

                          {hasExistingColumn && !existingBaseInfo && (
                            <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#9a3412', fontSize: '0.9rem' }}>
                              Sản phẩm này chưa có nguồn thông tin cơ sở cũ. Khi lưu, dữ liệu import sẽ trở thành nguồn thông tin cơ sở đầu tiên.
                            </div>
                          )}

                          <div style={{ overflowX: 'auto' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: hasExistingColumn ? 'minmax(140px, 180px) minmax(220px, 1fr) minmax(260px, 1fr)' : 'minmax(140px, 180px) minmax(280px, 1fr)',
                                gap: '1px',
                                backgroundColor: '#e2e8f0',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                minWidth: hasExistingColumn ? '720px' : '480px'
                              }}
                            >
                              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>Trường dữ liệu</div>
                              {hasExistingColumn && (
                                <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>Dữ liệu hiện có</div>
                              )}
                              <div style={{ padding: '10px 12px', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>
                                {hasExistingColumn ? 'Dữ liệu mới import / chỉnh sửa' : 'Dữ liệu import / chỉnh sửa'}
                              </div>

                              {editableFields.map((field) => {
                                const changed = hasExistingColumn && isDifferentValue(field.oldValue, field.newValue);
                                return (
                                  <div key={field.key} style={{ display: 'contents' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'white', fontSize: '0.9rem', fontWeight: 500 }}>
                                      {field.label}
                                    </div>
                                    {hasExistingColumn && (
                                      <div style={{ padding: '12px', backgroundColor: 'white', fontSize: '0.9rem', color: changed ? '#92400e' : 'inherit' }}>
                                        {formatCompareValue(field.oldValue)}
                                      </div>
                                    )}
                                    <div style={{ padding: '8px', backgroundColor: changed ? '#fffbeb' : 'white' }}>
                                      <input
                                        type={field.type}
                                        step={field.type === 'number' ? field.step : undefined}
                                        className="form-input"
                                        style={{ fontSize: '0.95rem', backgroundColor: 'white' }}
                                        value={field.newValue || ''}
                                        onChange={(e) =>
                                          setMappedRows(prev =>
                                            prev.map(x =>
                                              x.id === r.id
                                                ? { ...x, rowContext: { ...x.rowContext, [field.key]: e.target.value } }
                                                : x
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="flex items-center justify-center" style={{ height: '100%', color: 'var(--muted)' }}>
                    <div className="text-center">
                      <List size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                      <p>Chọn một dòng dữ liệu bên trái để đối chiếu và chỉnh sửa.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '500px', backgroundColor: 'white' }}>
            <div className="card-header flex justify-between items-center">
              <h3 className="card-title flex items-center gap-2"><Edit2 size={16} /> Sửa Hàng Hóa</h3>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setEditingProduct(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Tên hàng hóa chính</label>
                <input 
                  className="form-input" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                />
              </div>
              <div className="form-group mt-4">
                <label className="form-label">Tên thay thế (Aliases)</label>
                <p className="hint mb-2" style={{ fontSize: '0.8rem' }}>Phân cách bằng dấu phẩy (,)</p>
                <textarea 
                  className="form-input" 
                  rows={3}
                  value={editAliases} 
                  onChange={e => setEditAliases(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-outline" onClick={() => setEditingProduct(null)}>Hủy</button>
                <button className="btn btn-primary" onClick={handleUpdate}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SOURCE MODAL */}
      {editingSource && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '600px', backgroundColor: 'white' }}>
            <div className="card-header flex justify-between items-center">
              <h3 className="card-title flex items-center gap-2"><Edit2 size={16} /> Sửa Nguồn Dữ Liệu</h3>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setEditingSource(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Xuất xứ</label>
                  <input className="form-input" value={editOrigin} onChange={e => setEditOrigin(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maker/Brand</label>
                  <input className="form-input" value={editBrand} onChange={e => setEditBrand(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">HS Code</label>
                  <input className="form-input" value={editHsCode} onChange={e => setEditHsCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <input className="form-input" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Kích thước</label>
                  <input className="form-input" value={editDimensions} onChange={e => setEditDimensions(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị tính</label>
                  <input className="form-input" value={editUnit} onChange={e => setEditUnit(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Trọng lượng / Đơn vị (kg)</label>
                  <input type="number" step="0.01" className="form-input" value={editUnitWeightKg} onChange={e => setEditUnitWeightKg(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số lượng</label>
                  <input type="number" className="form-input" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-outline" onClick={() => setEditingSource(null)}>Hủy</button>
	                <button className="btn btn-outline" style={{ borderColor: '#ef4444', color: '#b91c1c' }} onClick={() => handleDeleteSource(editingSource.id)}>Xóa nguồn</button>
	                <button className="btn btn-primary" onClick={handleUpdateSource}>Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
