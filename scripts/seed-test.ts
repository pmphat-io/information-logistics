import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

async function main() {
  console.log("Đang tạo dữ liệu mẫu...");

  // Xóa dữ liệu cũ nếu muốn (tùy chọn)
  // await prisma.productSource.deleteMany();
  // await prisma.product.deleteMany();

  // 1. Exact match item
  const p1Name = "Bạc đạn 6023";
  await prisma.product.upsert({
    where: { normalizedName: normalize(p1Name) },
    update: {},
    create: {
      name: p1Name,
      normalizedName: normalize(p1Name),
      sources: {
        create: [
          {
            type: "customs-declaration",
            referenceCode: "HQ-2023-001",
            declaredAt: "2023-10-01",
            quantity: 500,
            unit: "Cái",
            unitWeightKg: 0.15,
            totalWeightKg: 75,
            origin: "Nhật Bản",
            brand: "NSK",
            hsCode: "84821000",
            notes: "Nhập khẩu chính ngạch"
          }
        ]
      }
    }
  });

  // 2. Ambiguous items (Similar names)
  const p2Name = "Bulong M8 20mm (Inox 304)";
  await prisma.product.upsert({
    where: { normalizedName: normalize(p2Name) },
    update: {},
    create: {
      name: p2Name,
      normalizedName: normalize(p2Name),
      aliases: "Bulong M8 20, Bu lông M8 20",
      sources: {
        create: [
          {
            type: "manual",
            referenceCode: "CS-001",
            quantity: 10000,
            unit: "Con",
            unitWeightKg: 0.01,
            totalWeightKg: 100,
            origin: "Việt Nam",
            brand: "VinaFasten",
            hsCode: "73181510",
          }
        ]
      }
    }
  });

  const p3Name = "Bulong M8 20mm (Thép mạ kẽm)";
  await prisma.product.upsert({
    where: { normalizedName: normalize(p3Name) },
    update: {},
    create: {
      name: p3Name,
      normalizedName: normalize(p3Name),
      aliases: "Bulong M8 20, Bu lông M8 20, Bulong M8x20",
      sources: {
        create: [
          {
            type: "manual",
            referenceCode: "CS-002",
            quantity: 5000,
            unit: "Con",
            unitWeightKg: 0.012,
            totalWeightKg: 60,
            origin: "Trung Quốc",
            brand: "Đông Quan",
            hsCode: "73181510",
          }
        ]
      }
    }
  });

  console.log("Đã tạo dữ liệu mẫu thành công.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
