import { NextResponse } from "next/server";

import { isMongoConfigured } from "@/lib/server-env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mongoConfigured: isMongoConfigured(),
    timestamp: new Date().toISOString()
  });
}
