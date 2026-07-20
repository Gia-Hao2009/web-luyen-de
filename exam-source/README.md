# exam-source/ — nơi bỏ đề gốc để nhờ Claude xử lý thẳng lên web

Thư mục này **không phải là 1 phần của website** (không nằm trong `public/`, không bị deploy lên Netlify) — đây chỉ là nơi bạn lưu file đề gốc trên máy, để Claude đọc và đẩy thẳng dữ liệu lên Airtable, không cần qua trang Admin nào trên web nữa.

## Cấu trúc

```
exam-source/
  reading/      ← đề IELTS Reading và THPT Reading
    de-so-1/
      de-bai.txt        (hoặc .pdf — đề bài + câu hỏi)
      dap-an.txt        (đáp án + giải thích, đã có AI khác phân tích sẵn)
      chart1.png         (ảnh/biểu đồ nếu có, tuỳ chọn)
      exam.json          ← file Claude tự tạo ra sau khi đọc 2 file trên
  writing/      ← đề IELTS Writing
    task-2-technology/
      de-bai.txt
      exam.json
  thpt/         ← đề THPT Reading
    de-thu-1/
      de-bai.txt
      dap-an.txt
      exam.json
```

Mỗi đề = 1 thư mục con riêng, đặt tên gì cũng được (chỉ để bạn dễ nhớ, không ảnh hưởng tới web).

## Quy trình làm việc

1. Tạo 1 thư mục con mới trong đúng danh mục (`reading/`, `writing/`, hoặc `thpt/`)
2. Bỏ file đề gốc vào đó — ưu tiên `.txt` hoặc `.pdf` (Word `.docx` đôi khi đọc không sạch, nếu có thể hãy chuyển qua `.txt`/`.pdf` trước, hoặc copy-paste thẳng nội dung vào chat)
3. Nếu đề có ảnh/biểu đồ, bỏ file ảnh (`.png`/`.jpg`) vào **cùng thư mục đó** luôn
4. Nếu là Reading, có sẵn đáp án + giải thích (đã nhờ AI khác phân tích) thì bỏ thêm 1 file đáp án vào cùng thư mục
5. Báo cho Claude (trong cuộc chat code này): *"xử lý đề trong exam-source/reading/de-so-1"*
6. Claude đọc các file trong thư mục đó, tự soạn ra file `exam.json` đúng chuẩn (xem mẫu ở `exam-template.json`), copy ảnh vào `public/exam-images/<examId>/`, rồi chạy:
   ```bash
   node scripts/push-exam.js exam-source/reading/de-so-1
   ```
   Lệnh này đẩy thẳng đề lên Airtable — xong là đề hiện ngay trên web, không cần thao tác gì thêm trên trình duyệt.

## Giới hạn thời gian làm bài hợp lệ

- **IELTS Reading / THPT Reading**: 0 (không giới hạn), 30, 45, 60, 75, 90 phút
- **IELTS Writing**: 0 (không giới hạn), 15, 30, 45, 60 phút

## Nhiều passage trong 1 đề Reading

1 đề Reading có thể có **1, 2, hoặc 3 passage** (đề ngắn thì để 1, đề chuẩn IELTS thật thì 3). Mỗi câu hỏi gắn với đúng 1 passage qua field `passageOrder` trong `exam.json`. Xem ví dụ chi tiết trong `exam-template.json`.

## Lưu ý quan trọng

- **Xoá thư mục con của 1 đề (vd `exam-source/reading/de-so-1/`) chỉ xoá bản lưu gốc trên máy bạn** (file đề, đáp án, ảnh) — **không tự động xoá đề đó khỏi Airtable/web đã đẩy lên trước đó**. Muốn gỡ đề khỏi web thật thì phải xoá record tương ứng trong bảng `Exams`/`Questions` trên Airtable.
- Nên giữ lại các thư mục này như 1 bản backup nội dung gốc, phòng khi cần chỉnh sửa/đẩy lại đề sau này.
