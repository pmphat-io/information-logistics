# Development Playbook - Information Logistics

## 1. Muc tieu

Tai lieu nay dung nhu so tay phat trien de nguoi ve sau co the:

- biet bat dau tu dau
- biet viec nao dang dang do
- biet can kiem tra gi truoc khi code
- tiep tuc cong viec ma khong pha vo phan da on dinh

## 2. Trang thai codebase hien tai

Codebase hien tai da vuot khoi prototype ban dau va co cac nhom chuc nang sau:

- dashboard read-only o `/`
- tra cuu hang hoa va tao packing order o `/search`
- admin nhap/sua/xoa du lieu o `/admin`
- API voi `Prisma + MySQL`
- import packing list / base catalog / confirm import
- export packing list ra Excel

## 3. Quy tac lam viec trong repo nay

### 3.1. Truoc khi sua code

Can kiem tra:

1. `npm run typecheck`
2. `npm run build`
3. file tai lieu lien quan trong `doc`

### 3.2. Neu sua API

Can kiem tra:

1. frontend dang goi route nao
2. response shape co bi doi khong
3. Prisma schema co can sua theo khong
4. tai lieu handoff co can cap nhat khong

### 3.3. Neu sua frontend

Can kiem tra:

1. co pha vo contract API khong
2. state dang duoc dung o `/`, `/search`, `/admin` nhu the nao
3. co can bo sung default value de tranh hydration/type issue khong

## 4. Thu tu doc code de tiep quan

Nguoi moi vao nen doc theo thu tu nay:

1. [README.md](D:/Information-logistics/README.md:1)
2. [doc/README.md](D:/Information-logistics/doc/README.md:1)
3. [doc/backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)
4. [doc/dev-handoff-status.md](D:/Information-logistics/doc/dev-handoff-status.md:1)
5. [prisma/schema.prisma](D:/Information-logistics/prisma/schema.prisma:1)
6. [app/api/products/route.ts](D:/Information-logistics/app/api/products/route.ts:1)
7. [app/api/imports/analyze/route.ts](D:/Information-logistics/app/api/imports/analyze/route.ts:1)
8. [app/api/imports/confirm/route.ts](D:/Information-logistics/app/api/imports/confirm/route.ts:1)
9. [app/api/packing-orders/export/route.ts](D:/Information-logistics/app/api/packing-orders/export/route.ts:1)
10. [app/page.tsx](D:/Information-logistics/app/page.tsx:1)
11. [app/search/page.tsx](D:/Information-logistics/app/search/page.tsx:1)
12. [app/admin/page.tsx](D:/Information-logistics/app/admin/page.tsx:1)

## 5. Cac luong nghiep vu can duoc bao toan

### 5.1. Luong admin import

1. Nguoi dung unlock admin
2. Chon input text hoac file
3. Goi `imports/analyze`
4. Review draft rows
5. Chon create/update
6. Goi `imports/confirm`
7. Reload danh muc san pham

Neu sua code lien quan, phai test lai luong nay.

### 5.2. Luong search va packing order

1. Nguoi dung nhap list hang hoa
2. He thong tim va goi y
3. Nguoi dung resolve cac dong ambiguous/not-found
4. Chon source phu hop
5. Tao packing order line
6. Luu draft
7. Export Excel

Neu sua search, source, hoac export, phai test lai luong nay.

### 5.3. Luong dashboard

1. Tai thong ke
2. Tai danh muc hang hoa
3. Tim nhanh theo query
4. Xem detail theo master-detail

## 6. Checklist moi lan truoc khi merge mot nhom thay doi

### Backend checklist

1. Prisma schema hop le
2. API response shape khong vo frontend
3. Numeric field khong gui `null` vao field bat buoc
4. Dynamic route params dung kieu cua Next hien tai
5. `typecheck` pass
6. `build` pass

### Frontend checklist

1. Khong tao hydration mismatch moi
2. Cac input co default value hop le
3. Loading/error state van hien dung
4. Khong vo mobile/desktop layout chinh
5. `typecheck` pass
6. `build` pass

## 7. Cac diem dang mo va chua on dinh hoan toan

### 7.1. Tai lieu cu va code moi chua dong bo 100%

Mot so tai lieu duoc tao tu giai doan prototype ban dau. Khi lam tiep can uu tien su that theo code hien tai, sau do moi cap nhat tai lieu.

### 7.2. Search can nang cap

Case ten hang gan dung nhu:

- bulong
- bu long
- bolt m8x20

chua chac duoc rank tot neu du lieu thuc te lon.

### 7.3. Export Excel can test tren du lieu that

Can test voi:

- nhieu dong hon template
- du lieu thieu brand/origin/hsCode
- packing list co field khach hang day du

### 7.4. Quy tac trong luong phai giu on dinh

Backend va frontend deu phai tuan theo:

- `unitWeightKg` la gia tri goc duoc uu tien
- `totalWeightKg` la gia tri suy ra tu `unitWeightKg * quantity`
- neu import dau vao dua `totalWeightKg` thi phai quy doi nguoc lai `unitWeightKg`
- voi import loai 1 tu file mau hien tai, mac dinh `quantity = 1`

### 7.5. Admin auth moi o muc co ban

Hien tai unlock admin van la co che nhe, chua phai auth/permission day du.

## 8. Cach tiep tuc cong viec dang do

### Neu tiep tuc backend

Lam theo thu tu:

1. Chot DB va tai lieu
2. Import/analyze/confirm
3. Search/product/source
4. Packing order/export

### Neu tiep tuc frontend

Lam theo thu tu:

1. Chi sua nhe de phuc vu backend contract truoc
2. Chi polish UI sau khi backend da on
3. Khi polish thi tach component lon, giam inline style

### Neu tiep tuc QA

Uu tien test:

1. import packing list
2. import base catalog
3. search tu khoa gan dung
4. save/update packing order
5. export Excel

## 9. Cong viec nen tao issue rieng

Nen tao issue tach rieng cho tung nhom:

1. Chot MySQL/Prisma va tai lieu
2. Refactor imports/analyze
3. Refactor imports/confirm
4. Search ranking va aliases
5. Product/source CRUD
6. Packing order CRUD
7. Excel export hardening
8. UI polish theo mockup

## 10. Dinh nghia “khong nen dong vao” khi chua den luc

Khong nen doi som:

1. toan bo giao dien `/`, `/search`, `/admin`
2. visual polish lon
3. auth/day session phuc tap

Ly do:

- de lam cham backend
- de vo contract du lieu
- de tang scope khong can thiet

## 11. Ban giao cho nguoi tiep theo

Truoc khi ban giao tiep, can cap nhat toi thieu:

1. [doc/dev-handoff-status.md](D:/Information-logistics/doc/dev-handoff-status.md:1)
2. [doc/backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)
3. [doc/execution-roadmap.md](D:/Information-logistics/doc/execution-roadmap.md:1)
4. [doc/development-playbook.md](D:/Information-logistics/doc/development-playbook.md:1)

Va can ghi ro:

- phase dang lam
- route/API vua doi
- risk con ton
- lenh kiem tra da chay
