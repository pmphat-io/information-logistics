# Backend Handoff - Information Logistics

## 1. Muc tieu tai lieu

Tai lieu nay ghi lai trang thai backend hien tai de backend dev moi co the:

- hieu stack va contract dang dung
- biet luong du lieu chinh cua he thong
- tiep tuc Phase A va Phase B ma khong doan sai huong

## 2. Stack chinh thuc

Backend hien tai duoc xem la chinh thuc theo huong:

- `Next.js App Router API`
- `Prisma`
- `MySQL`
- `xlsx`

Luu y:

- khong coi `MongoDB/Mongoose` la huong hien tai nua
- neu tai lieu cu con nhac MongoDB thi do la lich su

## 3. Muc tieu nghiep vu backend

Backend phuc vu 4 nhom luong chinh:

1. Quan ly product va product source
2. Import du lieu tu:
   - text thu cong
   - base catalog excel
   - packing list excel
3. Tra cuu san pham va nguon du lieu
4. Tao, luu, cap nhat va export packing order

## 4. Luong du lieu tong quat

### 4.1. Luong admin import

1. Frontend `/admin` nhan input text hoac file
2. Goi `POST /api/imports/analyze`
3. Backend parse va tra ve `mappedRows` + `importContext`
4. Frontend cho nguoi dung review/chinh sua
5. Goi `POST /api/imports/confirm`
6. Backend create/update `Product` va `ProductSource`
7. Frontend reload danh muc

### 4.2. Luong dashboard

1. Frontend `/` goi `GET /api/dashboard/stats`
2. Frontend goi `GET /api/products`
3. Khi can, frontend goi `GET /api/products/:id/sources`

### 4.3. Luong search va packing order

1. Frontend `/search` nhap list ten hang
2. Goi `GET /api/products?q=...`
3. Goi `GET /api/products/:id/sources` de resolve source
4. Tao packing draft o client
5. Goi `POST /api/packing-orders` hoac `PUT /api/packing-orders/:id`
6. Goi `POST /api/packing-orders/export`

## 5. Database schema hien tai

Nguon su that:

- [prisma/schema.prisma](D:/Information-logistics/prisma/schema.prisma:1)

### 5.1. Product

Truong chinh:

- `id`
- `name`
- `normalizedName`
- `contractOrPo`
- `aliases`
- `createdAt`
- `updatedAt`

Quan he:

- `sources -> ProductSource[]`

### 5.2. ProductSource

Truong chinh:

- `id`
- `productId`
- `type`
- `referenceCode`
- `declaredAt`
- `quantity`
- `unit`
- `totalWeightKg`
- `unitWeightKg`
- `origin`
- `brand`
- `hsCode`
- `notes`
- `metadata`
- `createdAt`

Ghi chu:

- `type` hien dung `manual` hoac `customs-declaration`
- `metadata` luu thong tin chung cua packing list duoi dang JSON string neu co
- `unitWeightKg` la gia tri trong luong chinh duoc uu tien su dung
- `totalWeightKg` la gia tri phu, duoc suy ra tu `unitWeightKg * quantity` hoac quy doi nguoc ve `unitWeightKg` khi dau vao chi co tong trong luong

### 5.2.1. Quy tac trong luong

Can coi day la quy tac nguon su that:

- `unitWeightKg` la truong quan trong nhat
- neu dau vao chi co `totalWeightKg` va `quantity` thi backend phai quy doi ve `unitWeightKg = totalWeightKg / quantity`
- neu dau vao chi co `unitWeightKg` thi backend suy ra `totalWeightKg = unitWeightKg * quantity`
- voi import loai 1 hien tai, `quantity` mac dinh la `1`, nen `totalWeightKg = unitWeightKg`

### 5.3. ImportBatch

Truong chinh:

- `id`
- `type`
- `fileName`
- `importedAt`
- `documentCode`
- `documentDate`
- `rowCount`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

### 5.4. PackingOrder

Truong chinh:

- `id`
- `documentNo`
- `customerName`
- `customerAddress`
- `customerTaxCode`
- `documentDate`
- `paymentTerm`
- `deliveryMethod`
- `deliveryWindow`
- `packageCount`
- `grossWeightKg`
- `templateName`
- `createdAt`
- `updatedAt`

Quan he:

- `lines -> PackingOrderLine[]`

### 5.5. PackingOrderLine

Truong chinh:

- `id`
- `packingOrderId`
- `productId`
- `productName`
- `contractOrPo`
- `origin`
- `brand`
- `quantity`
- `unit`
- `unitWeightKg`
- `totalWeightKg`
- `hsCode`
- `sourceLabel`
- `notes`

### 5.6. SystemStat

Dung de luu:

- `searchCount`

Model nay dang duoc dung cho dashboard stats.

## 6. Cac route backend hien tai

### 6.1. Health

- `GET /api/health`

### 6.2. Admin

- `POST /api/admin/unlock`

