import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { name, aliases } = await request.json();
    
    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    let aliasesToSave = existing.aliases;
    if (aliases !== undefined) {
      if (typeof aliases === 'string') {
        const arr = aliases.split(',').map((s: string) => s.trim()).filter(Boolean);
        aliasesToSave = JSON.stringify(arr);
      } else if (Array.isArray(aliases)) {
        aliasesToSave = JSON.stringify(aliases);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        aliases: aliasesToSave
      }
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update product", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    await prisma.product.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete product", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
