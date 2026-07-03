# Execution Roadmap - Information Logistics

## 1. Muc tieu

Tai lieu nay chuyen hoa thu tu uu tien da chot thanh roadmap thuc thi cu the de team co the:

- lap ke hoach theo tuan
- chia viec cho backend / frontend / QA
- theo doi cong viec dang do
- biet ro phase nao phai xong truoc phase nao

Thu tu uu tien duoc chot:

1. Chot DB + cap nhat tai lieu ky thuat
2. Hoan thien import/confirm du lieu
3. Nang search va quan ly product/source
4. On dinh packing order + export Excel
5. Moi bat dau polish UI theo mockup

## 2. Nguyen tac thuc hien

- Khong polish UI lon khi contract du lieu chua on dinh
- Backend phai dung va build duoc sau moi moc
- Moi phase phai co `definition of done`
- Moi route/API can co owner ro rang
- Moi logic import/export can co file test mau

## 3. Roadmap Tong Quan

### Phase A - Nen tang du lieu va tai lieu ky thuat

Muc tieu:

- chot `Prisma + MySQL` la stack chinh thuc
- loai bo mo ta cu khong con dung
- chuan hoa contract data model

Du kien:

- 2 den 4 ngay lam viec

Ket qua can dat:

- schema Prisma duoc xac nhan
- env/local setup ro rang
- tai lieu ky thuat phan anh dung codebase hien tai
- app `typecheck` va `build` sach

### Phase B - Import / Confirm Du Lieu

Muc tieu:

- bien luong import thanh luong co the dung that

Du kien:

- 4 den 7 ngay lam viec

Ket qua can dat:

- `analyze` parse on dinh
- `confirm` luu du lieu dung vao DB
- validate va message loi ro rang
- khong tao du lieu sai do import trung hoac map sai

### Phase C - Search va Quan Ly Product/Source

Muc tieu:

- tra cuu dung, du, de xu ly nghiep vu hang ngay

Du kien:

- 4 den 6 ngay lam viec

Ket qua can dat:

- search theo `name`, `normalizedName`, `aliases`
- chinh sua product/source an toan
- case nhieu ket qua tuong dong xu ly duoc
- dashboard va admin dung chung du lieu that

### Phase D - Packing Order va Export Excel

Muc tieu:

- luu / sua / export packing list on dinh tren du lieu that

Du kien:

- 4 den 6 ngay lam viec

Ket qua can dat:

- save/update packing order on dinh
- load lai draft cu on dinh
- export Excel dung template
- khong vo file khi gap du lieu thieu hoac danh sach dai hon template

### Phase E - UI Polish Theo Mockup

Muc tieu:

- nang cap giao dien sau khi backend va contract da dung

Du kien:

- 5 den 8 ngay lam viec

Ket qua can dat:

- refactor giao dien theo mockup moi
- khong doi contract API vo co
- giu nguyen luong nghiep vu da xac nhan

## 4. Backlog Cu The Theo Phase

### Phase A - Chot DB + Tai lieu

#### A1. Chot database layer

Task:

1. Xac nhan app dung `Prisma + MySQL`, khong duy tri hai huong `MongoDB/Mongoose` song song.
2. Xoa hoac danh dau deprecated cac tai lieu cu mo ta sai stack.
3. Kiem tra `prisma/schema.prisma` khop voi nghiep vu hien tai.
4. Kiem tra `lib/types.ts` khop schema va frontend.

Done khi:

- team khong con nham database stack
- schema, types, API tra ve cung mot shape du lieu

#### A2. Chot setup moi truong

Task:

1. Chuan hoa `.env.example` theo `DATABASE_URL`, `ADMIN_PASSWORD`.
2. Ghi ro cach `prisma generate`, `prisma db push` hoac `prisma migrate`.
3. Tao script seed/dev data neu chua co.

Done khi:

- dev moi clone ve co the chay duoc app va DB local trong 15-30 phut

#### A3. Cap nhat tai lieu ky thuat

Task:

1. Cap nhat [README.md](D:/Information-logistics/README.md:1)
2. Cap nhat [dev-handoff-status.md](D:/Information-logistics/doc/dev-handoff-status.md:1)
3. Cap nhat [backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)

Done khi:

- tai lieu va code khong con mau thuan

### Phase B - Import / Confirm

#### B1. Hoan thien API `imports/analyze`

Task:

1. Chot input contract cho:
   - manual text
   - base catalog excel
   - packing list excel
2. Chot output contract `mappedRows`, `importContext`, `commonContext`.
3. Xu ly on dinh ten hang, quantity, unit, origin, brand, hsCode, notes.

Done khi:

- frontend nhan duoc draft data on dinh de review

#### B2. Hoan thien API `imports/confirm`

Task:

1. Chot luat `create` / `update` / `skip`.
2. Chot cach tao `ProductSource`.
3. Chot cach gan `manual` va `customs-declaration`.
4. Chot cach luu `commonContext` vao metadata.

Done khi:

- du lieu xac nhan luu dung, khong lech source type

#### B3. Validate va duplicate control

