import type { ImportQueue } from "@/lib/types";

const typeLabel: Record<ImportQueue["type"], string> = {
  "packing-list": "Lich su khai",
  "lookup-list": "Danh sach tra cuu",
  "base-catalog": "Thong tin co so"
};

export function ImportCenter({ queues }: { queues: ImportQueue[] }) {
  return (
    <div className="stack">
      {queues.map((queue) => (
        <div key={queue.id} className="panel">
          <div className="table-row-header">
            <strong>{queue.title}</strong>
            <span className="badge">{typeLabel[queue.type]}</span>
          </div>
          <p className="hint">{queue.description}</p>
          <div className="key-value">
            <span>Dinh dang</span>
            <strong>{queue.acceptedFiles}</strong>
          </div>
          <div className="tag-row">
            {queue.mappedColumns.map((column) => (
              <div key={column} className="tag">
                <span>Cot map</span>
                <strong>{column}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
