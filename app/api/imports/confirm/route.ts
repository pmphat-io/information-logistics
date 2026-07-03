import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeHeader } from "@/lib/excel/utils";
import { createImportBatch } from "@/lib/services/import-service";

function normalizeProductName(name: string) {
  return normalizeHeader(name);
}

function normalizeDocKeyPart(value: unknown) {
  return normalizeHeader(String(value ?? ""));
}

function extractCustomerNameFromMetadata(metadata: string | null | undefined) {
  if (!metadata) return "";

  try {
    const parsed = JSON.parse(metadata);
    return String(parsed?.customerName ?? "");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { importContext, commonContext, rows } = data;
    
    if (!importContext || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (
      importContext.type === "packing-list" &&
      (!String(commonContext?.customerName || "").trim() ||
        !String(commonContext?.documentNo || "").trim())
    ) {
      return NextResponse.json(
        { error: "Packing List bắt buộc phải có Khách hàng và Số PK trước khi lưu." },
        { status: 400 }
      );
    }

    const { type, fileName, documentNo, documentDate } = importContext;
    let batch = null;

    // Create batch if not manual text
    if (type === "packing-list" || type === "base-catalog") {
      batch = await createImportBatch({
        type: type,
        fileName: fileName || "unknown",
        documentCode: commonContext?.documentNo || documentNo,
        documentDate: commonContext?.documentDate || documentDate,
        rowCount: rows.length,
      });
    }

    let sourceCount = 0;
    
    // Prepare metadata if commonContext is provided and it's a packing list or manual override
    let metadataStr = null;
    if (commonContext && (commonContext.customerName || commonContext.customerAddress || commonContext.taxCode)) {
      metadataStr = JSON.stringify(commonContext);
    }

    for (const row of rows) {
      if (row.action === "skip") continue;

      let productId = row.productId;
      const normalizedName = normalizeProductName(row.name);

      if (row.action === "create" || !productId) {
        let existing = await prisma.product.findUnique({ where: { normalizedName } });
        if (!existing) {
          const product = await prisma.product.create({
            data: {
              name: row.name,
              normalizedName,
              contractOrPo: row.contractOrPo || null
            }
          });
          productId = product.id;
        } else {
          productId = existing.id;
          if (row.contractOrPo && !existing.contractOrPo) {
            await prisma.product.update({
              where: { id: productId },
              data: { contractOrPo: row.contractOrPo }
            });
          }
        }
      } else if (row.action === "update") {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (product && row.contractOrPo && !product.contractOrPo) {
           await prisma.product.update({
            where: { id: productId },
            data: { contractOrPo: row.contractOrPo }
          });
        }
      }

      if (type === "base-catalog") {
        await prisma.productSource.deleteMany({
          where: { productId, type: "manual" }
        });
      }

      const referenceCode = commonContext?.documentNo || documentNo || (batch ? `BASE-${batch.id}` : "MANUAL-INPUT");
      const declaredAt = commonContext?.documentDate || documentDate || null;
      const sourceType = row.sourceType || (type === "packing-list" ? "customs-declaration" : "manual");
      const incomingCustomerName = String(commonContext?.customerName || importContext?.customerName || "");

      let existingDuplicateDeclaration = null;
      if (sourceType === "customs-declaration" && productId) {
        const declarationCandidates = await prisma.productSource.findMany({
          where: {
            productId,
            type: "customs-declaration",
            referenceCode,
            declaredAt
          }
        });

        existingDuplicateDeclaration =
          declarationCandidates.find((item) =>
            normalizeDocKeyPart(extractCustomerNameFromMetadata(item.metadata)) === normalizeDocKeyPart(incomingCustomerName)
          ) ?? null;
      }

      const sourcePayload = {
        type: sourceType,
        referenceCode,
        declaredAt,
        quantity: row.quantity ? Number(row.quantity) : 0,
        unit: row.unit || "",
        totalWeightKg: row.totalWeightKg ? Number(row.totalWeightKg) : 0,
        unitWeightKg: row.unitWeightKg ? Number(row.unitWeightKg) : 0,
        origin: row.origin || null,
        brand: row.brand || null,
        hsCode: row.hsCode || null,
        description: row.description || null,
        dimensions: row.dimensions || null,
        notes: row.notes || null,
        metadata: metadataStr
      };

      if (existingDuplicateDeclaration) {
        await prisma.productSource.update({
          where: { id: existingDuplicateDeclaration.id },
          data: sourcePayload
        });
      } else {
        await prisma.productSource.create({
          data: {
            productId,
            ...sourcePayload
          }
        });
      }
      sourceCount++;
    }

    return NextResponse.json({ success: true, count: sourceCount });
  } catch (e: any) {
    console.error("Confirm error:", e);
    return NextResponse.json({ error: "Lỗi xác nhận dữ liệu" }, { status: 500 });
  }
}
