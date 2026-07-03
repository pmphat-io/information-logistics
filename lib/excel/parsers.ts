import { createHash } from "node:crypto";

import { getCellText, getSheetRows, normalizeHeader, parseNumber, readWorkbookFromBuffer } from "@/lib/excel/utils";

export interface ParsedPackingListRow {
  lineNo: number;
  name: string;
  contractOrPo: string;
  origin: string;
  brand: string;
  quantity: number;
  unit: string;
  totalWeightKg: number;
  unitWeightKg: number;
  hsCode: string;
  notes: string;
}

export interface ParsedPackingListDocument {
  fileName: string;
  sheetName: string;
  documentNo: string;
  documentDate: string;
  paymentTerm: string;
  deliveryMethod: string;
  deliveryWindow: string;
  customerName: string;
  customerAddress: string;
  customerTaxCode: string;
  rows: ParsedPackingListRow[];
}

export interface ParsedBaseCatalogRow {
  rowNo: number;
  name: string;
  origin: string;
  brand: string;
  description: string;
  dimensions: string;
  quantity: number;
  unit: string;
  totalWeightKg: number;
  unitWeightKg: number;
  hsCode: string;
  notes: string;
}

export interface ParsedLookupRow {
  rowNo: number;
  name: string;
  requestedQuantity: number;
  notes: string;
}

function pickSheet(buffer: Buffer) {
  const workbook = readWorkbookFromBuffer(buffer);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheetName || !sheet) {
    throw new Error("Workbook does not contain a readable sheet.");
  }

  return { workbook, sheetName, sheet };
}

function resolvePackingListHsCodeColumn(sheet: any) {
  const columnCandidates = ["M", "N"] as const;

  for (const column of columnCandidates) {
    const header = normalizeHeader(getCellText(sheet, `${column}12`));
    if (header.includes("hs")) {
      return column;
    }
  }

  return "M";
}

export function parsePackingListWorkbook(buffer: Buffer, fileName: string) {
  const { sheet, sheetName } = pickSheet(buffer);
  const resultRows: ParsedPackingListRow[] = [];
  const hsCodeColumn = resolvePackingListHsCodeColumn(sheet);

  for (let rowNumber = 13; rowNumber <= 512; rowNumber += 1) {
    const lineCell = getCellText(sheet, `B${rowNumber}`);
    const name = getCellText(sheet, `C${rowNumber}`);

    if (!lineCell && !name) {
      continue;
    }

    const normalizedLineCell = normalizeHeader(lineCell);

    if (normalizedLineCell.includes("tong cong")) {
      break;
    }

    const quantity = parseNumber(getCellText(sheet, `H${rowNumber}`));
    const totalWeightKg = parseNumber(getCellText(sheet, `L${rowNumber}`));
    const unitWeightKg =
      quantity > 0 ? Number((totalWeightKg / quantity).toFixed(6)) : 0;

    resultRows.push({
      lineNo: parseNumber(lineCell) || resultRows.length + 1,
      name,
      contractOrPo: getCellText(sheet, `E${rowNumber}`),
      origin: getCellText(sheet, `F${rowNumber}`),
      brand: getCellText(sheet, `G${rowNumber}`),
      quantity,
      unit: getCellText(sheet, `I${rowNumber}`),
      totalWeightKg,
      unitWeightKg,
      hsCode: getCellText(sheet, `${hsCodeColumn}${rowNumber}`),
      notes: ""
    });
  }

  return {
    fileName,
    sheetName,
    documentNo: getCellText(sheet, "I7"),
    documentDate: getCellText(sheet, "I8"),
    paymentTerm: getCellText(sheet, "I9"),
    deliveryMethod: getCellText(sheet, "I10"),
    deliveryWindow: getCellText(sheet, "J11") || getCellText(sheet, "I11"),
    customerName: getCellText(sheet, "B8"),
    customerAddress: getCellText(sheet, "B10"),
    customerTaxCode: getCellText(sheet, "B11").replace(/^MST\s*:\s*/i, "").trim(),
    rows: resultRows
  } satisfies ParsedPackingListDocument;
}

