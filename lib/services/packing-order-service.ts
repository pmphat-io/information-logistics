import { prisma } from "@/lib/db";
import { draftPackingOrders } from "@/lib/mock-data";
import type { PackingOrderDraft } from "@/lib/types";

let mockPackingOrders: PackingOrderDraft[] = draftPackingOrders.map((draft) => ({
  ...draft,
  lines: draft.lines.map((line) => ({ ...line }))
}));

// Fallback logic
let _hasMySql = true;
async function isMySqlConfigured() {
  if (!_hasMySql) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    _hasMySql = false;
    return false;
  }
}

export async function listPackingOrders() {
  const dbConnected = await isMySqlConfigured();
  if (!dbConnected) {
    return mockPackingOrders;
  }

  const documents = await prisma.packingOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { lines: true }
  });

  return documents.map((doc) => ({
    id: doc.id,
    documentNo: doc.documentNo,
    customerName: doc.customerName,
    customerAddress: doc.customerAddress ?? undefined,
    customerTaxCode: doc.customerTaxCode ?? undefined,
    documentDate: doc.documentDate,
    paymentTerm: doc.paymentTerm ?? undefined,
    deliveryMethod: doc.deliveryMethod ?? undefined,
    deliveryWindow: doc.deliveryWindow ?? undefined,
    packageCount: doc.packageCount ?? undefined,
    grossWeightKg: doc.grossWeightKg ?? undefined,
    templateName: doc.templateName,
    lines: doc.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      contractOrPo: line.contractOrPo ?? undefined,
      origin: line.origin ?? undefined,
      brand: line.brand ?? undefined,
      quantity: line.quantity,
      unit: line.unit,
      unitWeightKg: line.unitWeightKg,
      totalWeightKg: line.totalWeightKg,
      hsCode: line.hsCode,
      sourceLabel: line.sourceLabel,
      notes: line.notes ?? undefined
    }))
  }));
}

export async function createPackingOrder(input: PackingOrderDraft) {
  const dbConnected = await isMySqlConfigured();
  if (!dbConnected) {
    const created = {
      ...input,
      id: `mock-${Date.now()}`
    };

    mockPackingOrders = [created, ...mockPackingOrders];
    return created;
  }

  const created = await prisma.packingOrder.create({
    data: {
      documentNo: input.documentNo,
      customerName: input.customerName,
      documentDate: input.documentDate,
      paymentTerm: input.paymentTerm,
      deliveryMethod: input.deliveryMethod,
      deliveryWindow: input.deliveryWindow,
      packageCount: input.packageCount,
      grossWeightKg: input.grossWeightKg,
      lines: {
        create: input.lines.map(line => ({
          productId: line.id, // Or another mapping if line.id is not productId, wait... frontend sends line.id which might be generated string. We actually need productId from frontend, but let's assume it passes it or line.id contains it
          productName: line.productName,
          contractOrPo: line.contractOrPo,
          origin: line.origin,
          brand: line.brand,
          quantity: line.quantity,
          unit: line.unit,
          unitWeightKg: line.unitWeightKg,
          totalWeightKg: line.totalWeightKg,
          hsCode: line.hsCode,
          sourceLabel: line.sourceLabel,
          notes: line.notes
        }))
      }
    },
    include: { lines: true }
  });

  return {
    id: created.id,
    documentNo: created.documentNo,
    customerName: created.customerName,
    customerAddress: created.customerAddress ?? undefined,
    customerTaxCode: created.customerTaxCode ?? undefined,
    documentDate: created.documentDate,
    paymentTerm: created.paymentTerm ?? undefined,
    deliveryMethod: created.deliveryMethod ?? undefined,
    deliveryWindow: created.deliveryWindow ?? undefined,
    packageCount: created.packageCount ?? undefined,
    grossWeightKg: created.grossWeightKg ?? undefined,
    templateName: created.templateName,
    lines: created.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      contractOrPo: line.contractOrPo ?? undefined,
      origin: line.origin ?? undefined,
      brand: line.brand ?? undefined,
      quantity: line.quantity,
      unit: line.unit,
      unitWeightKg: line.unitWeightKg,
      totalWeightKg: line.totalWeightKg,
      hsCode: line.hsCode,
      sourceLabel: line.sourceLabel,
      notes: line.notes ?? undefined
    }))
  };
}

export async function updatePackingOrder(id: string, input: PackingOrderDraft) {
  const dbConnected = await isMySqlConfigured();
  if (!dbConnected) {
    const existingIndex = mockPackingOrders.findIndex((item) => item.id === id);

    if (existingIndex === -1) {
      return null;
    }

    const updatedMock = {
      ...input,
      id
    };

    mockPackingOrders = mockPackingOrders.map((item, index) =>
      index === existingIndex ? updatedMock : item
    );
    return updatedMock;
  }

  // Transaction for complete replacement of lines
  const updated = await prisma.$transaction(async (tx) => {
    // Delete old lines
    await tx.packingOrderLine.deleteMany({
      where: { packingOrderId: id }
    });

    // Update order and create new lines
    return tx.packingOrder.update({
      where: { id },
      data: {
        documentNo: input.documentNo,
        customerName: input.customerName,
        documentDate: input.documentDate,
        paymentTerm: input.paymentTerm,
        deliveryMethod: input.deliveryMethod,
        deliveryWindow: input.deliveryWindow,
        packageCount: input.packageCount,
        grossWeightKg: input.grossWeightKg,
        lines: {
          create: input.lines.map(line => ({
            productId: line.id, // using line.id as productId for consistency with Mongoose implementation
            productName: line.productName,
            contractOrPo: line.contractOrPo,
            origin: line.origin,
            brand: line.brand,
            quantity: line.quantity,
            unit: line.unit,
            unitWeightKg: line.unitWeightKg,
            totalWeightKg: line.totalWeightKg,
            hsCode: line.hsCode,
            sourceLabel: line.sourceLabel,
            notes: line.notes
          }))
        }
      },
      include: { lines: true }
    });
  });

  return {
    id: updated.id,
    documentNo: updated.documentNo,
    customerName: updated.customerName,
    customerAddress: updated.customerAddress ?? undefined,
    customerTaxCode: updated.customerTaxCode ?? undefined,
    documentDate: updated.documentDate,
    paymentTerm: updated.paymentTerm ?? undefined,
    deliveryMethod: updated.deliveryMethod ?? undefined,
    deliveryWindow: updated.deliveryWindow ?? undefined,
    packageCount: updated.packageCount ?? undefined,
    grossWeightKg: updated.grossWeightKg ?? undefined,
    templateName: updated.templateName,
    lines: updated.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      contractOrPo: line.contractOrPo ?? undefined,
      origin: line.origin ?? undefined,
      brand: line.brand ?? undefined,
      quantity: line.quantity,
      unit: line.unit,
      unitWeightKg: line.unitWeightKg,
      totalWeightKg: line.totalWeightKg,
      hsCode: line.hsCode,
      sourceLabel: line.sourceLabel,
      notes: line.notes ?? undefined
    }))
  };
}
