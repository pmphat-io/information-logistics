import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    ["STT", "Tên hàng", "Số lượng"],
    [1, "Chất Silicon Sealant 4588T White (4588TW) (keo silicone, 300ml/ 370 gram/ 1 chai)", 1],
    [2, "Vòi bếp SFV29", 2],
    [3, "Vòi cảm ứng A911 (1 bộ = 1 cái)", 3]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tra cuu");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-tim-kiem-hang-hoa.xlsx"'
    }
  });
}
