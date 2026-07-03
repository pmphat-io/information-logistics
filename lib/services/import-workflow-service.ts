import { createImportBatch } from "@/lib/services/import-service";
import { buildImportFingerprint, parseBaseCatalogWorkbook, parseLookupWorkbook, parsePackingListWorkbook } from "@/lib/excel/parsers";
import { prisma } from "@/lib/db";
import { normalizeHeader } from "@/lib/excel/utils";

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

function normalizeProductName(name: string) {
  return normalizeHeader(name);
}

export async function importPackingListFile(fileName: string, buffer: Buffer) {
  const parsed = parsePackingListWorkbook(buffer, fileName);

  const batch = await createImportBatch({
    type: "packing-list",
    fileName,
    documentCode: parsed.documentNo,
    documentDate: parsed.documentDate,
    rowCount: parsed.rows.length,
    notes: buildImportFingerprint(`${fileName}:${parsed.documentNo}:${parsed.documentDate}`)
  });

  const dbConnected = await isMySqlConfigured();
  if (!dbConnected) {
    return {
      batch,
      parsed,
      persisted: false
    };
  }

  for (const row of parsed.rows) {
    const normalizedName = normalizeProductName(row.name);
    
    // Upsert product
    let product = await prisma.product.findUnique({ where: { normalizedName } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: row.name,
          normalizedName,
          contractOrPo: row.contractOrPo
        }
      });
    } else if (row.contractOrPo && !product.contractOrPo) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { contractOrPo: row.contractOrPo }
      });
    }

    // Add source
    await prisma.productSource.create({
      data: {
        productId: product.id,
        type: "customs-declaration",
        referenceCode: parsed.documentNo || fileName,
        declaredAt: parsed.documentDate,
        quantity: row.quantity,
        unit: row.unit,
        totalWeightKg: row.totalWeightKg,
        unitWeightKg: row.unitWeightKg,
        origin: row.origin,
        brand: row.brand,
        hsCode: row.hsCode,
        notes: row.notes
      }
    });
  }

  return {
    batch,
    parsed,
    persisted: true
  };
}

export async function importBaseCatalogFile(fileName: string, buffer: Buffer) {
  const parsedRows = parseBaseCatalogWorkbook(buffer);
  const batch = await createImportBatch({
    type: "base-catalog",
    fileName,
    rowCount: parsedRows.length
  });

  const dbConnected = await isMySqlConfigured();
  if (!dbConnected) {
    return {
      batch,
      rows: parsedRows,
      persisted: false
    };
  }

  for (const row of parsedRows) {
    const normalizedName = normalizeProductName(row.name);
    
    // Upsert Product
    let product = await prisma.product.findUnique({ where: { normalizedName } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: row.name,
          normalizedName
        }
      });
    } else {
      product = await prisma.product.update({
        where: { id: product.id },
        data: { name: row.name }
      });
    }

    // Remove old manual source if any
    await prisma.productSource.deleteMany({
      where: {
        productId: product.id,
        type: "manual"
      }
    });

    // Add new manual source
    await prisma.productSource.create({
      data: {
        productId: product.id,
        type: "manual",
        referenceCode: `BASE-${batch.id}-${row.rowNo}`,
        quantity: row.quantity,
        unit: row.unit,
        totalWeightKg: row.totalWeightKg,
        unitWeightKg: row.unitWeightKg,
        origin: row.origin,
        brand: row.brand,
        hsCode: row.hsCode,
        description: row.description,
        dimensions: row.dimensions,
        notes: row.notes
      }
    });
  }

  return {
    batch,
    rows: parsedRows,
    persisted: true
  };
}

export async function importLookupFile(fileName: string, buffer: Buffer) {
  const rows = parseLookupWorkbook(buffer);
  const batch = await createImportBatch({
    type: "lookup-list",
    fileName,
    rowCount: rows.length
  });

  return {
    batch,
    rows
  };
}