Ghi chu:

- hien tai la auth nhe, chua phai session auth day du

### 6.3. Dashboard

- `GET /api/dashboard/stats`

### 6.4. Product va source

- `GET /api/products`
- `POST /api/products`
- `PUT /api/products/[id]`
- `DELETE /api/products/[id]`
- `GET /api/products/[id]/sources`
- `PUT /api/product-sources/[id]`

### 6.5. Import

- `POST /api/imports/analyze`
- `POST /api/imports/confirm`
- `POST /api/imports/base-catalog`
- `POST /api/imports/lookup-list`
- `POST /api/imports/packing-list`

Luu y:

- frontend moi dang uu tien `analyze -> confirm`
- cac route import truc tiep van ton tai, nhung can xac dinh vai tro ro hon trong Phase B

### 6.6. Packing order

- `GET /api/packing-orders`
- `POST /api/packing-orders`
- `PUT /api/packing-orders/[id]`
- `POST /api/packing-orders/export`

## 7. Contract quan trong

### 7.1. `GET /api/products`

Response can giu on dinh cho frontend:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Bulong M8 20",
      "normalizedName": "bulong m8 20",
      "contractOrPo": "PO-001",
      "aliases": ["Bu long M8x20"],
      "baseInfo": {},
      "declarationHistory": []
    }
  ],
  "count": 1,
  "query": "bulong"
}
```

### 7.2. `GET /api/products/[id]/sources`

Response can giu on dinh:

```json
{
  "id": "uuid",
  "name": "Bulong M8 20",
  "contractOrPo": "PO-001",
  "sources": []
}
```

### 7.3. `POST /api/imports/analyze`

Can tra ve:

- `importContext`
- `mappedRows`
- thong tin du de frontend review va resolve

Frontend `/admin` dang phu thuoc rat manh vao shape nay.

### 7.4. `POST /api/imports/confirm`

Input hien tai gom:

- `importContext`
- `commonContext`
- `rows`

Moi row co the mang:

- `action`
- `productId`
- `name`
- `contractOrPo`
- `origin`
- `brand`
- `hsCode`
- `unitWeightKg`
- `quantity`
- `totalWeightKg`
- `unit`
- `notes`
- `sourceType`

Ghi chu quan trong:

- backend nen uu tien tin `unitWeightKg`
- `totalWeightKg` khong nen duoc coi la nguon su that neu da co `unitWeightKg`

### 7.5. Packing order export

`POST /api/packing-orders/export` nhan:

- header packing order
- `lines`

Va tra ve:

- file `.xls`

## 8. File backend can doc truoc khi sua

Backend dev nen doc theo thu tu:

1. [prisma/schema.prisma](D:/Information-logistics/prisma/schema.prisma:1)
2. [lib/db.ts](D:/Information-logistics/lib/db.ts:1)
3. [lib/types.ts](D:/Information-logistics/lib/types.ts:1)
4. [lib/services/product-service.ts](D:/Information-logistics/lib/services/product-service.ts:1)
5. [lib/services/import-service.ts](D:/Information-logistics/lib/services/import-service.ts:1)
6. [lib/services/import-workflow-service.ts](D:/Information-logistics/lib/services/import-workflow-service.ts:1)
7. [lib/services/packing-order-service.ts](D:/Information-logistics/lib/services/packing-order-service.ts:1)
8. [app/api/imports/analyze/route.ts](D:/Information-logistics/app/api/imports/analyze/route.ts:1)
9. [app/api/imports/confirm/route.ts](D:/Information-logistics/app/api/imports/confirm/route.ts:1)
10. [app/api/products/route.ts](D:/Information-logistics/app/api/products/route.ts:1)

## 9. Trang thai ky thuat hien tai

Da xac minh:

- `npm run typecheck` pass
- `npm run build` pass

Canh bao:

- import logic chua duoc harden tren du lieu that
- search aliases/ranking chua du manh
- export Excel chua test day du voi dataset dai
- admin unlock chua la auth/session dung nghia

## 10. Cong viec backend uu tien tiep theo

### Phase A

1. Chot tai lieu backend theo codebase hien tai
2. Chot setup env va DB local
3. Chot script Prisma / seed

### Phase B

1. Hoan thien `imports/analyze`
2. Hoan thien `imports/confirm`
3. Them validate va duplicate control

### Phase C

1. Nang search theo `aliases`
2. Hoan thien product/source CRUD
3. Giam false negative cho ten gan dung

### Phase D

1. On dinh packing order save/update
2. On dinh export Excel
3. Test end-to-end voi du lieu that

## 11. Checklist truoc khi merge backend

1. `npm run typecheck -- --pretty false`
2. `npm run build`
3. Kiem tra route shape khong vo frontend
4. Kiem tra numeric field khong gui `null` vao field bat buoc
5. Kiem tra dynamic route params dung kieu cua Next hien tai
6. Cap nhat tai lieu neu contract API doi
