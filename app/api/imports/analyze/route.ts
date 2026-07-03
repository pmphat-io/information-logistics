import { NextResponse } from "next/server";
import { parsePackingListWorkbook, parseBaseCatalogWorkbook } from "@/lib/excel/parsers";
import { listProducts, normalizeInput } from "@/lib/services/product-service";

function compactNormalized(text: string) {
  return normalizeInput(text).replace(/\s+/g, "");
}

export async function POST(request: Request) {
  try {
    let rows: any[] = [];
    let importContext: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const type = formData.get("type") as string;
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (type === "packing-list") {
        const parsed = parsePackingListWorkbook(buffer, file.name);
        rows = parsed.rows;
        importContext = {
          type: "packing-list",
          fileName: file.name,
          documentNo: parsed.documentNo,
          documentDate: parsed.documentDate,
          customerName: parsed.customerName,
          customerAddress: parsed.customerAddress,
          taxCode: parsed.customerTaxCode,
          paymentTerm: parsed.paymentTerm,
          deliveryMethod: parsed.deliveryMethod,
          deliveryWindow: parsed.deliveryWindow,
        };
      } else if (type === "base-catalog") {
        const parsedRows = parseBaseCatalogWorkbook(buffer);
        rows = parsedRows;
        importContext = {
          type: "base-catalog",
          fileName: file.name,
        };
      } else {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
    } else {
      // JSON body (for manual input)
      const data = await request.json();
      rows = data.products || [];
      importContext = {
        type: "manual"
      };
    }

    // Now matching
    const mappedRows = await Promise.all(
      rows.map(async (row, idx) => {
        const candidates = await listProducts(row.name);
        const normalizedRowName = normalizeInput(String(row.name || ""));
        const compactRowName = compactNormalized(String(row.name || ""));
        const exactCandidate =
          candidates.find((candidate) => candidate.normalizedName === normalizedRowName) ||
          candidates.find((candidate) => compactNormalized(candidate.normalizedName) === compactRowName) ||
          candidates.find((candidate) => normalizeInput(candidate.name) === normalizedRowName) ||
          candidates.find((candidate) => compactNormalized(candidate.name) === compactRowName) ||
          null;
        
        let status = 'pending';
        let matchedProduct = null;
        
        if (candidates.length === 0) {
          status = 'not-found';
        } else if (exactCandidate) {
          status = 'matched';
          matchedProduct = exactCandidate;
        } else if (candidates.length === 1 && (candidates[0].matchScore ?? 0) >= 92) {
          status = 'matched';
          matchedProduct = candidates[0];
        } else {
          status = 'ambiguous';
        }

        return {
          id: `row-${idx}`,
          index: idx + 1,
          originalName: row.name,
          rowContext: row, // contains quantity, origin, brand, etc.
          status,
          candidates: candidates.slice(0, 5),
          selectedProductId: matchedProduct ? matchedProduct.id : null,
          isNewProduct: status === 'not-found'
        };
      })
    );

    return NextResponse.json({
      importContext,
      mappedRows
    });

  } catch (e: any) {
    console.error("Analyze error:", e);
    return NextResponse.json({ error: "Lỗi phân tích dữ liệu" }, { status: 500 });
  }
}
