import type { SearchDemoState, SearchSuggestion } from "@/lib/types";

function SourceCard({
  source,
  preferred
}: {
  source: SearchSuggestion["sources"][number];
  preferred?: boolean;
}) {
  return (
    <div className="source-item">
      <div className="table-row-header">
        <strong>
          {source.type === "manual" ? "Thong tin co so" : "Packing List"}
        </strong>
        {preferred ? <span className="status">Nguon dang chon</span> : null}
      </div>
      <div className="key-value">
        <span>Ma nguon</span>
        <strong>{source.referenceCode}</strong>
      </div>
      <div className="key-value">
        <span>Xuat xu</span>
        <strong>{source.origin}</strong>
      </div>
      <div className="key-value">
        <span>Brand</span>
        <strong>{source.brand}</strong>
      </div>
      <div className="key-value">
        <span>HS Code</span>
        <strong>{source.hsCode}</strong>
      </div>
      <div className="metrics">
        <div className="metric">
          <span>So luong goc</span>
          <strong>
            {source.quantity} {source.unit}
          </strong>
        </div>
        <div className="metric">
          <span>Tong trong luong</span>
          <strong>{source.totalWeightKg} kg</strong>
        </div>
        <div className="metric">
          <span>Trong luong / don vi</span>
          <strong>{source.unitWeightKg} kg</strong>
        </div>
      </div>
      {source.notes ? <p className="hint">{source.notes}</p> : null}
    </div>
  );
}

export function SearchWorkflow({ data }: { data: SearchDemoState }) {
  return (
    <div className="stack">
      <div className="panel">
        <span className="pill">Buoc 1</span>
        <p className="row-title">Nhap ten hang hoa hoac import danh sach tra cuu</p>
        <p className="muted">
          Tu khoa demo: <strong>{data.query}</strong>
        </p>
      </div>

      <div className="panel">
        <span className="pill">Buoc 2</span>
        <p className="row-title">Tra ve ten trung khop hoac goi y ten tuong dong</p>
        <div className="stack">
          {data.suggestions.map((suggestion) => (
            <div key={suggestion.id} className="table-row">
              <div className="table-row-header">
                <strong>{suggestion.productName}</strong>
                <span className="badge">
                  {suggestion.mode === "exact" ? "Trung khop" : "Tuong dong"} ·{" "}
                  {suggestion.score}%
                </span>
              </div>
              <p className="list-note">
                He thong khong gom nhieu ten vao mot hang. Moi ten duoc quan ly
                thanh mot hang hoa rieng de nguoi dung chon dung dong.
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <span className="pill">Buoc 3</span>
        <p className="row-title">Chon nguon thong tin de dua vao packing list</p>
        <div className="stack">
          {data.suggestions[0]?.sources.map((source, index) => (
            <SourceCard
              key={source.id}
              source={source}
              preferred={index === 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
