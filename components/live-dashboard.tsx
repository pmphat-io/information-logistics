"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

import type {
  ImportQueue,
  PackingOrderDraft,
  PackingOrderLine,
  ProductRecord,
  ProductSource
} from "@/lib/types";

type ProductSearchItem = ProductRecord & { matchScore?: number };

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
  | "documentDate"
  | "paymentTerm"
  | "deliveryMethod"
  | "deliveryWindow"
  | "packageCount"
  | "grossWeightKg"
>;

const importRouteByType: Record<ImportQueue["type"], string> = {
  "packing-list": "/api/imports/packing-list",
  "lookup-list": "/api/imports/lookup-list",
  "base-catalog": "/api/imports/base-catalog"
};

const emptyHeader: ExportHeader = {
  documentNo: "",
  customerName: "",
  documentDate: new Date().toISOString().slice(0, 10),
  paymentTerm: "",
  deliveryMethod: "",
  deliveryWindow: "",
  packageCount: "",
  grossWeightKg: ""
};

function SourceCard({
  source,
  selected,
  onSelect
}: {
  source: ProductSource;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="source-select-card" onClick={onSelect}>
      <div className="table-row-header">
        <strong>{source.type === "manual" ? "Thong tin co so" : "Packing List"}</strong>
        <span className={selected ? "status" : "badge"}>
          {selected ? "Dang chon" : source.referenceCode}
        </span>
      </div>
      <div className="metrics">
        <div className="metric">
          <span>Xuat xu</span>
          <strong>{source.origin}</strong>
        </div>
        <div className="metric">
          <span>Brand</span>
          <strong>{source.brand}</strong>
        </div>
        <div className="metric">
          <span>HS Code</span>
          <strong>{source.hsCode}</strong>
        </div>
      </div>
      <div className="metrics">
        <div className="metric">
          <span>So luong goc</span>
          <strong>
            {source.quantity} {source.unit}
          </strong>
        </div>
        <div className="metric">
          <span>Tong kg</span>
          <strong>{source.totalWeightKg}</strong>
        </div>
        <div className="metric">
          <span>Kg / don vi</span>
          <strong>{source.unitWeightKg}</strong>
        </div>
      </div>
      {source.notes ? <p className="hint">{source.notes}</p> : null}
    </button>
  );
}

