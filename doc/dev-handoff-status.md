# Dev Handoff - Information Logistics

## 1. Muc tieu tai lieu

Tai lieu nay dung de:

- ghi lai trang thai hien tai cua project
- giup dev moi tiep quan nhanh
- xac dinh phase dang dung trong roadmap
- mo ta nhung phan da on dinh va nhung phan con dang do

## 2. Trang thai hien tai

Project hien dang o giai doan:

- `frontend workflow da dung duoc`
- `backend contract da build duoc`
- `Phase A cua roadmap chua dong hoan toan`

### Da hoan thanh

- app chay duoc tren `Next.js App Router`
- frontend da tach thanh 3 man hinh chinh:
  - `/`
  - `/search`
  - `/admin`
- backend da chot theo huong `Prisma + MySQL`
- `typecheck` pass
- `build` pass
- co luong import `analyze -> confirm`
- co luong search, product/source management co ban
- co luong save/update/export packing order
- co bo tai lieu handoff, roadmap, playbook

### Chua hoan thanh

- chuan hoa toan bo tai lieu cu sang `Prisma + MySQL`
- hardening import/confirm tren du lieu that
- nang chat luong search cho cac case ten gan dung
- CRUD day du cho packing order va source
- export Excel voi danh sach dai hon template
- auth/session admin dung nghia
- polish UI theo mockup moi

## 3. Phase dang lam

Roadmap hien tai uu tien theo thu tu:

1. Chot DB + cap nhat tai lieu ky thuat
2. Hoan thien import/confirm du lieu
3. Nang search va quan ly product/source
4. On dinh packing order + export Excel
5. Moi polish UI theo mockup

Trang thai hien tai:

- dang o cuoi `Phase A`
- sap chuyen sang `Phase B`

## 4. Cau truc source hien tai

### App pages

- [app/page.tsx](D:/Information-logistics/app/page.tsx:1)
- [app/search/page.tsx](D:/Information-logistics/app/search/page.tsx:1)
- [app/admin/page.tsx](D:/Information-logistics/app/admin/page.tsx:1)
- [app/layout.tsx](D:/Information-logistics/app/layout.tsx:1)
- [app/globals.css](D:/Information-logistics/app/globals.css:1)

### API routes hien dang dung

- [app/api/admin/unlock/route.ts](D:/Information-logistics/app/api/admin/unlock/route.ts:1)
- [app/api/dashboard/stats/route.ts](D:/Information-logistics/app/api/dashboard/stats/route.ts:1)
- [app/api/products/route.ts](D:/Information-logistics/app/api/products/route.ts:1)
- [app/api/products/[id]/route.ts](D:/Information-logistics/app/api/products/[id]/route.ts:1)
- [app/api/products/[id]/sources/route.ts](D:/Information-logistics/app/api/products/[id]/sources/route.ts:1)
- [app/api/product-sources/[id]/route.ts](D:/Information-logistics/app/api/product-sources/[id]/route.ts:1)
- [app/api/imports/analyze/route.ts](D:/Information-logistics/app/api/imports/analyze/route.ts:1)
- [app/api/imports/confirm/route.ts](D:/Information-logistics/app/api/imports/confirm/route.ts:1)
- [app/api/imports/base-catalog/route.ts](D:/Information-logistics/app/api/imports/base-catalog/route.ts:1)
- [app/api/imports/lookup-list/route.ts](D:/Information-logistics/app/api/imports/lookup-list/route.ts:1)
- [app/api/imports/packing-list/route.ts](D:/Information-logistics/app/api/imports/packing-list/route.ts:1)
- [app/api/packing-orders/route.ts](D:/Information-logistics/app/api/packing-orders/route.ts:1)
- [app/api/packing-orders/[id]/route.ts](D:/Information-logistics/app/api/packing-orders/[id]/route.ts:1)
- [app/api/packing-orders/export/route.ts](D:/Information-logistics/app/api/packing-orders/export/route.ts:1)
- [app/api/health/route.ts](D:/Information-logistics/app/api/health/route.ts:1)

