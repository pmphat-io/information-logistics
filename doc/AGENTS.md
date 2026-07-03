# AGENTS.md

## Mục tiêu chính

Project này có nhiều nội dung tiếng Việt. Ưu tiên cao nhất khi sửa code là:

- Giữ nguyên UTF-8.
- Không làm hỏng dấu tiếng Việt.
- Không tạo mojibake, ví dụ: `Tiếng Việt` bị thành `Tiáº¿ng Viá»‡t`.
- Không rewrite toàn bộ file dài nếu chỉ cần sửa một vùng nhỏ.
- Không thay đổi text tiếng Việt ngoài phần được yêu cầu rõ ràng.

Các quy tắc này quan trọng hơn việc format lại code cho đẹp.

---

## Quy tắc bắt buộc khi sửa file

Khi sửa file trong project này, hãy tuân thủ:

1. Chỉ sửa phần liên quan trực tiếp đến yêu cầu.
2. Ưu tiên patch nhỏ, diff nhỏ, thay đổi tối thiểu.
3. Không rewrite toàn bộ file dài.
4. Không chạy formatter toàn repo nếu không được yêu cầu.
5. Không chạy command có thể ghi đè toàn file khi không cần thiết.
6. Không đổi encoding, newline, indentation hàng loạt.
7. Không đổi dấu tiếng Việt, không bỏ dấu, không chuẩn hóa lại chuỗi tiếng Việt.
8. Không tự dịch, tự viết lại, hoặc “làm đẹp” nội dung tiếng Việt nếu task không yêu cầu.
9. Không chỉnh các file generated/build output như `dist`, `build`, `.next`, `.nuxt`, `coverage`, `node_modules`.
10. Trước khi kết thúc task, phải kiểm tra diff.

---

## Quy tắc riêng cho file dài

Với file dài, đặc biệt là file có nhiều text tiếng Việt:

- Không đọc rồi tái tạo lại toàn bộ file.
- Không dùng cách “replace toàn file”.
- Không dùng command kiểu tạo lại file từ đầu nếu chỉ cần sửa vài dòng.
- Chỉ sửa block, function, component, route, schema, hoặc object liên quan.
- Nếu cần thay đổi nhiều nơi, hãy chia thành các patch nhỏ.
- Nếu không chắc vùng cần sửa, hãy tìm bằng `rg`, `git grep`, hoặc đọc các đoạn liên quan thay vì thao tác toàn file.

---

## Quy tắc bảo vệ tiếng Việt

Không được thay đổi các chuỗi tiếng Việt hiện có, trừ khi yêu cầu trực tiếp là sửa nội dung tiếng Việt.

Ví dụ các thay đổi KHÔNG được phép nếu task không yêu cầu:

```txt
Đăng nhập thất bại
```

thành:

```txt
Dang nhap that bai
```

hoặc:

```txt
ÄÄƒng nháº­p tháº¥t báº¡i
```

hoặc:

```txt
Đăng nhập không thành công
```

Nếu phát hiện text tiếng Việt có vẻ đã bị mojibake, hãy dừng lại và báo rõ file/dòng nghi ngờ. Không tự rewrite toàn bộ file để sửa.

---

## Quy tắc command trên Windows

Môi trường làm việc chính là Windows + VSCode + Codex extension.

Khi cần tạo hoặc sửa file text bằng command:

- Ưu tiên dùng patch/editor tool thay vì command rewrite toàn file.
- Không dùng command có nguy cơ đổi encoding ngoài ý muốn.
- Nếu cần tạo file mới bằng script, dùng Node.js `fs.writeFileSync(..., 'utf8')`.
- Với PowerShell, tránh ghi đè file source dài bằng `Set-Content` nếu không thật sự cần.
- Không dùng command tự động format toàn bộ project nếu task chỉ yêu cầu sửa một phần nhỏ.

---

## Kiểm tra bắt buộc sau khi sửa

Sau khi sửa các file sau:

- `.js`
- `.cjs`
- `.mjs`
- `.ts`
- `.tsx`
- `.jsx`
- `.json`
- `.md`
- `.mdx`
- `.yml`
- `.yaml`
- `.html`
- `.css`
- `.scss`
- `.vue`
- `.svelte`
- `.txt`
- `.env`

phải chạy:

```bash
npm run check:encoding:changed
```

Nếu task có sửa code có test/lint liên quan, chạy thêm command phù hợp của project, ví dụ:

```bash
npm test
npm run lint
npm run build
```

Chỉ chạy các command này nếu chúng tồn tại trong `package.json` hoặc task yêu cầu.

---

## Khi encoding check fail

Nếu command này fail:

```bash
npm run check:encoding:changed
```

thì phải:

1. Dừng lại ngay.
2. Không tự rewrite toàn bộ file để sửa.
3. Không chạy formatter để “sửa encoding”.
4. Kiểm tra `git diff`.
5. Báo rõ file nghi ngờ bị lỗi.
6. Đề xuất restore file nếu diff quá lớn.
7. Chỉ sửa tối thiểu vùng bị lỗi nếu nguyên nhân rõ ràng.

Ưu tiên an toàn:

```bash
git diff -- path/to/file
```

Nếu file bị thay đổi quá rộng hoặc có dấu hiệu hỏng tiếng Việt:

```bash
git restore -- path/to/file
```

Sau đó làm lại bằng patch nhỏ hơn.

---

## Quy tắc trước khi hoàn thành task

Trước khi trả lời hoàn tất, phải kiểm tra:

```bash
git diff --check
npm run check:encoding:changed
```

Sau đó trong câu trả lời cuối, hãy nói ngắn gọn:

- Đã sửa những gì.
- Đã chạy check nào.
- Encoding check pass hay fail.
- Có thay đổi text tiếng Việt hay không.

Nếu chưa chạy được check, phải nói rõ lý do. Không được nói là đã pass nếu chưa thật sự chạy.

---

## Quy tắc khi user yêu cầu sửa code

Khi nhận task sửa code:

1. Đọc yêu cầu.
2. Xác định file/vùng liên quan.
3. Sửa tối thiểu.
4. Không rewrite toàn file dài.
5. Chạy encoding check.
6. Kiểm tra diff.
7. Trả lời ngắn gọn, tập trung vào kết quả.

Không cần giải thích dài nếu task đơn giản.

---

## Quy tắc khi user yêu cầu refactor

Nếu user yêu cầu refactor:

- Không refactor lan rộng ngoài phạm vi yêu cầu.
- Không đổi public API nếu không cần.
- Không đổi text tiếng Việt nếu task không nói đến nội dung text.
- Nếu refactor có nguy cơ chạm nhiều file có tiếng Việt, hãy chia thành từng bước nhỏ.
- Sau mỗi bước lớn, chạy encoding check.

---

## Quy tắc khi user yêu cầu sửa bug

Nếu user yêu cầu sửa bug:

- Tập trung vào nguyên nhân bug.
- Không format lại file.
- Không đổi cấu trúc code lớn nếu chưa cần.
- Không đổi message tiếng Việt trừ khi bug nằm ở message đó.
- Thêm test nếu project đã có test structure phù hợp.

---

## Quy tắc khi user yêu cầu thêm feature

Nếu user yêu cầu thêm feature:

- Ưu tiên thêm code mới ở file/module phù hợp.
- Không sửa các file dài có nhiều tiếng Việt nếu có thể tránh.
- Nếu cần thêm text tiếng Việt, đảm bảo text là UTF-8 đúng.
- Nếu thêm message/UI text, cân nhắc đặt vào file message/i18n riêng nếu project đã có pattern đó.

---

## Không được làm

Không được tự ý làm các việc sau:

- Rewrite toàn bộ file dài.
- Chạy formatter toàn repo.
- Chạy migration lớn không được yêu cầu.
- Đổi encoding file.
- Đổi line ending hàng loạt.
- Bỏ dấu tiếng Việt.
- Tự dịch tiếng Việt sang tiếng Anh.
- Tự sửa lại văn phong tiếng Việt nếu task không yêu cầu.
- Sửa nhiều file ngoài phạm vi task.
- Commit code nếu user chưa yêu cầu.
- Xóa file nếu không có lý do rõ ràng.
- Tạo thay đổi lớn chỉ để “clean up”.

---

## Definition of done

Một task chỉ được xem là xong khi:

- Code đã sửa đúng yêu cầu.
- Diff nhỏ và đúng phạm vi.
- Không có thay đổi ngoài ý muốn ở text tiếng Việt.
- `npm run check:encoding:changed` đã pass.
- Nếu có test/lint/build liên quan, đã chạy và báo kết quả.
- Nếu check fail, đã dừng lại và báo rõ thay vì tiếp tục sửa lan rộng.