import type {
  ImportQueue,
  PackingOrderDraft,
  ProductRecord,
  SearchDemoState
} from "@/lib/types";

function unitWeight(totalWeightKg: number, quantity: number) {
  return Number((totalWeightKg / quantity).toFixed(3));
}

const faucetBaseWeight = unitWeight(5.02, 2);
const sealantWeight = unitWeight(9.25, 25);

export const baseCatalogEntries: ProductRecord[] = [
  {
    id: "prd-001",
    name: "Voi cam ung A911 (1 bo = 1 cai)",
    normalizedName: "voi cam ung a911 1 bo 1 cai",
    contractOrPo: "VNS-MA-NAP-20260501-253",
    baseInfo: {
      id: "src-base-001",
      type: "manual",
      referenceCode: "BASE-2026-001",
      quantity: 1,
      unit: "Bo",
      totalWeightKg: faucetBaseWeight,
      unitWeightKg: faucetBaseWeight,
      origin: "Vietnam",
      brand: "Caesar",
      hsCode: "84818099",
      notes: "Nhap tu danh sach thong tin co so do nhan vien thu thap."
    },
    declarationHistory: [
      {
        id: "src-dec-001",
        type: "customs-declaration",
        referenceCode: "PL-00000151",
        declaredAt: "2026-06-05",
        quantity: 2,
        unit: "Bo",
        totalWeightKg: 5.02,
        unitWeightKg: faucetBaseWeight,
        origin: "Vietnam",
        brand: "Caesar",
        hsCode: "84818099",
        notes: "Lay tu packing list import."
      },
      {
        id: "src-dec-002",
        type: "customs-declaration",
        referenceCode: "PL-00000152",
        declaredAt: "2026-06-18",
        quantity: 3,
        unit: "Bo",
        totalWeightKg: 7.53,
        unitWeightKg: unitWeight(7.53, 3),
        origin: "Vietnam",
        brand: "Caesar",
        hsCode: "84818099"
      }
    ]
  },
  {
    id: "prd-002",
    name: "Chat Silicon Sealant 4588T White (4588TW)",
    normalizedName: "chat silicon sealant 4588t white 4588tw",
    contractOrPo: "MA-PO-26-NAP-17",
    declarationHistory: [
      {
        id: "src-dec-003",
        type: "customs-declaration",
        referenceCode: "PL-00000151",
        declaredAt: "2026-06-05",
        quantity: 25,
        unit: "Chai",
        totalWeightKg: 9.25,
        unitWeightKg: sealantWeight,
        origin: "Thailand",
        brand: "ShinEtsu",
        hsCode: "35069900",
        notes: "300ml / 370 gram / 1 chai"
      }
    ]
  },
  {
    id: "prd-003",
    name: "Voi bep SFV29",
    normalizedName: "voi bep sfv29",
    contractOrPo: "VNS-MA-NAP-20260501-253",
    baseInfo: {
      id: "src-base-003",
      type: "manual",
      referenceCode: "BASE-2026-003",
      quantity: 2,
      unit: "Cai",
      totalWeightKg: 2.2,
      unitWeightKg: unitWeight(2.2, 2),
      origin: "Vietnam",
      brand: "INAX",
      hsCode: "84818099",
      notes: "Khong co them thong tin lich su ngoai lan khai da co."
    },
    declarationHistory: [
      {
        id: "src-dec-004",
        type: "customs-declaration",
        referenceCode: "PL-00000151",
        declaredAt: "2026-06-05",
        quantity: 2,
        unit: "Cai",
        totalWeightKg: 2.2,
        unitWeightKg: unitWeight(2.2, 2),
        origin: "Vietnam",
        brand: "INAX",
        hsCode: "84818099"
      }
    ]
  }
];

export const searchDemo: SearchDemoState = {
  query: "voi cam ung a911",
  matchedName: "Voi cam ung A911 (1 bo = 1 cai)",
  suggestions: [
    {
      id: "sug-001",
      productName: "Voi cam ung A911 (1 bo = 1 cai)",
      score: 100,
      mode: "exact",
      sources: [
        baseCatalogEntries[0].baseInfo!,
        ...baseCatalogEntries[0].declarationHistory
      ]
    },
    {
      id: "sug-002",
      productName: "Voi bep SFV29",
      score: 68,
      mode: "similar",
      sources: [
        baseCatalogEntries[2].baseInfo!,
        ...baseCatalogEntries[2].declarationHistory
      ]
    }
  ]
};

export const importQueues: ImportQueue[] = [
  {
    id: "imp-001",
    type: "packing-list",
    title: "Import Packing List",
    acceptedFiles: ".xls, .xlsx",
    description:
      "Doc file packing list de tao mot lan khai hai quan va sinh ra cac dong lich su theo ma packing list + ngay khai.",
    mappedColumns: [
      "Ten hang",
      "Hop dong/PO",
      "Xuat xu",
      "Maker/Brand",
      "So luong",
      "Don vi tinh",
      "Trong luong N.W",
      "HS Code",
      "Thong tin cung cap them"
    ]
  },
  {
    id: "imp-002",
    type: "lookup-list",
    title: "Import Danh Sach Tra Cuu",
    acceptedFiles: ".xlsx",
    description:
      "Nap danh sach hang can tra cuu theo lo, giup xu ly nhieu dong trong mot phien.",
    mappedColumns: ["Ten hang", "So luong can lap packing", "Ghi chu"]
  },
  {
    id: "imp-003",
    type: "base-catalog",
    title: "Import Thong Tin Co So",
    acceptedFiles: ".xlsx",
    description:
      "Nap du lieu co so cho cac hang hoa chua co packing list nhung da duoc nhan vien thu thap thong tin.",
    mappedColumns: [
      "Ten hang",
      "Xuat xu",
      "Thuong hieu",
      "So luong",
      "Don vi tinh",
      "Tong trong luong",
      "HS Code",
      "Ghi chu"
    ]
  }
];

export const draftPackingOrders: PackingOrderDraft[] = [
  {
    id: "draft-001",
    documentNo: "00000152",
    customerName: "Cong ty TNHH Viet Nam Nisshin Seifun",
    documentDate: "2026-06-23",
    paymentTerm: "Chuyen khoan",
    deliveryMethod: "DAP",
    deliveryWindow: "Trong thang 06/2026",
    packageCount: "4",
    grossWeightKg: "25.50",
    lines: [
      {
        id: "line-001",
        productName: "Voi cam ung A911 (1 bo = 1 cai)",
        contractOrPo: "VNS-MA-NAP-20260501-253",
        origin: "Vietnam",
        brand: "Caesar",
        quantity: 4,
        unit: "Bo",
        unitWeightKg: faucetBaseWeight,
        totalWeightKg: Number((faucetBaseWeight * 4).toFixed(2)),
        hsCode: "84818099",
        sourceLabel: "Packing list PL-00000151",
        notes: "Thong tin tu lan khai da chon."
      },
      {
        id: "line-002",
        productName: "Chat Silicon Sealant 4588T White (4588TW)",
        contractOrPo: "MA-PO-26-NAP-17",
        origin: "Thailand",
        brand: "ShinEtsu",
        quantity: 10,
        unit: "Chai",
        unitWeightKg: sealantWeight,
        totalWeightKg: Number((sealantWeight * 10).toFixed(2)),
        hsCode: "35069900",
        sourceLabel: "Packing list PL-00000151",
        notes: "300ml / 370 gram / 1 chai"
      }
    ]
  }
];
