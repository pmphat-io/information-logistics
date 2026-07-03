import type { ProductRecord } from "@/lib/types";

export function CatalogTable({ entries }: { entries: ProductRecord[] }) {
  return (
    <div className="stack">
      {entries.map((entry) => (
        <div key={entry.id} className="table-row">
          <div className="table-row-header">
            <strong>{entry.name}</strong>
            <span className="badge">
              {entry.declarationHistory.length} lan khai
            </span>
          </div>
          <div className="table-grid">
            <div className="panel">
              <p className="row-title">Thong tin co so</p>
              {entry.baseInfo ? (
                <>
                  <div className="key-value">
                    <span>Brand</span>
                    <strong>{entry.baseInfo.brand}</strong>
                  </div>
                  <div className="key-value">
                    <span>Xuat xu</span>
                    <strong>{entry.baseInfo.origin}</strong>
                  </div>
                  <div className="key-value">
                    <span>HS Code</span>
                    <strong>{entry.baseInfo.hsCode}</strong>
                  </div>
                  <div className="key-value">
                    <span>Kg / don vi</span>
                    <strong>{entry.baseInfo.unitWeightKg}</strong>
                  </div>
                </>
              ) : (
                <p className="hint">
                  Chua co thong tin co so. He thong se uu tien lich su khai neu co.
                </p>
              )}
            </div>

            <div className="panel">
              <p className="row-title">Nguon khai gan nhat</p>
              {entry.declarationHistory[0] ? (
                <>
                  <div className="key-value">
                    <span>Ma packing</span>
                    <strong>{entry.declarationHistory[0].referenceCode}</strong>
                  </div>
                  <div className="key-value">
                    <span>Ngay</span>
                    <strong>{entry.declarationHistory[0].declaredAt}</strong>
                  </div>
                  <div className="key-value">
                    <span>Tong kg</span>
                    <strong>{entry.declarationHistory[0].totalWeightKg}</strong>
                  </div>
                  <div className="key-value">
                    <span>Kg / don vi</span>
                    <strong>{entry.declarationHistory[0].unitWeightKg}</strong>
                  </div>
                </>
              ) : (
                <p className="hint">Hang hoa nay chua co lich su khai hai quan.</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
