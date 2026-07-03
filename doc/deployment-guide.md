# Dong goi va deploy tren may khac

## 1. Muc tieu

Tai lieu nay huong dan:

- Cach dong goi source de giao cho nguoi khac
- Cach chay source tren may moi de review / dev tiep
- Cach chay local va production co ban

## 2. Yeu cau tren may moi

Can cai san:

- `Node.js` ban `20+`
- `npm`
- `MySQL 8+`
- `Git` neu nhan source qua repository

Khuyen nghi dung Windows terminal hoac PowerShell.

## 3. Cach dong goi source

Co 2 cach an toan:

### Cach 1. Dua len GitHub

Day la cach nen uu tien.

Quy trinh:

1. Push source len repository
2. Nguoi nhan source clone ve may
3. Tao file env rieng tren may cua ho

### Cach 2. Nen thanh file `.zip`

Neu ban giao qua USB / Google Drive / Zalo:

1. Dung toan bo thu muc project
2. Khong can kem:
   - `node_modules`
   - `.next`
   - `.git` neu khong can lich su commit
   - `.env.local`

3. Nen giu lai:
   - `templates/`
   - `prisma/`
   - `doc/`
   - `app/`
   - `lib/`
   - `package.json`
   - `package-lock.json`
   - `.env.example`

Neu can thao tac nhanh tren Windows:

1. Dong terminal dev
2. Xoa `node_modules` va `.next` neu muon giam dung luong
3. Chuot phai thu muc du an
4. `Send to > Compressed (zipped) folder`

## 4. Tao env tren may moi

Copy `.env.example` thanh `.env.local` va sua gia tri:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/information_logistics"
ADMIN_PASSWORD=change-me
```

Trong do:

- `DATABASE_URL`
  chuoi ket noi MySQL that tren may moi

- `ADMIN_PASSWORD`
  mat khau de mo tinh nang quan tri

## 5. Tao database tren MySQL

Vi du tao database:

```sql
CREATE DATABASE information_logistics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Sau do dong bo schema bang Prisma.

## 6. Cai dat source tren may moi

Trong thu muc project:

```bash
cmd /c npm install
cmd /c npx prisma generate
cmd /c npx prisma db push
```

Giai thich:

- `npm install`
  cai dependency

- `prisma generate`
  tao Prisma client

- `prisma db push`
  day schema hien tai len database

## 7. Chay local cho nguoi xem source

```bash
cmd /c npm run dev
```

Sau do mo:

- `http://localhost:3000`

Man hinh chinh:

- `/`
- `/search`
- `/admin`

## 8. Kiem tra truoc khi ban giao

Nen chay:

```bash
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npm run check:encoding:changed
```

Neu `check:encoding:changed` khong co y nghia tren may moi vi khong co git diff, co the bo qua buoc nay.

## 9. Chay production co ban tren may noi bo

Neu chi can chay de review trong mang noi bo:

```bash
cmd /c npm run build
cmd /c npm run start
```

Mac dinh app se chay tren:

- `http://localhost:3000`

Neu can doi port:

```bash
cmd /c set PORT=3001 && npm run start
```

Neu dung PowerShell:

```powershell
$env:PORT=3001
cmd /c npm run start
```

## 10. Checklist review tren may moi

Sau khi dung thanh cong, nen test nhanh:

1. Mo `/search`
2. Nhap 1 vai hang hoa
3. Thu `Chon thu cong`
4. Thu `Nhap thu cong`
5. Thu export Excel
6. Mo `/admin`
7. Thu tai file mau import
8. Thu import danh muc hang hoa
9. Thu import Packing List

## 11. Van de da biet

- Health route hien van tra field `mongoConfigured`
  do la du am lich su, khong phai nguon du lieu chinh

- Chua co migration folder
  vi vay may moi nen dung `prisma db push`

- Template export phu thuoc file:
  `templates/inv-pkl-template.xls`
  khong duoc xoa file nay khi dong goi source

## 12. De xuat cach ban giao tot nhat

Neu muon nguoi nhan source vao viec nhanh nhat:

1. Push code len GitHub
2. Gui kem:
   - file `.env.example`
   - mot file `.sql` tao database rong neu can
   - tai lieu `doc/source-handoff.md`
   - tai lieu `doc/deployment-guide.md`

3. Neu co the, gui kem:
   - 1 file Packing List mau
   - 1 file import danh muc hang hoa mau
   - 1 video ngan 3-5 phut quay luong `/admin` va `/search`