Task:

1. Bao loi neu file thieu cot bat buoc.
2. Bao loi neu row khong du ten hang.
3. Kiem tra duplicate theo:
   - normalizedName
   - referenceCode
   - documentNo + documentDate
4. Them import batch status ro hon.

Done khi:

- import sai du lieu duoc chan som

### Phase C - Search va Quan ly Product/Source

#### C1. Nang search

Task:

1. Tim theo `name`.
2. Tim theo `normalizedName`.
3. Tim theo `aliases`.
4. Tinh score hoac rank ket qua de frontend sap xep.

Done khi:

- case nhu `bulong m8 20mm` tra ket qua dung hon

#### C2. Quan ly aliases

Task:

1. Chot format luu aliases trong DB.
2. Chot logic merge aliases khi import.
3. Khong tao duplicate product khi chi khac ten goi.

Done khi:

- cung mot mat hang co the tim bang nhieu ten

#### C3. Edit/Delete product va source

Task:

1. Hoan thien `PUT /api/products/[id]`
2. Hoan thien `DELETE /api/products/[id]`
3. Hoan thien `PUT /api/product-sources/[id]`
4. Can nhac `DELETE /api/product-sources/[id]`

Done khi:

- admin sua du lieu ma khong vo quan he product-source

### Phase D - Packing Order + Export

#### D1. Hoan thien packing order CRUD can thiet

Task:

1. Kiem tra create/update packing order voi du lieu that.
2. Dam bao load lai draft khong mat thong tin.
3. Can nhac them delete/duplicate packing order.

Done khi:

- mot phien packing list co the duoc tao, mo lai, sua, export

#### D2. On dinh export Excel

Task:

1. Kiem tra map cot va cell voi template that.
2. Xu ly du lieu thieu `brand`, `origin`, `hsCode`, `unit`.
3. Kiem tra so dong lon hon template.
4. Kiem tra dong tong cong va packing summary.

Done khi:

- file export dung duoc cho nghiep vu that

#### D3. Kiem thu nghiep vu

Task:

1. Test import -> search -> save packing -> export tren 1 bo du lieu that.
2. Test load draft cu -> sua -> export lai.

Done khi:

- luong nghiep vu chinh chay thong tu dau den cuoi

### Phase E - Polish UI

#### E1. Chot input cho team design

Task:

1. Dung [ui-mockup-spec.md](D:/Information-logistics/doc/ui-mockup-spec.md:1)
2. Dung [designer-brief.md](D:/Information-logistics/doc/designer-brief.md:1)
3. Dung contract backend da on dinh o cac phase truoc

#### E2. Refactor UI theo mockup

Task:

1. Refactor `/`
2. Refactor `/search`
3. Refactor `/admin`
4. Giam inline style, tang component reuse

Done khi:

- giao dien moi dep hon nhung nghiep vu khong doi

## 5. Thu Tu Trien Khai De Xuat Theo Tuan

### Tuan 1

1. Chot Prisma + MySQL
2. Cap nhat tai lieu ky thuat
3. Chuan hoa env + script DB
4. Khoa lai build/typecheck

### Tuan 2

1. Hoan thien `imports/analyze`
2. Hoan thien `imports/confirm`
3. Them validate import
4. Test import tren file that

### Tuan 3

1. Nang search
2. Hoan thien aliases
3. Hoan thien edit/update product/source

### Tuan 4

1. Hoan thien packing order
2. On dinh export Excel
3. Test end-to-end luong nghiep vu

### Tuan 5 tro di

1. Bắt dau polish UI theo mockup
2. Refactor component va luong frontend

## 6. Definition Of Done Theo Giai Doan

### DoD cho backend phase dau

- `npm run typecheck` pass
- `npm run build` pass
- cac route chinh co the goi duoc tren local
- DB local dung va luu du lieu that

### DoD cho import

- co file mau test
- import khong crash
- import sai du lieu co thong bao ro
- import dung du lieu tao source dung

### DoD cho search

- tim duoc theo ten chinh
- tim duoc theo alias
- tim duoc theo cum tu gan dung o muc chap nhan duoc

### DoD cho packing order

- tao duoc
- luu duoc
- mo lai duoc
- export duoc

## 7. Rui Ro Va Thu Tu Uu Tien Neu Bi Thieu Nguon Luc

Neu thieu nguon luc, cat theo thu tu sau:

1. Chua polish UI
2. Chua lam duplicate/delete packing order
3. Chua lam preview import dep

Khong nen cat:

1. Chot DB va tai lieu
2. Import/confirm
3. Search
4. Export Excel

## 8. Moc Ban Giao Tiep Theo

Moc ban giao hop ly tiep theo cho nguoi tiep quan:

1. Sau Phase A
2. Sau Phase B
3. Sau Phase D

Tai moi moc can cap nhat:

- [dev-handoff-status.md](D:/Information-logistics/doc/dev-handoff-status.md:1)
- [backend_handoff.md](D:/Information-logistics/doc/backend_handoff.md:1)
- [README.md](D:/Information-logistics/README.md:1)
