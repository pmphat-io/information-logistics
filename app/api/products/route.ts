import { NextRequest, NextResponse } from "next/server";

import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  
  // Track searches silently (only when an actual search query is made)
  if (query && query.trim() !== "") {
    try {
      await prisma.systemStat.upsert({
        where: { id: "singleton" },
        update: { searchCount: { increment: 1 } },
        create: { id: "singleton", searchCount: 1 }
      });
    } catch (e) {
      // ignore
    }
  }

  const products = await listProducts(query);

  return NextResponse.json({
    items: products,
    count: products.length,
    query: query ?? null
  });
}

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();
    
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");
    const { normalizeInput } = await import("@/lib/services/product-service");

    const savedProducts = [];

    for (const p of products) {
      if (!p.name) continue;
      const normalizedName = normalizeInput(p.name);
      
      let product = await prisma.product.findUnique({
        where: { normalizedName }
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: p.name,
            normalizedName,
            contractOrPo: p.contractOrPo
          }
        });
      }

      const source = await prisma.productSource.create({
        data: {
          productId: product.id,
          type: "manual",
          referenceCode: "MANUAL_INPUT",
          quantity: p.quantity || 1,
          unit: p.unit || "Cái",
          unitWeightKg: p.unitWeightKg || 0,
          totalWeightKg: p.totalWeightKg || 0,
          origin: p.origin,
          brand: p.brand,
          hsCode: p.hsCode,
          description: p.description,
          dimensions: p.dimensions,
          notes: p.notes
        } as any
      });
      
      savedProducts.push({ product, source });
    }

    return NextResponse.json({ success: true, count: savedProducts.length });
  } catch (error: any) {
    console.error("Failed to create products:", error);
    return NextResponse.json({ error: "Failed to create products" }, { status: 500 });
  }
}
