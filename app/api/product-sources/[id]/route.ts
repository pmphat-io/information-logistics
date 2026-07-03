import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    
    // Check if source exists
    const existing = await prisma.productSource.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }
    
    const updated = await prisma.productSource.update({
      where: { id },
      data: {
        origin: data.origin !== undefined ? data.origin : existing.origin,
        brand: data.brand !== undefined ? data.brand : existing.brand,
        hsCode: data.hsCode !== undefined ? data.hsCode : existing.hsCode,
        description: data.description !== undefined ? data.description : (existing as any).description,
        dimensions: data.dimensions !== undefined ? data.dimensions : (existing as any).dimensions,
        unitWeightKg: data.unitWeightKg !== undefined ? Number(data.unitWeightKg) || 0 : existing.unitWeightKg,
        unit: data.unit !== undefined ? data.unit : existing.unit,
        quantity: data.quantity !== undefined ? Number(data.quantity) || 0 : existing.quantity,
        totalWeightKg: data.totalWeightKg !== undefined ? Number(data.totalWeightKg) || 0 : existing.totalWeightKg
      } as any
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update product source", error);
    return NextResponse.json({ error: "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.productSource.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await prisma.productSource.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete product source", error);
    return NextResponse.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
