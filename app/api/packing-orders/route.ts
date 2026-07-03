import { NextRequest, NextResponse } from "next/server";

import { createPackingOrder, listPackingOrders } from "@/lib/services/packing-order-service";
import type { PackingOrderDraft } from "@/lib/types";

function isValidDraft(input: Partial<PackingOrderDraft>) {
  return Boolean(
    input.documentNo &&
      input.customerName &&
      input.documentDate &&
      Array.isArray(input.lines)
  );
}

export async function GET() {
  const items = await listPackingOrders();

  return NextResponse.json({
    items,
    count: items.length
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<PackingOrderDraft>;

  if (!isValidDraft(body)) {
    return NextResponse.json(
      {
        error: "documentNo, customerName, documentDate, and lines are required."
      },
      { status: 400 }
    );
  }

  const created = await createPackingOrder({
    id: body.id ?? "",
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

  return NextResponse.json(created, { status: 201 });
}
