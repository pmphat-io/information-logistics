import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const productCount = await prisma.product.count();
    const sourceCount = await prisma.productSource.count();
    const packingOrderCount = await prisma.packingOrder.count();
    
    // Get search count
    let searchCount = 0;
    try {
      const stat = await prisma.systemStat.findUnique({ where: { id: "singleton" } });
      if (stat) searchCount = stat.searchCount;
    } catch (e) {
      // ignore
    }

    return NextResponse.json({
      productCount,
      sourceCount,
      searchCount,
      packingOrderCount
    });
  } catch (e: any) {
    console.error("Failed to fetch dashboard stats:", e);
    return NextResponse.json({ error: "Lỗi tải thống kê" }, { status: 500 });
  }
}
