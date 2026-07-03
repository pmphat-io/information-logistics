import { prisma } from "@/lib/db";
import { importQueues } from "@/lib/mock-data";

// Fallback logic
let _hasMySql = true;
async function isMySqlConfigured() {
  if (!_hasMySql) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    _hasMySql = false;
    return false;
  }
}

export async function listImportQueues() {
  return importQueues;
}

export async function createImportBatch(input: {
  type: "packing-list" | "lookup-list" | "base-catalog";
  fileName: string;
  documentCode?: string;
  documentDate?: string;
  rowCount?: number;
  notes?: string;
}) {
  const dbConnected = await isMySqlConfigured();

  if (!dbConnected) {
    return {
      id: `mock-import-${Date.now()}`,
      ...input,
      importedAt: new Date().toISOString(),
      status: "draft"
    };
  }

  const created = await prisma.importBatch.create({
    data: {
      type: input.type,
      fileName: input.fileName,
      documentCode: input.documentCode,
      documentDate: input.documentDate,
      rowCount: input.rowCount,
      notes: input.notes,
      importedAt: new Date().toISOString(),
      status: "draft"
    }
  });

  return {
    id: created.id,
    type: created.type,
    fileName: created.fileName,
    documentCode: created.documentCode,
    documentDate: created.documentDate,
    rowCount: created.rowCount,
    importedAt: created.importedAt,
    status: created.status,
    notes: created.notes
  };
}
