# Mockup Spec - Information Logistics

## 1. Muc tieu ung dung

Ung dung nay phuc vu nhan vien xuat nhap khau trong viec:

- tra cuu thong tin hang hoa theo ten
- chon nguon thong tin phu hop nhat cho tung hang
- tao packing list tu cac hang hoa da du thong tin
- luu lai phien packing list de sua va export lai khi can

Ung dung la `web app noi bo`, uu tien thao tac nhanh, ro, de doi chieu thong tin.

## 2. Nguoi dung muc tieu

### 2.1. Nhan vien tra cuu

Nhu cau:

- nhap ten hang hoa hoac danh sach hang hoa can xu ly
- tim duoc hang dung trong thoi gian ngan
- xem nhanh lich su khai hai quan
- chon nguon thong tin de lap packing list

### 2.2. Nhan vien quan ly du lieu

Nhu cau:

- import packing list de tao lich su khai
- import thong tin co so cho hang hoa chua tung khai
- kiem tra ket qua import
- quan ly va bo sung du lieu nguon

Luu y:

- hien tai khong tach user role day du
- tinh nang quan tri duoc mo khoa bang `mot mat khau dung chung`

## 3. Muc tieu giao dien

Giao dien can duoc thiet ke lai theo huong:

- nghiep vu ro rang
- uu tien bang du lieu, thao tac nhanh
- co kha nang xu ly nhieu dong hang hoa
- han che cam giac “dashboard chung chung”
- phan tach ro `tra cuu`, `nguon du lieu`, `draft packing list`, `lich su da luu`

Cam giac mong muon:

- chuyen nghiep
- nghiep vu
- dam chat van hanh noi bo
- it trang tri, uu tien do ro va toc do thao tac

## 4. Luong nghiep vu chinh

### 4.1. Luong import du lieu

Co 3 loai import:

1. `Import Packing List`
   - nguon la file excel packing list da co
   - moi lan import duoc xem la `mot lan khai hai quan`
   - tao ra lich su khai cho cac hang hoa trong file

2. `Import Danh Sach Thong Tin Co So`
   - dung cho hang hoa chua co packing list
   - du lieu do nhan vien thu thap va bo sung chu dong
   - thong tin co the gom: ten hang, xuat xu, brand, trong luong, hs code, ghi chu

3. `Import Danh Sach Tra Cuu`
   - danh sach hang hoa can xu ly trong mot phien
   - dung de nguoi dung xu ly hang loat

### 4.2. Luong tra cuu hang hoa

1. nguoi dung nhap ten hang hoa
2. he thong tim cac hang trung khop
3. neu khong trung khop thi tra ve danh sach gan dung
4. nguoi dung chon `mot hang hoa`
5. he thong hien cac `nguon thong tin` cua hang hoa do
   - thong tin co so
   - cac lan khai hai quan neu co
6. nguoi dung chon `mot nguon thong tin`
7. nguoi dung nhap `so luong can dua vao packing list`
8. he thong tinh `tong trong luong = trong luong / don vi * so luong`
9. dong duoc them vao draft packing list

### 4.3. Luong tao packing list

1. nguoi dung tap hop cac dong hang da chon
2. nguoi dung nhap / sua thong tin header:
   - so chung tu
   - ten khach hang
   - ngay chung tu
   - hinh thuc thanh toan
   - phuong thuc giao hang
   - thoi han giao hang
   - so kien
   - G.W
3. nguoi dung luu thanh `mot phien packing list`
4. nguoi dung export file excel theo template

### 4.4. Luong mo lai phien packing list

1. nguoi dung mo danh sach packing list da luu
2. chon mot phien cu
3. he thong nap lai:
   - toan bo thong tin header
   - toan bo danh sach dong hang
4. nguoi dung sua va luu lai
5. co the export lai file excel

## 5. Quy tac du lieu va nghiep vu

### 5.1. Don vi du lieu hang hoa

He thong dang chap nhan mot ten hang la mot don vi hang hoa rieng.

Dieu nay co nghia:

- neu hai ten khac nhau, he thong xem la hai hang hoa khac nhau
- khong co buoc tu dong gop nhieu alias thanh mot master product o giai doan hien tai

### 5.2. Nguon thong tin

Mot hang hoa co the co:

- `thong tin co so`
- `nhieu lan khai hai quan`

Nguoi dung phai chon `mot nguon thong tin cu the` khi dua vao packing list.

### 5.3. Trong luong

Quy tac tinh:

- `unit_weight = total_weight / quantity`
- khi export:
  - `line_total_weight = unit_weight * export_quantity`

Vi du:

- nhap vao: 5 cai, tong 5 kg
- he thong tinh: 1 kg / cai
- khi dua vao packing list 12 cai
- tong N.W = 12 kg

### 5.4. So kien va G.W

Khong tinh tu dong o giai doan hien tai.

Nguoi dung se tu nhap:

- so kien
- gross weight

### 5.5. Bao mat

Hien tai dung:

- 1 mat khau chung de mo khoa tinh nang quan tri

Chua co:

- dang nhap user
- phan quyen theo vai tro
- audit log nguoi dung

## 6. De xuat cau truc man hinh

### 6.1. Trang tong quan

Nen chia thanh 4 khu vuc lon:

1. `Import Du Lieu`
2. `Tra Cuu Hang Hoa`
3. `Draft Packing List`
4. `Lich Su Packing List`

Khong nen de tat ca nhin giong cac “card” ngang nhau.

De xuat bo cuc:

- cot trai: import + tra cuu
- cot phai: draft packing list + lich su

Hoac:

- buoc 1: data import
- buoc 2: search & select
- buoc 3: build packing list
- buoc 4: saved sessions

### 6.2. Man hinh import

Can hien ro 3 khoi:

#### A. Import Packing List

Hien:

- chon file
- thong tin file
- so dong doc duoc
- so chung tu / ngay doc duoc
- ket qua import thanh cong / loi

#### B. Import Thong Tin Co So

Hien:

- chon file
- map cot ky vong
- ket qua import

#### C. Import Danh Sach Tra Cuu

Hien:

- chon file
- preview danh sach can xu ly
- tong so dong

### 6.3. Man hinh tra cuu

Thanh phan can co:

- o nhap tu khoa lon, de go nhanh
- danh sach ket qua trung khop / gan dung
- thong tin tom tat tung ket qua:
  - ten hang
  - co bao nhieu lan khai
  - co thong tin co so hay khong

Khi chon mot hang:

- mo panel ben phai hoac drawer
- hien danh sach nguon thong tin
- moi nguon can hien:
  - loai nguon
  - ma nguon
  - ngay khai neu co
  - xuat xu
  - brand
  - hs code
  - quantity goc
  - tong kg
  - kg / don vi

### 6.4. Man hinh draft packing list

Can co 2 phan ro rang:

#### A. Header chung tu

Truong nhap:

- so chung tu
- khach hang
- ngay chung tu
- thanh toan
- phuong thuc
- thoi han giao
- so kien
- G.W

#### B. Danh sach dong hang

Bang dong hang can co:

- ten hang
- contract/PO
- xuat xu
- brand
- hs code
- so luong xuat
- don vi
- kg / don vi
- tong N.W
- nguon thong tin da chon

Thao tac:

- xoa dong
- sua so luong neu can
- cap nhat tong trong luong tu dong

### 6.5. Man hinh lich su packing list

Danh sach can the hien:

- so chung tu
- ten khach hang
- ngay
- tong so dong
- so kien / G.W

Thao tac:

- nap vao form
- export lai
- ve sau co the bo sung xoa / nhan ban

## 7. Trang thai man hinh can thiet ke

Team design nen mockup day du cac trang thai sau:

1. Trang thai chua mo khoa quan tri
2. Trang thai da mo khoa
3. Import thanh cong
4. Import loi
5. Khong tim thay hang hoa
6. Tim thay nhieu ket qua gan dung
7. Mot hang hoa co nhieu nguon thong tin
8. Draft packing list rong
9. Draft packing list da co nhieu dong
10. Dang mo lai mot phien da luu
11. Export thanh cong

## 8. Yeu cau UX chi tiet

- uu tien keyboard-friendly
- thao tac 1 tay / click it buoc nhat co the
- ket qua tim kiem phai de scan nhanh
- nhan ro thong tin nao la `nguon co so`, thong tin nao la `lan khai`
- feedback thanh cong / loi phai de thay
- import va export phai co thong bao ket qua ro rang

## 9. Yeu cau visual

Huong giao dien de xuat:

- style van hanh / nghiep vu
- nghiem tuc, sach, de doc
- uu tien bang, list, metadata
- han che cac khoi trang tri khong giup nghiep vu

Khong nen:

- qua giong landing page marketing
- qua nhieu gradient / card trang tri
- qua nhieu animation

Nen:

- typography ro
- phan cap thong tin manh
- spacing chuan
- bang du lieu de doc
- filter / status / badge ro rang

## 10. Mockup uu tien ve sau

Sau khi co mockup v1, co the thiet ke them:

- man hinh chi tiet import history
- man hinh chi tiet mot product
- man hinh config mat khau quan tri
- man hinh preview excel truoc khi export