### Database va models

- [prisma/schema.prisma](D:/Information-logistics/prisma/schema.prisma:1)
- [lib/db.ts](D:/Information-logistics/lib/db.ts:1)
- [lib/types.ts](D:/Information-logistics/lib/types.ts:1)

### Service layer

- [lib/services/product-service.ts](D:/Information-logistics/lib/services/product-service.ts:1)
- [lib/services/import-service.ts](D:/Information-logistics/lib/services/import-service.ts:1)
- [lib/services/import-workflow-service.ts](D:/Information-logistics/lib/services/import-workflow-service.ts:1)
- [lib/services/packing-order-service.ts](D:/Information-logistics/lib/services/packing-order-service.ts:1)

### Excel logic

- [lib/excel/parsers.ts](D:/Information-logistics/lib/excel/parsers.ts:1)
- [lib/excel/template.ts](D:/Information-logistics/lib/excel/template.ts:1)
- [lib/excel/utils.ts](D:/Information-logistics/lib/excel/utils.ts:1)
- [templates/inv-pkl-template.xls](D:/Information-logistics/templates/inv-pkl-template.xls:1)

## 5. Du lieu va stack chinh thuc

Stack hien tai can coi la nguon su that:

- `Next.js 16`
- `React 19`
- `Prisma`
- `MySQL`
- `xlsx`

Luu y:

- cac tham chieu cu ve `MongoDB/Mongoose` khong con la huong chinh
- neu tai lieu nao con nhac MongoDB thi can coi do la tai lieu cu

## 6. Cac luong nghiep vu dang dung

### Luong dashboard

- tai thong ke he thong
- tim va xem danh sach hang hoa
- xem master-detail cua product va sources

### Luong admin

- mo khoa quan tri bang mat khau
- nhap text thu cong
- import file base catalog
- import file packing list
- parse du lieu thanh draft qua `imports/analyze`
- review draft rows
- xac nhan luu qua `imports/confirm`
- sua / xoa product va cap nhat source

### Luong search

- nhap danh sach hang hoa can tra cuu
- he thong auto search
- resolve dong ambiguous / not-found
- chon source
- tao packing order draft
- save/update draft
- export Excel

## 7. Rui ro va diem can canh bao

### 7.1. Search chua du manh

Case ten gan dung nhu:

- bulong m8 20mm
- bu long M8x20
- bolt m8 20

co the chua duoc rank tot neu aliases va normalized search chua du.

### 7.2. Import chua duoc harden

- validate file/cot chua sau
- duplicate control chua chat
- metadata packing list chua test rong tren du lieu that

### 7.3. Export Excel can test them

- chua test day du case danh sach dai hon template
- chua test day du case field thieu

### 7.4. Auth admin moi o muc nhe

- unlock admin hien chua phai auth/session hoan chinh

## 8. Yeu cau truoc khi code tiep

Moi dev tiep quan nen chay:

```bash
cmd /c npm run typecheck -- --pretty false
cmd /c npm run build
```

Neu dong vao DB, can kiem tra them:

```bash
cmd /c npx prisma generate
```

Va can doc:

1. [doc/README.md](D:/Information-logistics/doc/README.md:1)
2. [doc/backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)
3. [doc/execution-roadmap.md](D:/Information-logistics/doc/execution-roadmap.md:1)
4. [doc/development-playbook.md](D:/Information-logistics/doc/development-playbook.md:1)

## 9. Moc ban giao tiep theo

Moc ban giao hop ly tiep theo la sau khi xong:

- chot xong tai lieu Phase A
- hardening xong `imports/analyze` va `imports/confirm`

Khi do can cap nhat lai:

- [doc/dev-handoff-status.md](D:/Information-logistics/doc/dev-handoff-status.md:1)
- [doc/backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)
- [README.md](D:/Information-logistics/README.md:1)