## 13. Quy trinh ban giao thuc te

Day la quy trinh de ban giao source cho mot nguoi khac de ho co the mo source, chay duoc va phat trien tiep.

### Buoc 1. Chuan bi source truoc khi ban giao

Tren may cua ban:

1. Dam bao source dang o trang thai on dinh
2. Chay lai:

```bash
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npm run check:encoding:changed
```

3. Kiem tra lai cac file quan trong:
   - `templates/inv-pkl-template.xls`
   - `.env.example`
   - `prisma/schema.prisma`
   - `doc/source-handoff.md`
   - `doc/deployment-guide.md`

### Buoc 2. Chon cach ban giao

Co 2 cach:

#### Cach A. Ban giao qua GitHub

Nen dung cach nay neu nguoi nhan source se tiep tuc lap trinh.

Ban can gui:

- link repository
- ten branch dang lam
- commit gan nhat / commit on dinh
- file tai lieu trong `doc/`

Nguoi nhan source se:

1. Clone repo
2. Tao `.env.local`
3. Cai dependency
4. Tao database
5. Chay app

#### Cach B. Ban giao qua file `.zip`

Nen dung cach nay neu nguoi nhan source chi can review nhanh hoac chua co quyen vao GitHub.

Can dua vao file zip:

- `app/`
- `lib/`
- `prisma/`
- `templates/`
- `doc/`
- `public/` neu co
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.*` neu co
- `.env.example`
- `README.md`

Khong nen dua vao:

- `node_modules/`
- `.next/`
- `.git/`
- `.env.local`
- file tam, file export test

### Buoc 3. Gui thong tin kem theo source

Ngoai source code, ban nen gui kem 1 message huong dan ngan cho nguoi nhan:

```txt
Day la source ung dung Information Logistics.
Ban doc lan luot:
1. README.md
2. doc/README.md
3. doc/source-handoff.md
4. doc/deployment-guide.md

De chay local:
1. Tao .env.local tu .env.example
2. Cai MySQL va tao database
3. npm install
4. npx prisma generate
5. npx prisma db push
6. npm run dev
```

### Buoc 4. Huong dan nguoi nhan source dung tren may moi

Nguoi nhan source lam theo thu tu sau:

1. Cai `Node.js 20+`
2. Cai `MySQL 8+`
3. Lay source ve may
4. Tao `.env.local` tu `.env.example`
5. Tao database MySQL
6. Chay:

```bash
cmd /c npm install
cmd /c npx prisma generate
cmd /c npx prisma db push
cmd /c npm run dev
```

7. Mo:
   - `http://localhost:3000`

### Buoc 5. Kiem tra sau khi nguoi nhan source dung xong

Yeu cau nguoi nhan source test nhanh 3 khu vuc:

1. `/admin`
   - mo duoc trang
   - import duoc file mau

2. `/search`
   - tra cuu duoc hang hoa
   - thu popup chon thu cong
   - thu nhap thu cong

3. export
   - export duoc file Excel
   - mo duoc template packing list

### Buoc 6. Neu ban giao cho dev tiep tuc phat trien

Ban nen ghi ro cac noi dung sau:

- stack chinh la `Next.js + Prisma + MySQL`
- du lieu chinh khong dung MongoDB nua
- may moi hien nen dung `prisma db push`
- file export template nam trong `templates/`
- trang tra cuu co phan `nhap thu cong` chi ton tai theo phien, khong luu database

### Buoc 7. Danh sach toi thieu nen gui cho nguoi nhan

Toi thieu nen gui:

1. source code
2. `.env.example`
3. `doc/source-handoff.md`
4. `doc/deployment-guide.md`
5. 1 file Packing List mau
6. 1 file import danh muc hang hoa mau

### Buoc 8. Mau message ban giao de gui qua Zalo / email

Ban co the gui nhu sau:

```txt
Mình gửi bạn source ứng dụng Information Logistics để tiếp tục phát triển.

Tài liệu cần đọc:
1. README.md
2. doc/README.md
3. doc/source-handoff.md
4. doc/deployment-guide.md

Stack hiện tại:
- Next.js
- Prisma
- MySQL

Cách chạy trên máy mới:
1. Tạo .env.local từ .env.example
2. Tạo database MySQL
3. npm install
4. npx prisma generate
5. npx prisma db push
6. npm run dev

Màn hình chính:
- /admin
- /search
- /
```
