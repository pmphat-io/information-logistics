import { readFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import { toSlugFileName } from "@/lib/excel/utils";
import type { PackingOrderDraft } from "@/lib/types";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "inv-pkl-template.xls"
);

function setCell(
  sheet: XLSX.WorkSheet,
  address: string,
  value: string | number | null
) {
  sheet[address] = {
    t: typeof value === "number" ? "n" : "s",
    v: value ?? ""
  };
}

export async function generatePackingListWorkbook(order: PackingOrderDraft) {
  const buffer = await readFile(TEMPLATE_PATH);
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false
  });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("Packing list template sheet not found.");
  }

  setCell(sheet, "B8", order.customerName);
  setCell(sheet, "I7", order.documentNo);
  setCell(sheet, "I8", order.documentDate);
  setCell(sheet, "I9", order.paymentTerm);
  setCell(sheet, "I10", order.deliveryMethod);
  setCell(sheet, "J11", order.deliveryWindow);

  const startRow = 13;
  const existingTemplateRows = 6;

  for (let i = 0; i < Math.max(existingTemplateRows, order.lines.length); i += 1) {
    const line = order.lines[i];
    const row = startRow + i;

    setCell(sheet, `B${row}`, line ? i + 1 : "");
    setCell(sheet, `C${row}`, line?.productName ?? "");
    setCell(sheet, `E${row}`, line?.contractOrPo ?? "");
    setCell(sheet, `F${row}`, line?.origin ?? "");
    setCell(sheet, `G${row}`, line?.brand ?? "");
    setCell(sheet, `H${row}`, line?.quantity ?? "");
    setCell(sheet, `I${row}`, line?.unit ?? "");
    setCell(sheet, `J${row}`, "");
    setCell(sheet, `K${row}`, "");
    setCell(sheet, `L${row}`, line?.totalWeightKg ?? "");
    setCell(sheet, `M${row}`, line?.hsCode ?? "");
    setCell(sheet, `O${row}`, line?.notes ?? "");
  }

  const totalRow = startRow + Math.max(existingTemplateRows, order.lines.length);
  const totalWeight = order.lines.reduce((sum, line) => sum + line.totalWeightKg, 0);

  setCell(sheet, `B${totalRow}`, "Tong cong");
  setCell(sheet, `L${totalRow}`, Number(totalWeight.toFixed(3)));
  setCell(sheet, "C22", order.packageCount);
  setCell(sheet, "C23", order.grossWeightKg);

  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "biff8"
  });

  return {
    buffer: Buffer.from(out),
    fileName: `${toSlugFileName(order.customerName || "packing-list") || "packing-list"}-${order.documentNo || "draft"}.xls`
  };
}