export function LiveDashboard() {
  const [isPending, startTransition] = useTransition();
  const [queues, setQueues] = useState<ImportQueue[]>([]);
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [orders, setOrders] = useState<PackingOrderDraft[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedProduct, setSelectedProduct] = useState<ProductSourcesPayload | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [draftQuantity, setDraftQuantity] = useState<string>("1");
  const [orderLines, setOrderLines] = useState<PackingOrderLine[]>([]);
  const [exportHeader, setExportHeader] = useState<ExportHeader>(emptyHeader);
  const [activeDraftId, setActiveDraftId] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const selectedSource = useMemo(
    () => selectedProduct?.sources.find((item) => item.id === selectedSourceId) ?? null,
    [selectedProduct, selectedSourceId]
  );

  async function loadQueues() {
    const response = await fetch("/api/import-queues");
    const payload = (await response.json()) as { items: ImportQueue[] };
    setQueues(payload.items);
  }

  async function loadOrders() {
    const response = await fetch("/api/packing-orders");
    const payload = (await response.json()) as { items: PackingOrderDraft[] };
    setOrders(payload.items);
  }

  async function loadProducts(text?: string) {
    const url = text ? `/api/products?q=${encodeURIComponent(text)}` : "/api/products";
    const response = await fetch(url);
    const payload = (await response.json()) as { items: ProductSearchItem[] };
    setProducts(payload.items);
  }

  useEffect(() => {
    startTransition(() => {
      void loadQueues();
      void loadOrders();
      void loadProducts();
    });
  }, []);

  useEffect(() => {
    const normalized = deferredQuery.trim();
    startTransition(() => {
      void loadProducts(normalized || undefined);
    });
  }, [deferredQuery]);

  async function unlockAdmin() {
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: adminPassword })
    });
    const payload = (await response.json()) as { success: boolean };

    if (!payload.success) {
      setAdminUnlocked(false);
      setError("Mat khau quan tri khong dung.");
      return;
    }

    setAdminUnlocked(true);
    setMessage("Da mo khoa tinh nang quan tri va import.");
  }

  async function handleImport(type: ImportQueue["type"], file: File | null) {
    if (!file) {
      setError("Can chon file truoc khi import.");
      return;
    }

    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(importRouteByType[type], {
      method: "POST",
      body: formData
    });

    const payload = (await response.json()) as {
      batch?: { rowCount?: number; documentCode?: string };
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Import that bai.");
      return;
    }

    setMessage(
      `Import thanh cong ${payload.batch?.rowCount ?? 0} dong${
        payload.batch?.documentCode ? ` tu chung tu ${payload.batch.documentCode}` : ""
      }.`
    );

    await Promise.all([loadProducts(query.trim() || undefined), loadOrders()]);
  }

  async function selectProduct(productId: string) {
    setError("");
    setMessage("");

    const response = await fetch(`/api/products/${productId}/sources`);

    if (!response.ok) {
      setError("Khong tai duoc nguon thong tin cho hang hoa nay.");
      return;
    }

    const payload = (await response.json()) as ProductSourcesPayload;
    setSelectedProduct(payload);
    setSelectedSourceId(payload.sources[0]?.id ?? "");
    setDraftQuantity(
      payload.sources[0]?.quantity ? String(payload.sources[0].quantity) : "1"
    );
  }

  function addSelectedLine() {
    if (!selectedProduct || !selectedSource) {
      setError("Can chon hang hoa va nguon thong tin truoc.");
      return;
    }

    const quantity = Number(draftQuantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("So luong xuat phai lon hon 0.");
      return;
    }

    setError("");
    const totalWeightKg = Number((selectedSource.unitWeightKg * quantity).toFixed(6));

    setOrderLines((current) => [
      ...current,
      {
        id: `${selectedProduct.id}-${selectedSource.id}-${Date.now()}`,
        productName: selectedProduct.name,
        contractOrPo: selectedProduct.contractOrPo,
        origin: selectedSource.origin,
        brand: selectedSource.brand,
        quantity,
        unit: selectedSource.unit || "",
        unitWeightKg: selectedSource.unitWeightKg,
        totalWeightKg,
        hsCode: selectedSource.hsCode || "",
        sourceLabel:
          selectedSource.type === "manual"
            ? `Thong tin co so ${selectedSource.referenceCode}`
            : `So PK ${selectedSource.referenceCode}`,
        notes: selectedSource.notes
      }
    ]);
    setMessage(`Da them ${selectedProduct.name} vao packing list nhap.`);
  }

  function removeLine(lineId: string) {
    setOrderLines((current) => current.filter((line) => line.id !== lineId));
  }

  async function saveOrder() {
    if (!orderLines.length) {
      setError("Chua co dong nao trong packing list.");
      return;
    }

    const response = await fetch(
      activeDraftId ? `/api/packing-orders/${activeDraftId}` : "/api/packing-orders",
      {
        method: activeDraftId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...exportHeader,
          lines: orderLines
        })
      }
    );

    const payload = (await response.json()) as { error?: string; id?: string };

    if (!response.ok) {
      setError(payload.error ?? "Khong luu duoc phien packing list.");
      return;
    }

    setMessage(activeDraftId ? "Da cap nhat phien packing list." : "Da luu phien packing list.");
    setActiveDraftId(payload.id ?? activeDraftId);
    await loadOrders();
  }

  async function exportDraft(draft: ExportHeader & { lines: PackingOrderLine[] }) {
    const response = await fetch("/api/packing-orders/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(draft)
    });

    if (!response.ok) {
      setError("Export file packing list that bai.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const fileName =
      response.headers
        .get("Content-Disposition")
        ?.match(/filename="(.+)"/)?.[1] ?? "packing-list.xls";
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setMessage("Da tao file packing list tu template.");
  }

  function loadSavedDraft(draft: PackingOrderDraft) {
    setExportHeader({
      documentNo: draft.documentNo,
      customerName: draft.customerName,
      documentDate: draft.documentDate,
      paymentTerm: draft.paymentTerm,
      deliveryMethod: draft.deliveryMethod,
      deliveryWindow: draft.deliveryWindow,
      packageCount: draft.packageCount,
      grossWeightKg: draft.grossWeightKg
    });
    setOrderLines(draft.lines);
    setActiveDraftId(draft.id);
    setMessage(`Da nap lai phien ${draft.documentNo} vao form chinh sua.`);
    setError("");
  }

  function resetDraftEditor() {
    setExportHeader({
      ...emptyHeader,
      documentDate: new Date().toISOString().slice(0, 10)
    });
    setOrderLines([]);
    setActiveDraftId("");
    setSelectedProduct(null);
    setSelectedSourceId("");
    setDraftQuantity("1");
    setMessage("Da tao form packing list moi.");
    setError("");
  }

  async function exportOrder() {
    if (!orderLines.length) {
      setError("Chua co dong nao de export.");
      return;
    }

    await exportDraft({
      ...exportHeader,
      lines: orderLines
    });
  }

  return (
    <section className="interactive-grid">
      <div className="grid-two">
        <article className="section-card">
          <div className="section-head">
            <p className="section-kicker">Live Import</p>
            <h2>Nhap Du Lieu</h2>
            <p className="section-description">
              Mo khoa bang mat khau quan tri, sau do import truc tiep vao API.
            </p>
          </div>

          <div className="panel">
            <div className="inline-form">
              <input
                className="text-input"
                type="password"
                placeholder="Mat khau quan tri"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
              />
              <button className="action-button" type="button" onClick={unlockAdmin}>
                Mo khoa
              </button>
            </div>
            <p className="hint">
              Trang thai: {adminUnlocked ? "Da mo khoa" : "Dang khoa"}
            </p>
          </div>

          <div className="stack">
            {queues.map((queue) => (
              <div key={queue.id} className="panel">
                <div className="table-row-header">
                  <strong>{queue.title}</strong>
                  <span className="badge">{queue.acceptedFiles}</span>
                </div>
                <p className="hint">{queue.description}</p>
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const input = form.elements.namedItem("file") as HTMLInputElement | null;
                    void handleImport(queue.type, input?.files?.[0] ?? null);
                  }}
                >
                  <input
                    className="text-input"
                    type="file"
                    name="file"
                    accept={queue.acceptedFiles.replace(/ /g, "")}
                    disabled={!adminUnlocked}
                  />
                  <button
                    className="action-button"
                    type="submit"
                    disabled={!adminUnlocked}
                  >
                    Import
                  </button>
                </form>
              </div>
            ))}
          </div>
        </article>

        <article className="section-card">
          <div className="section-head">
            <p className="section-kicker">Live Search</p>
            <h2>Tra Cuu Hang Hoa</h2>
            <p className="section-description">
              Tim theo ten, chon hang hoa, roi chon nguon thong tin de lap packing list.
            </p>
          </div>

          <div className="panel">
            <input
              className="text-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhap ten hang hoa..."
            />
            <p className="hint">
              {isPending ? "Dang tai du lieu..." : `${products.length} ket qua`}
            </p>
          </div>

          <div className="stack scroll-block">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                className="table-row select-row"
                onClick={() => {
                  void selectProduct(product.id);
                }}
              >
                <div className="table-row-header">
                  <strong>{product.name}</strong>
                  <span className="badge">{product.matchScore ?? 100}%</span>
                </div>
                <p className="hint">
                  {product.declarationHistory.length} lan khai /{" "}
                  {product.baseInfo ? "co thong tin co so" : "chua co thong tin co so"}
                </p>
              </button>
            ))}
          </div>

          {selectedProduct ? (
            <div className="panel">
              <div className="table-row-header">
                <strong>{selectedProduct.name}</strong>
                <span className="status">Nguon du lieu</span>
              </div>
              <div className="stack">
                {selectedProduct.sources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    selected={selectedSourceId === source.id}
                    onSelect={() => setSelectedSourceId(source.id)}
                  />
                ))}
              </div>
              <div className="inline-form">
                <input
                  className="text-input"
                  type="number"
                  min="1"
                  step="1"
                  value={draftQuantity}
                  onChange={(event) => setDraftQuantity(event.target.value)}
                />
                <button className="action-button" type="button" onClick={addSelectedLine}>
                  Them vao packing
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </div>

      <div className="grid-two">
        <article className="section-card">
          <div className="section-head">
            <p className="section-kicker">Draft Builder</p>
            <h2>Tao Packing List</h2>
            <p className="section-description">
              Sua thong tin header, xem dong da chon, luu lich su va export file Excel.
            </p>
          </div>

          <div className="header-grid">
            <input
              className="text-input"
              placeholder="So chung tu"
              value={exportHeader.documentNo}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  documentNo: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="Khach hang"
              value={exportHeader.customerName}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  customerName: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              type="date"
              value={exportHeader.documentDate}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  documentDate: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="Thanh toan"
              value={exportHeader.paymentTerm}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  paymentTerm: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="Phuong thuc"
              value={exportHeader.deliveryMethod}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  deliveryMethod: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="Thoi han giao"
              value={exportHeader.deliveryWindow}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  deliveryWindow: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="So kien"
              value={exportHeader.packageCount}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  packageCount: event.target.value
                }))
              }
            />
            <input
              className="text-input"
              placeholder="G.W (kg)"
              value={exportHeader.grossWeightKg}
              onChange={(event) =>
                setExportHeader((current) => ({
                  ...current,
                  grossWeightKg: event.target.value
                }))
              }
            />
          </div>

          <div className="inline-form">
            <span className="pill">
              {activeDraftId ? "Dang sua phien da luu" : "Dang tao phien moi"}
            </span>
            <button className="ghost-button" type="button" onClick={resetDraftEditor}>
              Tao form moi
            </button>
          </div>

          <div className="stack scroll-block">
            {orderLines.length ? (
              orderLines.map((line) => (
                <div key={line.id} className="line-item">
                  <header>
                    <strong>{line.productName}</strong>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => removeLine(line.id)}
                    >
                      Xoa
                    </button>
                  </header>
                  <div className="metrics">
                    <div className="metric">
                      <span>So luong</span>
                      <strong>
                        {line.quantity} {line.unit}
                      </strong>
                    </div>
                    <div className="metric">
                      <span>Kg / don vi</span>
                      <strong>{line.unitWeightKg}</strong>
                    </div>
                    <div className="metric">
                      <span>Tong N.W</span>
                      <strong>{line.totalWeightKg}</strong>
                    </div>
                  </div>
                  <p className="hint">
                    {line.origin} / {line.brand} / HS {line.hsCode}
                  </p>
                </div>
              ))
            ) : (
              <div className="panel">
                <p className="hint">
                  Chua co dong nao. Chon hang hoa o cot tra cuu va them vao packing.
                </p>
              </div>
            )}
          </div>

          <div className="inline-form">
            <button className="action-button" type="button" onClick={() => void saveOrder()}>
              Luu phien
            </button>
            <button className="action-button secondary" type="button" onClick={() => void exportOrder()}>
              Export file
            </button>
          </div>
        </article>

        <article className="section-card">
          <div className="section-head">
            <p className="section-kicker">History</p>
            <h2>Phien Da Luu</h2>
            <p className="section-description">
              Lich su packing list da tao tu API hien co.
            </p>
          </div>

          {message ? <div className="feedback success">{message}</div> : null}
          {error ? <div className="feedback error">{error}</div> : null}

          <div className="stack scroll-block">
            {orders.map((draft) => (
              <div key={draft.id} className="panel">
                <div className="table-row-header">
                  <strong>{draft.documentNo}</strong>
                  <span className={activeDraftId === draft.id ? "status" : "badge"}>
                    {activeDraftId === draft.id ? "Dang mo" : `${draft.lines.length} dong`}
                  </span>
                </div>
                <p className="hint">
                  {draft.customerName} / {draft.documentDate}
                </p>
                <p className="hint">
                  {draft.packageCount} kien / {draft.grossWeightKg} kg G.W
                </p>
                <div className="inline-form">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => loadSavedDraft(draft)}
                  >
                    Nap vao form
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      void exportDraft({
                        documentNo: draft.documentNo,
                        customerName: draft.customerName,
                        documentDate: draft.documentDate,
                        paymentTerm: draft.paymentTerm,
                        deliveryMethod: draft.deliveryMethod,
                        deliveryWindow: draft.deliveryWindow,
                        packageCount: draft.packageCount,
                        grossWeightKg: draft.grossWeightKg,
                        lines: draft.lines
                      });
                    }}
                  >
                    Export lai
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
