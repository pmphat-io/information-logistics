# Information Logistics

Web app noi bo phuc vu nghiep vu:

- quan ly danh muc hang hoa
- luu nguon du lieu hang hoa
- tra cuu hang hoa theo ten / alias
- tao packing list va export Excel theo template

## Stack hien tai

- `Next.js 16`
- `React 19`
- `Prisma`
- `MySQL`
- `xlsx`

Luu y:

- huong hien tai cua project la `Prisma + MySQL`
- neu tai lieu cu nao con nhac `MongoDB/Mongoose` thi xem do la tai lieu lich su, khong phai stack chinh thuc nua

## Chay local

Tao `.env.local` tu `.env.example`, sau do sua:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/information_logistics"
ADMIN_PASSWORD=change-me
```

Sau do chay:

```bash
cmd /c npm install
cmd /c npx prisma generate
cmd /c npx prisma db push
cmd /c npm run dev
```

Kiem tra truoc khi tiep tuc phat trien:

```bash
cmd /c npm run typecheck -- --pretty false
cmd /c npm run build
```

## Duong dan man hinh chinh

- `/` : dashboard tong quan, xem hang hoa va thong ke
- `/search` : tra cuu hang hoa va tao packing order
- `/admin` : import, sua, xoa du lieu

## Tai lieu can doc

Bat dau tu:

1. [doc/README.md](D:/Information-logistics/doc/README.md:1)
2. [doc/source-handoff.md](D:/Information-logistics/doc/source-handoff.md:1)
3. [doc/deployment-guide.md](D:/Information-logistics/doc/deployment-guide.md:1)
4. [doc/development-playbook.md](D:/Information-logistics/doc/development-playbook.md:1)

## Thu tu phat trien tiep theo

Roadmap hien tai da duoc chot theo thu tu:

1. Chot DB + cap nhat tai lieu ky thuat
2. Hoan thien import/confirm du lieu
3. Nang search va quan ly product/source
4. On dinh packing order + export Excel
5. Moi polish UI theo mockup

Chi tiet xem trong:

- [doc/execution-roadmap.md](D:/Information-logistics/doc/execution-roadmap.md:1)
