import * as XLSX from "xlsx";

export function normalizeHeader(value: string) {
  return value
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function readWorkbookFromBuffer(buffer: Buffer) {
  return XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    dense: false
  });
}

export function getSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: ""
  });
}

export function getCellText(sheet: XLSX.WorkSheet, address: string) {
  const cell = sheet[address];
  if (!cell || cell.v === undefined || cell.v === null) {
    return "";
  }

  return String(cell.w ?? cell.v).trim();
}

export function parseNumber(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toSlugFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
