import { NextResponse } from "next/server";

import { importPackingListFile } from "@/lib/services/import-workflow-service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "file is required."
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importPackingListFile(file.name, buffer);

  return NextResponse.json(result, { status: 201 });
}
