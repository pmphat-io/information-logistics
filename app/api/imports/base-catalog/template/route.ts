import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    ["STT", "Tên hàng", "Đơn vị tính", "Trọng lượng/Đơn vị", "Xuất xứ", "Maker/Brand", "HS Code", "Kích thước", "Mô tả"],
    [1, "Chất Silicon Sealant 4588T White (4588TW)  (keo silicone, 300ml/ 370 gram/ 1 chai)", "Chai", 0.34, "Thailand", "ShinEtsu", "35069900", "Kích thước 1", "Mô tả 1"],
    [2, "Vòi bếp SFV29", "Cái", 1.4, "Vietnam", "INAX", "84818099", "Kích thước 2", "Mô tả 2"],
    [3, "Vòi cảm ứng A911 (1 bộ = 1 cái)", "Bộ", 3.51, "Vietnam", "Caesar", "84818099", "Kích thước 3", "Mô tả 3"]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hang hoa");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-thong-tin-hang-hoa.xlsx"'
    }
  });
}
