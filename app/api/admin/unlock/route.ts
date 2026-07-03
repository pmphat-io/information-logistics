import { NextRequest, NextResponse } from "next/server";

import { getAdminPassword } from "@/lib/server-env";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { password?: string };

  if (!body.password) {
    return NextResponse.json(
      {
        error: "password is required."
      },
      { status: 400 }
    );
  }

  const success = body.password === getAdminPassword();

  return NextResponse.json({
    success
  });
}
