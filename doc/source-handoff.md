# Source handoff

## 1. Tong quan ung dung

Ung dung nay la web app noi bo phuc vu nhan vien xuat nhap khau, gom 3 nhom chuc nang chinh:

- Quan ly du lieu hang hoa
- Tra cuu hang hoa de chon thong tin phu hop
- Tao packing list va export Excel theo template

Nguon du lieu duoc xay dung tu:

- Nhap tay thong tin co so hang hoa
- Import file Excel danh muc hang hoa
- Import Packing List de tao lich su nguon du lieu / lich su khai

## 2. Stack va cau truc hien tai

Stack chinh dang su dung:

- `Next.js 16`
- `React 19`
- `Prisma`
- `MySQL`
- `xlsx`

Cau truc man hinh chinh:

- `/`
  dashboard tong quan

- `/search`
  tra cuu hang hoa, chon nguon du lieu, them thu cong trong phien lam viec, tao du lieu de export

- `/admin`
  import, quan ly, sua, xoa du lieu hang hoa va nguon du lieu

## 3. Du lieu va schema

Schema chinh nam tai:

- `prisma/schema.prisma`

Bang / model quan trong:

- `Product`
  san pham goc

- `ProductSource`
  nguon thong tin cua san pham
  gom nguon co so va nguon Packing List

- `PackingOrder`
  phieu du lieu de export packing list

- `PackingOrderLine`
  dong chi tiet trong packing order

- `ImportBatch`
  log import

## 4. Chuc nang da hoan thien den hien tai

### 4.1 Trang quan tri du lieu `/admin`

- Nhap danh sach hang hoa bang o text
- Import danh muc hang hoa tu file Excel
- Import Packing List
- Xac nhan du lieu truoc khi luu
- Ghep noi voi san pham da co hoac tao moi
- Quan ly danh sach hang hoa va nguon du lieu
- Xoa tung nguon du lieu
- Xoa nhieu hang hoa / nhieu nguon du lieu bang tick chon
- Tai file mau import danh muc hang hoa

### 4.2 Trang tra cuu `/search`

- Nhap danh sach hang hoa bang text
- Ho tro cu phap:
  `Ten hang hoa || So luong`

- Import danh sach tra cuu tu file Excel
- Tai file mau import tra cuu
- Tu dong tim san pham khop
- Neu khop 100%:
  uu tien nguon Packing List moi nhat, neu khong co moi ve nguon co so

- Neu co nhieu ket qua:
  mo popup `Chon thu cong`

- Trong popup `Chon thu cong`:
  co the chon lai san pham khop
  hoac chuyen sang `Nhap thu cong`

- Ho tro `Nhap thu cong` theo phien lam viec:
  khong luu vao database
  chi dung de xuat Excel / Packing List

- Ho tro `Them thu cong` tu popup them hang hoa

- Ho tro:
  chon tat ca
  bo chon
  xoa cac dong da chon

- Ho tro bat / tat cot hien thi trong bang ket qua

- Cot `Maker/Brand` co them lua chon nho `Maker | Brand`
  chi ton tai tren trang tra cuu de phuc vu logic dien giai truoc khi xuat packing list

### 4.3 Export Packing List

- Export ra file Excel theo template:
  `templates/inv-pkl-template.xls`

- Co form nhap thong tin header packing list truoc khi export

## 5. Pham vi nhap thu cong tren trang tra cuu

Nhap thu cong hien tai chi ton tai trong state cua trang `/search`.

Co nghia la:

- Khong tao `Product` moi trong database
- Khong tao `ProductSource` moi trong database
- Duoc dua vao `Luu phien`, `Xuat Excel`, `Xuat Packing List`
- Mat khi reload trang neu chua luu theo dang packing order

Day la chu y rat quan trong cho nguoi phat trien tiep theo.

## 6. Diem can luu y / no ky thuat

### 6.1 Env helper con dau vet cu

Codebase hien tai da chay bang `Prisma + MySQL`, nhung file sau van con dau vet lich su:

- `lib/server-env.ts`
- `app/api/health/route.ts`

Hai file nay van dang doc `MONGODB_URI` de tra ve `mongoConfigured`.
Day khong con la nguon du lieu chinh cua he thong.

Nguoi phat trien tiep theo nen xem day la technical debt nho va doi ten / chuan hoa lai sau.

### 6.2 Chua co migration folder

Thu muc `prisma/migrations` hien chua co.
May moi nen dung `prisma db push` de dong bo schema thay vi `prisma migrate deploy`.

### 6.3 README cu va tai lieu cu

Trong repo co mot so tai lieu duoc viet tu cac giai doan truoc.
Uu tien xem:

1. `README.md`
2. `doc/README.md`
3. `doc/source-handoff.md`
4. `doc/deployment-guide.md`

## 7. De xuat thu tu phat trien tiep

Neu ban giao cho dev moi, thu tu vao viec hop ly la:

1. Dung local thanh cong tren may moi
2. Xac nhan DB, env, template export
3. Kiem tra 3 luong chinh:
   import admin
   tra cuu search
   export packing list
4. Chot lai output cua packing list
5. Sau do moi tiep tuc toi uu giao dien va logic dien giai

## 8. File nen doc khi can debug

- `app/search/page.tsx`
- `app/admin/page.tsx`
- `app/api/imports/*`
- `app/api/packing-orders/*`
- `lib/excel/parsers.ts`
- `lib/excel/template.ts`
- `lib/services/import-workflow-service.ts`
- `lib/services/product-service.ts`
- `prisma/schema.prisma`
