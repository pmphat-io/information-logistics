import { NextRequest, NextResponse } from "next/server";

import { updatePackingOrder } from "@/lib/services/packing-order-service";
import type { PackingOrderDraft } from "@/lib/types";

function isValidDraft(input: Partial<PackingOrderDraft>) {
  return Boolean(
    input.documentNo &&
      input.customerName &&
      input.documentDate &&
      Array.isArray(input.lines)
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await request.json()) as Partial<PackingOrderDraft>;

  if (!isValidDraft(body)) {
    return NextResponse.json(
      {
        error: "documentNo, customerName, documentDate, and lines are required."
      },
      { status: 400 }
    );
  }

  const updated = await updatePackingOrder(id, {
    id,
    documentNo: body.documentNo!,
    customerName: body.customerName!,
    documentDate: body.documentDate!,
    paymentTerm: body.paymentTerm ?? "",
    deliveryMethod: body.deliveryMethod ?? "",
    deliveryWindow: body.deliveryWindow ?? "",
    packageCount: body.packageCount ?? "",
    grossWeightKg: body.grossWeightKg ?? "",
    lines: body.lines ?? []
  });

  if (!updated) {
    return NextResponse.json(
      {
        error: "Packing order not found."
      },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}
