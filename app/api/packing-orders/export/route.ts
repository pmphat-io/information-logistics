import { NextResponse } from "next/server";

import { generatePackingListWorkbook } from "@/lib/excel/template";
import type { PackingOrderDraft } from "@/lib/types";

function isValidDraft(input: Partial<PackingOrderDraft>) {
  return Boolean(
    input.documentNo &&
      input.customerName &&
      input.documentDate &&
      Array.isArray(input.lines)
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<PackingOrderDraft>;

  if (!isValidDraft(body)) {
    return NextResponse.json(
      {
        error: "documentNo, customerName, documentDate, and lines are required."
      },
      { status: 400 }
    );
  }

  const order: PackingOrderDraft = {
    id: body.id ?? "",
    documentNo: body.documentNo!,
    customerName: body.customerName!,
    customerAddress: body.customerAddress ?? "",
    customerTaxCode: body.customerTaxCode ?? "",
    documentDate: body.documentDate!,
    paymentTerm: body.paymentTerm ?? "",
    deliveryMethod: body.deliveryMethod ?? "",
    deliveryWindow: body.deliveryWindow ?? "",
    packageCount: body.packageCount ?? "",
    grossWeightKg: body.grossWeightKg ?? "",
    lines: body.lines ?? []
  };

  const workbook = await generatePackingListWorkbook(order);

  return new NextResponse(workbook.buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${workbook.fileName}"`
    }
  });
}
