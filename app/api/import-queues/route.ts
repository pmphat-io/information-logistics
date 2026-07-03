import { NextRequest, NextResponse } from "next/server";

import { createImportBatch, listImportQueues } from "@/lib/services/import-service";

export async function GET() {
  const queues = await listImportQueues();
  return NextResponse.json({ items: queues, count: queues.length });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    type?: "packing-list" | "lookup-list" | "base-catalog";
    fileName?: string;
    documentCode?: string;
    documentDate?: string;
    rowCount?: number;
    notes?: string;
  };

  if (!body.type || !body.fileName) {
    return NextResponse.json(
      {
        error: "type and fileName are required."
      },
      { status: 400 }
    );
  }

  const created = await createImportBatch({
    type: body.type,
    fileName: body.fileName,
    documentCode: body.documentCode,
    documentDate: body.documentDate,
    rowCount: body.rowCount,
    notes: body.notes
  });

  return NextResponse.json(created, { status: 201 });
}