function mapHeaders(headerRow: (string | number | boolean | null)[]) {
  const normalized = headerRow.map((item) => normalizeHeader(String(item ?? "")));
  const indexOf = (...candidates: string[]) =>
    normalized.findIndex((value) => candidates.includes(value));

  return {
    name: indexOf("ten hang", "ten hang hoa", "hang hoa"),
    origin: indexOf("xuat xu", "nuoc san xuat"),
    brand: indexOf("thuong hieu", "maker brand", "maker brand", "brand", "maker"),
    description: indexOf("mo ta", "mo ta hang hoa", "dien giai", "description"),
    dimensions: indexOf("kich thuoc", "quy cach", "size", "dimensions"),
    quantity: indexOf("so luong"),
    unit: indexOf("don vi tinh", "don vi"),
    totalWeightKg: indexOf("tong trong luong", "trong luong", "trong luong kg"),
    unitWeightKg: indexOf("trong luong don vi", "trong luong don vi kg", "trong luong / don vi"),
    hsCode: indexOf("hs code", "hscode", "ma hs"),
    notes: indexOf("ghi chu", "thong tin cung cap them", "mo ta them")
  };
}

export function parseBaseCatalogWorkbook(buffer: Buffer) {
  const { sheet } = pickSheet(buffer);
  const rows = getSheetRows(sheet);

  if (rows.length < 2) {
    return [] as ParsedBaseCatalogRow[];
  }

  const headerMap = mapHeaders(rows[0]);

  return rows.slice(1).flatMap((row, rowIndex) => {
    const name = String(row[headerMap.name] ?? "").trim();
    if (!name) {
      return [];
    }

    const quantity =
      headerMap.quantity >= 0 ? parseNumber(row[headerMap.quantity]) || 1 : 1;
    const explicitUnitWeight =
      headerMap.unitWeightKg >= 0 ? parseNumber(row[headerMap.unitWeightKg]) : 0;
    const explicitTotalWeight =
      headerMap.totalWeightKg >= 0 ? parseNumber(row[headerMap.totalWeightKg]) : 0;
    const unitWeightKg =
      explicitUnitWeight > 0
        ? explicitUnitWeight
        : quantity > 0 && explicitTotalWeight > 0
          ? Number((explicitTotalWeight / quantity).toFixed(6))
          : 0;
    const totalWeightKg =
      explicitTotalWeight > 0
        ? explicitTotalWeight
        : Number((unitWeightKg * quantity).toFixed(6));

    return [
      {
        rowNo: rowIndex + 2,
        name,
        origin: String(row[headerMap.origin] ?? "").trim(),
        brand: String(row[headerMap.brand] ?? "").trim(),
        description: String(row[headerMap.description] ?? "").trim(),
        dimensions: String(row[headerMap.dimensions] ?? "").trim(),
        quantity,
        unit: String(row[headerMap.unit] ?? "").trim(),
        totalWeightKg,
        unitWeightKg,
        hsCode: String(row[headerMap.hsCode] ?? "").trim(),
        notes: String(row[headerMap.notes] ?? "").trim()
      } satisfies ParsedBaseCatalogRow
    ];
  });
}

export function parseLookupWorkbook(buffer: Buffer) {
  const { sheet } = pickSheet(buffer);
  const rows = getSheetRows(sheet);

  if (rows.length < 2) {
    return [] as ParsedLookupRow[];
  }

  const headerMap = mapHeaders(rows[0]);

  return rows.slice(1).flatMap((row, rowIndex) => {
    const name = String(row[headerMap.name] ?? "").trim();
    if (!name) {
      return [];
    }

    return [
      {
        rowNo: rowIndex + 2,
        name,
        requestedQuantity: parseNumber(row[headerMap.quantity]),
        notes: String(row[headerMap.notes] ?? "").trim()
      } satisfies ParsedLookupRow
    ];
  });
}

export function buildImportFingerprint(input: string) {
  return createHash("sha1").update(input).digest("hex");
}
