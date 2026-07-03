import type { PackingOrderDraft } from "@/lib/types";

export function ExportBuilder({ drafts }: { drafts: PackingOrderDraft[] }) {
  return (
    <div className="stack">
      {drafts.map((draft) => (
        <div key={draft.id} className="panel">
          <div className="table-row-header">
            <strong>Phien export #{draft.documentNo}</strong>
            <span className="status">Da luu lich su</span>
          </div>

          <div className="header-grid">
            <div className="tag">
              <span>Khach hang</span>
              <strong>{draft.customerName}</strong>
            </div>
            <div className="tag">
              <span>Ngay chung tu</span>
              <strong>{draft.documentDate}</strong>
            </div>
            <div className="tag">
              <span>Thanh toan</span>
              <strong>{draft.paymentTerm}</strong>
            </div>
            <div className="tag">
              <span>Phuong thuc</span>
              <strong>{draft.deliveryMethod}</strong>
            </div>
            <div className="tag">
              <span>Thoi han giao</span>
              <strong>{draft.deliveryWindow}</strong>
            </div>
            <div className="tag">
              <span>Packing summary</span>
              <strong>
                {draft.packageCount} kien / {draft.grossWeightKg} kg G.W
              </strong>
            </div>
          </div>

          <div className="order-lines">
            {draft.lines.map((line) => (
              <div key={line.id} className="line-item">
                <header>
                  <strong>{line.productName}</strong>
                  <span className="badge">{line.sourceLabel}</span>
                </header>
                <div className="metrics">
                  <div className="metric">
                    <span>So luong xuat</span>
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
                    <strong>{line.totalWeightKg} kg</strong>
                  </div>
                </div>
                <div className="key-value">
                  <span>HS Code</span>
                  <strong>{line.hsCode}</strong>
                </div>
                <div className="key-value">
                  <span>Xuat xu / Brand</span>
                  <strong>
                    {line.origin ?? "-"} / {line.brand ?? "-"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
