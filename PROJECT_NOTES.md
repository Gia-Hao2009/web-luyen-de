# Ghi chú quan trọng — luôn đọc lại trước khi code thêm tính năng mới

File này ghi lại các quyết định đã chốt với chủ dự án, để không code lệch hướng hoặc quên mất lý do vì sao làm theo cách này. Mỗi khi có quyết định/quy ước quan trọng mới, **thêm vào cuối file này**, không sửa lại lịch sử phía trên.

## Nguyên tắc xuyên suốt

- **Không dùng bất kỳ API AI trả phí nào** (không OpenAI, không Claude API...) trong code. Chỉ dùng Airtable free tier + Netlify free tier. Chấm Writing là thủ công bởi admin, không tự động qua AI.
- **Dark mode nghiêm túc/chuyên nghiệp, không mascot/trang trí nhân vật.** Bảng màu theo hướng "dark mode + dopamine accent" (nền tối trầm + accent bão hòa cao: tím-indigo `#7c6cfb` chủ đạo, cyan `#22d3ee` phụ, mỗi category có màu riêng: Reading=xanh dương, Writing=cam, THPT=hồng).
- Chủ dự án (chủ web) là học sinh lớp 12, chưa rành kỹ thuật — mọi hướng dẫn thao tác tay (Airtable, Netlify, cmd) phải giải thích từng bước rất chi tiết, không dùng thuật ngữ chưa giải thích.

## Phạm vi tính năng

- 3 loại đề: **IELTS Reading** (auto-grade), **IELTS Writing** (chấm tay bởi admin, 4 tiêu chí TA/CC/LR/GRA), **THPT Reading** (auto-grade). Không Listening, không Speaking, không nhận đề công khai từ người ngoài.
- Học sinh: có tài khoản riêng (bảng `Students`), lịch sử làm bài lưu tối đa **15 ngày** rồi tự xoá (`cleanup-history.js` chạy hằng ngày, đã giảm từ 30 ngày ban đầu).
- Admin: tài khoản riêng (bảng `AdminAccounts`, không có form đăng ký công khai, tạo qua `scripts/seed-admin.js`). Admin cũng vào làm bài được như học sinh (dùng để test đề), nhưng có nút riêng **"Xem đáp án"** (ẩn mặc định, bấm mới hiện) thay vì tự động lộ đáp án.
- Trang chủ (`index.html`) chỉ còn 3 card lớn (Reading/Writing/THPT) dẫn sang **3 trang riêng** (`category-reading.html`, `category-writing.html`, `category-thpt.html`) liệt kê đề từng loại — không liệt kê đề ngay trên trang chủ nữa.
- Cả admin lẫn học sinh đều phải đăng nhập mới vào được trang chủ trở đi (check `student_token` hoặc `admin_token` ở đầu mỗi trang).

## Quy trình nhập đề (KHÔNG còn UI import trên web)

- Đã **xoá hẳn trang `/admin/import.html`** và function `admin-import-exam.js` — không dùng nữa.
- Thay bằng: thư mục `exam-source/{reading,writing,thpt}/` ở gốc project (không nằm trong `public/`, không bị deploy). Mỗi đề = 1 thư mục con chứa file đề gốc + đáp án + ảnh (nếu có).
- Quy trình: chủ web bỏ file vào thư mục → báo Claude (trong cuộc chat code) → Claude đọc, tự soạn `exam.json` đúng schema (xem `exam-source/exam-template.json`), copy ảnh vào `public/exam-images/<examId>/`, rồi chạy `node scripts/push-exam.js <thu-muc-de>` để đẩy thẳng lên Airtable qua REST API (không qua Netlify Function, script chạy local dùng chung `_airtable.js`).
- Đề Reading có thể có **1-3 passage** (`passages` array trong Exams.PassagesJson, mỗi câu hỏi có `passageOrder` trỏ đúng passage).
- Giới hạn thời gian hợp lệ: **Reading** = 0(không giới hạn)/20/30/40/45/60/75/90 phút; **THPT Reading** = 0/30/45/50/60/75/90 phút; **Writing** = 0/15/30/45/60 phút.
- **Mặc định thời gian khi soạn đề mới** (Claude tự áp dụng, không cần hỏi lại):
  - IELTS Reading: **20 phút/passage** — 1 passage = 20p, 2 passage = 40p, 3 passage (đề chuẩn) = 60p.
  - IELTS Writing: **Task 1 = 15p + Task 2 = 45p = 60p tổng** (chỉ có 1 field `timeLimitMinutes` chung cho cả đề, không tách giờ riêng từng task được — 15/45 chỉ là quy ước tính nhẩm ra tổng).
  - THPT Reading: **50 phút** (đúng thời gian thi thật, đã thêm 50 vào danh sách hợp lệ ở `push-exam.js`).
  - Chỉ lệch khỏi mặc định trên khi **file đề gốc có ghi chú rõ ràng** đề dễ/khó hơn bình thường cần điều chỉnh giờ — nếu không có ghi chú thì luôn dùng đúng mặc định.
- Đã áp dụng mặc định mới cho 2 đề đã đẩy trước đó: "Finches on Islands" 30p → 20p (1 passage), "THPT Mã đề 1101" 60p → 50p.
- `push-exam.js` thêm cờ **`--id <examId>`**: dùng khi cần `--update` một đề có examId CŨ (sinh theo kiểu title+timestamp ngẫu nhiên, từ trước khi đổi sang cách sinh ID theo đường dẫn thư mục) — ví dụ đề "Finches on Islands" vẫn giữ ID cũ `ielts-reading-finches-on-islands-passage-1-mrnqhmqv`, không khớp với ID suy ra từ thư mục (`reading-e-1`), nên phải cập nhật bằng: `node scripts/push-exam.js "exam-source/reading/đề 1" --update --id ielts-reading-finches-on-islands-passage-1-mrnqhmqv`. Đề nào được tạo SAU thời điểm đổi cách sinh ID (như đề THPT 1101) thì không cần cờ này, chỉ cần `--update` suông.
- Ảnh trong đề: bỏ thẳng file vào `public/exam-images/<examId>/`, chèn bằng `<img src="/exam-images/.../ten-anh.png">` trong `passageHtml` — không dùng dịch vụ hosting ảnh ngoài.

## Giao diện trang làm bài (`exam.html`)

- Layout 2 cột: **đề bên trái** (sticky, tự cuộn riêng, không đè lên header), **câu hỏi bên phải**.
- Timer **không sticky/ghim**, nằm tự nhiên phía trên bên trái.
- Từ khoá `<mark>` trong đoạn văn (dùng để giải thích đáp án nội bộ) **luôn bị ẩn/strip khi hiển thị** cho cả học sinh lẫn admin — không lộ đáp án qua tô màu.
- Có công cụ **highlight màu vàng** và **gạch đôi chữ** (không phải underline) trên đoạn văn — bôi đen chữ hiện thanh công cụ nổi, chuột phải vào chỗ đã đánh dấu để xoá. Vùng đề dùng `contenteditable` chỉ để cho phép bôi đen/copy, có chặn gõ/xoá/dán chữ thật.
- Nút **"Nộp bài"** luôn nằm bên phải khu vực nút bấm.
- Nút "Xem đáp án" chỉ hiện với admin, nằm cạnh nút Nộp bài (không thay thế).

## Trang kết quả (`review.html`)

- Điểm tổng + % ở đầu, tô nền **xanh (đúng)/đỏ (sai)** từng câu kèm giải thích.
- Có thêm dải ô thống kê: **breakdown theo từng passage** (x/y mỗi passage nếu đề có >1 passage), **band IELTS ước tính** (chỉ tính khi đề đủ 3 passage, không thì hiện `--/--`, dùng bảng quy đổi điểm thô chuẩn IELTS Academic Reading), **thời gian đã dùng/giới hạn đề** (định dạng mm:ss, hiện "Không giới hạn" nếu đề không giới hạn thời gian).
- Thời gian làm bài thực tế được tính từ lúc `exam.html` render xong đề tới lúc bấm Nộp/hết giờ (`examStartedAt` → `elapsedSeconds`), gửi kèm khi submit, lưu vào `Attempts.ElapsedSeconds`.

## Schema Airtable (7 bảng — xem chi tiết đầy đủ trong README.md)

- `Exams.PassagesJson` (không phải `PassageHtml` cũ — cột cũ vẫn còn trong Airtable nhưng không dùng nữa, không cần xoá).
- `Questions.PassageOrder` (Number) — bắt buộc phải có để nhóm câu hỏi theo passage.
- `Attempts.ElapsedSeconds` + `Attempts.TimeLimitMinutes` (Number) — mới thêm để phục vụ report thời gian.
- `StudentId`/`ExamId` trong `Attempts`/`WritingSubmissions` là **Single line text chứa record id dạng chuỗi thường**, KHÔNG phải Airtable Linked Record — code query bằng `filterByFormula` dạng so sánh chuỗi (`{StudentId} = "..."`), không dùng `ARRAYJOIN`/`FIND`.

## Auth / bảo mật

- Token học sinh hết hạn sau 30 ngày (mặc định của hàm `sign()`).
- Token admin hết hạn sau **7 ngày** (đã tăng từ 12 tiếng ban đầu vì chủ web hay bị văng ra giữa chừng lúc test).
- `submit-attempt.js` chấp nhận cả role `student` lẫn `admin` (để admin tự test đề cũng chấm điểm được). `get-history.js` **cũng đã đổi để chấp nhận cả admin** (`requireAuth(event, "student") || requireAuth(event, "admin")`) — admin tự làm bài test giờ xem được lịch sử của chính mình ở `/profile.html`, nav bar admin có thêm link "Lịch sử làm bài". `profile.html` ẩn phần "Đổi mật khẩu" và "Writing đã nộp" khi đăng nhập bằng admin (2 phần này chỉ hoạt động đúng với bảng `Students`).
- API key Airtable chỉ nằm server-side (Netlify Functions + script local đọc `.env`), không bao giờ lộ ra client.

## Cập nhật — trang kết quả: 3 ô thống kê (đã đổi từ vòng tròn sang ô vuông bo góc)

- `review.html` hiển thị 3 ô thống kê đầu trang: **Correct Answers** (xanh lá, `var(--correct)`), **Band IELTS ước tính** (tím accent, `var(--accent)`), **Thời gian dùng** (cyan, `var(--accent-2)`). Mỗi ô có icon + giá trị to + label, dạng thẻ vuông bo góc (`.stat-box`, `border-radius: 14px`), KHÔNG dùng vòng tròn SVG nữa (bản đầu tiên dùng ring SVG nhưng tốn diện tích hơn — đã đổi sang ô vuông đơn giản theo yêu cầu để tiết kiệm space).
- Đã bỏ hẳn class `.score-banner` cũ (điểm to + %) — không dùng nữa, thay hoàn toàn bằng `.stat-box-row`.
- Breakdown theo passage (nếu đề >1 passage) vẫn giữ dạng ô vuông (`statTile`) đặt ngay dưới hàng stat-box, cùng phong cách.

## Cập nhật — nút "Xem lại bài làm" (full replay) trong review.html

- Bỏ hẳn danh sách giải thích phẳng dưới điểm số. Thay bằng nút **"📖 Xem lại bài làm"** — bấm vào mới tải lại (`get-exam`) và render **y hệt layout 2 cột của `exam.html`** (đề trái/câu hỏi phải) nhưng ở chế độ chỉ xem:
  - Mỗi câu hiện đáp án học sinh đã chọn dạng **pill màu** (`answer-pill`): nền xanh nhạt nếu đúng, đỏ nếu sai kèm đáp án đúng hiện ngay bên cạnh.
  - Đoạn văn được inject lại **highlight vàng** (`kw-highlight`, dùng chung màu `#fde047` với tool highlight tay) tại đúng vị trí `keywordHighlight` của từng câu, có **badge tròn xanh số thứ tự câu** (`kw-badge`) đứng ngay trước — xử lý theo thứ tự tu khoá dài trước để tránh tu khoa ngắn (la substring) chèn đè lên nhau.
  - Cần backend trả về `examRecordId` (record id thật của Exams) trong `submit-attempt.js` và `get-history.js` để trang review gọi lại `get-exam` lấy `passages` gốc.
  - Giải thích (`explanation`) của từng câu vẫn giữ, hiển thị nhỏ ngay dưới mỗi câu trong lúc xem lại (không còn là danh sách riêng ở cuối trang).

## Cập nhật — `scripts/push-exam.js` hỗ trợ cập nhật đề đã có

- Thêm cờ `--update <examId>`: `node scripts/push-exam.js <thu-muc-de> --update <examId>`. Dùng khi cần sửa lại nội dung (vd giải thích đáp án chi tiết hơn) của đề **đã đẩy lên Airtable rồi**, thay vì chạy lệnh gốc sẽ tạo ra một đề trùng với `examId` mới.
- Cơ chế: giữ nguyên `examId`/record Exams, `updateRecord` đè fields của Exams, xoá hết Questions cũ theo `ExamId` rồi tạo lại từ `exam.json` mới. Vì `Attempts` lưu snapshot câu trả lời trong `AnswersJson` lúc nộp bài (không link sống tới Questions), xoá/tạo lại Questions không ảnh hưởng lịch sử làm bài cũ.
- Lý do thêm: giải thích đáp án soạn lần đầu cho đề "Finches on Islands" bị rút gọn quá so với file PDF giải thích gốc user cung cấp — cần cách cập nhật lại mà không tạo đề trùng.

## Cập nhật — bo tròn viền/khung (border-radius) cho đỡ nhức mắt

- Tăng bo góc chung, không dùng góc vuông/bo nhẹ nữa:
  - `--radius` (biến dùng cho khung `.card`, `.passage`, `.exam-layout .passage-col`): 10px → **14px**.
  - Highlight từ khoá (`.kw-highlight`, `.passage mark`): 3px → **6px**, thêm padding ngang 4px cho thoáng.
  - Khung câu hỏi trong lúc làm bài (`.question-block`): đổi từ kiểu liệt kê có gạch ngang dưới (`border-bottom`) sang **từng câu 1 khung bo góc riêng** (`border-radius: 12px`, có nền + viền), giống các khung card khác trong web.
  - Khung giải thích đáp án admin (`.admin-answer-note`): 6px → 12px.
  - Pill đáp án đúng/sai trong trang xem lại (`.answer-pill`): 6px → **999px (bo tròn hoàn toàn dạng viên thuốc)**.
  - Timer, thanh công cụ nổi highlight/gạch chữ (`.timer`, `.selection-toolbar`, `.remove-highlight-menu`): 8px → 12px.
- Giới hạn đã biết: highlight vàng do người dùng tự bôi bằng công cụ 🖍️ Highlight lúc làm bài (dùng `document.execCommand("hiliteColor")`) là trình duyệt tự vẽ trực tiếp, không qua CSS class — **không bo góc được**. Chỉ phần highlight từ khoá tự động chèn ở trang xem lại kết quả (`kw-highlight`) là bo tròn được.

## Cập nhật — sửa lỗi highlight từ khoá không đồng nhất ở trang xem lại (`review.html`)

- Nguyên nhân: đoạn văn gốc trong `exam.json` có sẵn thẻ `<mark>` đánh dấu nội bộ vị trí đáp án (dùng để tiện đối chiếu khi soạn đề). Trang `exam.html` lúc làm bài có hàm `stripKeywordMarks()` xoá các thẻ `<mark>` này trước khi hiển thị, nhưng trang `review.html` (xem lại bài làm) **quên gọi hàm tương tự** — khiến hàm `injectKeywordHighlights()` chèn thêm 1 lớp `<mark class="kw-highlight">` mới lồng bên trong thẻ `<mark>` gốc, tạo ra 2 lớp mark lồng nhau → viền/màu hiển thị không đồng nhất (1 lớp có bo góc/màu vàng đúng, 1 lớp còn lại là style mặc định của trình duyệt, vuông góc).
- Đã fix: thêm hàm `stripKeywordMarks()` (copy y hệt logic bên `exam.html`) vào `review.html`, gọi trước khi chèn highlight từ khoá trong `injectKeywordHighlights()`.
- Ghi nhớ: nếu sau này có thêm trang nào khác cũng hiển thị lại `passage.html` gốc (vd 1 trang thống kê/in đề mới), phải nhớ strip `<mark>` trước khi render, không thì lặp lại lỗi này.

## Cập nhật — sửa lỗi JSON bị lộ ra ngoài trang ở danh sách "Lịch sử làm bài" (`profile.html`)

- Nguyên nhân: mỗi dòng lịch sử dùng `onclick='sessionStorage.setItem("last_result", JSON.stringify({...}))'` nhúng thẳng JSON vào thuộc tính HTML (bọc bằng dấu nháy đơn `'...'`). Khi dữ liệu `explanation`/`keywordHighlight` của câu hỏi có chứa dấu nháy đơn thật (vd chữ "Darwin's", "Grants'"), dấu nháy đó vô tình đóng sớm thuộc tính `onclick`, khiến phần JSON còn lại bị trình duyệt hiểu là nội dung text và in thẳng ra trang — không phải lỗi hiển thị mà là lỗi cấu trúc HTML.
- Đã fix: bỏ hẳn kiểu nhúng JSON vào attribute HTML. Thay bằng gắn `data-attempt-id` lên mỗi thẻ `<a>`, rồi dùng `addEventListener("click", ...)` để lấy lại đúng object từ mảng `attempts` đã fetch sẵn trong JS (không serialize gì vào HTML cả).
- Ghi nhớ: **không bao giờ nhúng JSON.stringify(...) trực tiếp vào thuộc tính HTML** (onclick, onload, v.v.) dù escape kiểu gì, vì dữ liệu text tự do (câu hỏi, giải thích...) luôn có khả năng chứa ký tự phá cấu trúc (nháy đơn, nháy kép, `<`, `>`). Luôn dùng `addEventListener` + tra cứu lại từ biến JS, hoặc `data-*` attribute với giá trị đã qua `encodeURIComponent`.

## Cập nhật — xoá bài làm khỏi lịch sử + hiện Band thay vì số câu khi đề đủ 40 câu

- Thêm function mới `netlify/functions/delete-attempt.js`: nhận `attemptId`, yêu cầu đăng nhập (student hoặc admin), kiểm tra `attempt.StudentId === user.sub` (chỉ xoá được bài của chính mình) rồi xoá record khỏi bảng `Attempts`.
- `profile.html`: mỗi dòng lịch sử có thêm nút 🗑️ (`.icon-btn`) để xoá ngay tại chỗ, xoá xong tự cập nhật lại danh sách (không cần load lại trang).
- Badge điểm ở danh sách lịch sử (`profile.html`) và ở trang kết quả (`review.html`): nếu tổng số câu **đúng bằng 40** thì hiện **Band ước tính** (vd "Band 6.5") thay vì số câu đúng thô (vd "26/40") — dùng chung bảng quy đổi `IELTS_READING_BAND_TABLE`/`estimateBand()` (định nghĩa ở cả 2 file, `profile.html` copy từ `review.html`). Đề chưa đủ 40 câu (như đề test "Finches on Islands" 13 câu) vẫn hiện dạng `x/y` như cũ.
- Đã đổi điều kiện hiện band ở `review.html` từ `passageCount === 3` sang `total === 40` cho đồng nhất và đúng bản chất (band IELTS Reading tính theo tổng 40 câu chuẩn, không phải theo số passage).

## Cập nhật — trang làm bài Writing hỗ trợ nhiều Task (`writing.html`) + đổi cách sinh examId

- **Writing giờ có nhiều Task** (thường là Task 1 + Task 2 như đề thật IELTS): `exam.json` của Writing dùng mảng `tasks: [{order, title, promptHtml}, ...]` thay cho field `prompt` đơn lẻ cũ. `Exams.TasksJson` (Long text, JSON) thay cho `Exams.Prompt` (field cũ vẫn còn trên Airtable nhưng không dùng nữa, không cần xoá).
- `writing.html` hiển thị **từng Task một** (không phải cuộn dài), có thanh chuyển task ở dưới cùng dạng `[← Task trước] [chấm tròn tên task] [Task sau →]`, giữ nguyên nội dung đã gõ khi chuyển qua lại giữa các task (lưu tạm trong biến JS `essayValues` theo `task.order`, không mất chữ). Nút "Nộp bài" gửi TẤT CẢ các task cùng lúc.
- **Nếu Task có ảnh** (`promptHtml` chứa `<img>`, điển hình Task 1 có biểu đồ) → hiển thị dạng **chia đôi màn hình kéo được**: đề+ảnh bên trái, khung viết bài bên phải, có thanh kéo chuột ở giữa (`.resizer`, kéo chỉnh tỷ lệ 25%-75%) để học sinh vừa xem biểu đồ vừa viết mà không cần cuộn qua lại.
- **Nếu Task không có ảnh** (điển hình Task 2 chỉ có chữ) → hiển thị dạng xếp chồng đơn giản: đề ở trên (dạng card), khung viết bài full-width ở dưới — giống layout Writing cũ, không cần chia đôi màn hình.
- Backend: `submit-writing.js` nhận `essays: [{taskOrder, essayText}]` thay vì `essayText` đơn lẻ, lưu vào `WritingSubmissions.EssaysJson` (Long text, JSON) thay cho `EssayText` cũ (field cũ vẫn còn, không dùng nữa). `admin-list-writing.js`, `admin/grade.html`, `get-history.js` đều đã cập nhật để đọc/hiển thị từng task riêng biệt trong 1 bài nộp. Việc chấm điểm (4 tiêu chí TA/CC/LR/GRA) vẫn là 1 bộ điểm tổng cho cả bài nộp (không tách điểm theo từng task) — admin đọc cả 2 task rồi cho 1 bộ điểm chung, giống cách chấm IELTS thật.

- **QUAN TRỌNG — đổi cách sinh `examId`**: trước đây `examId` = slugify(title) + số ngẫu nhiên theo thời gian push (không đoán trước được), khiến không thể biết trước đường dẫn ảnh lúc soạn `exam.json`. Giờ đổi thành: `examId` = slugify(đường dẫn thư mục đề tính từ `exam-source/`, vd thư mục `exam-source/writing/đề 1` → examId `writing-e-1`) — **cố định, đoán trước được ngay khi soạn đề**, nên ảnh trong `exam.json` (Reading passages hoặc Writing tasks) có thể trỏ thẳng `/exam-images/<examId>/ten-anh.png` mà không cần chạy thử mới biết ID.
  - `scripts/push-exam.js`: bỏ hẳn cách sinh ID từ title+timestamp. Nếu chạy KHÔNG có `--update` mà `examId` đã tồn tại trên Airtable → báo lỗi và dừng (tránh tạo trùng đề); phải thêm `--update` vào cuối lệnh để ghi đè.
  - `--update` giờ **không cần gõ examId nữa** (tự suy ra từ đường dẫn thư mục) — chỉ cần: `node scripts/push-exam.js <thu-muc-de> --update`.
  - Đề "Finches on Islands" đã đẩy trước đó vẫn giữ nguyên ID cũ (dạng ngẫu nhiên) — không bị ảnh hưởng, không cần di chuyển lại thư mục.
- Đề Writing đầu tiên "Hosting International Sports Events" đã soạn ở `exam-source/writing/đề 1/exam.json` (Task 1 có biểu đồ `task1-chart.png`, Task 2 là bài luận thảo luận 2 quan điểm) — đã push thành công, examId `writing-e-1`.
- Fix: `writing.html` guard và `submit-writing.js` ban đầu chỉ chấp nhận role `student` (bắt chước bug tương tự đã gặp ở `profile.html`/`get-history.js` trước đây) khiến admin bấm vào làm đề Writing bị bắt đăng nhập lại liên tục. Đã sửa cả 2 chỗ chấp nhận thêm role `admin`, đồng bộ với `exam.html`/`submit-attempt.js`.

## Cập nhật — công cụ highlight/gạch chân/gạch ngang khi admin chấm bài Writing (`admin/grade.html`)

- Mỗi bài luận hiện trong khung `.essay-view` (contenteditable, chặn gõ/xoá/dán như `.passage-col` bên `exam.html`), bôi đen chữ sẽ hiện thanh công cụ nổi với 3 nút: 🖍️ Highlight (vàng), Gạch chân, Gạch ngang (đôi, màu đỏ) — chuột phải vào chỗ đã đánh dấu để xoá. Mục đích: admin đọc và đánh dấu trực tiếp lên bài học sinh lúc chấm điểm, giống giáo viên chấm bài giấy.
- Vì trang có thể liệt kê nhiều bài chờ chấm (nhiều khung `.essay-view` cùng lúc, danh sách render lại mỗi lần load), logic dùng **event delegation trên `document`** (`e.target.closest(".essay-view")`) thay vì gắn listener riêng cho từng khung — không cần gắn lại listener mỗi lần danh sách thay đổi.
- Class CSS `.essay-view` (nền + viền + bo góc, `white-space: pre-wrap` giữ xuống dòng của bài viết gốc) thêm vào `style.css`, dùng chung màu gạch ngang (đỏ, đôi nét) với `.passage-col strike/s`.
- 2 nút toolbar đổi từ text đầy đủ ("🖍️ Highlight", "Gạch chân", "Gạch ngang") sang ký hiệu gọn chữ **A** (class `.mark-btn.hl/.ul/.st`, style riêng từng nút: nền vàng / gạch chân tím / gạch ngang đỏ đôi nét) có tooltip `title` — áp dụng đồng bộ cho cả thanh công cụ bên `exam.html`.

## Cập nhật — bài Writing đã chấm vẫn xem lại được (không biến mất ngay)

- `admin/grade.html` có 2 tab **"Chờ chấm" / "Đã chấm"**. Trước đây chấm xong (`Status` chuyển `pending` → `graded`) thì bài biến mất khỏi trang luôn, không xem lại được nữa. Giờ tab "Đã chấm" gọi `admin-list-writing?status=graded`, hiển thị lại bài viết (vẫn có công cụ highlight/gạch, nhưng chỉ để đọc lại — không lưu lại các dấu highlight/gạch, giống hạn chế của công cụ bên `exam.html`) kèm điểm 4 tiêu chí + comment đã chấm (dạng chỉ xem, không sửa lại được — tránh tạo bản ghi `WritingFeedback` trùng cho cùng 1 submission).
- `admin-list-writing.js` giờ trả thêm `status` và `feedback` (join bảng `WritingFeedback` theo `SubmissionRecordId`, giống cách `get-history.js` làm) cho mỗi submission.
- Bài Writing (cả pending lẫn graded) vẫn tuân theo quy tắc tự xoá sau **15 ngày** chung của cả hệ thống (`cleanup-history.js` xoá cả `Attempts` lẫn `WritingSubmissions` theo `SubmittedAt`) — không có ngoại lệ riêng cho bài đã chấm.

## Cập nhật — Dashboard admin đổi từ bảng điểm TB theo đề sang danh sách hoạt động thô theo dòng

- `admin/dashboard.html`: bỏ bảng "Điểm trung bình theo đề" (`examStats`, tổng hợp/trung bình) — loại phân tích tổng hợp này **thuộc về trang `admin/report.html`** (report theo học sinh, chưa đụng tới). Dashboard giờ chỉ hiện: 4 ô tổng số (đề/học sinh/lượt làm/writing chờ chấm, vẫn lấy từ `admin-report.js`) + bảng **"Hoạt động gần đây"** liệt kê từng lượt làm bài Reading/THPT theo dòng: học sinh, đề, điểm, thời gian dùng, ngày làm — không gộp/tính trung bình gì cả, đúng 1 dòng = 1 lượt làm.
- Thêm function mới `admin-recent-activity.js`: lấy toàn bộ `Attempts` (sort mới nhất trước), join tên qua cả bảng `Students` lẫn `AdminAccounts` (bài admin tự test hiện kèm nhãn "(admin)" để phân biệt với học sinh thật).
- Mỗi dòng có link **"Chi tiết →"** dẫn thẳng sang `/review.html?attempt=<id>` (dùng lại nguyên trang report/xem-lại-bài-làm đã có sẵn, không tạo trang mới) — lưu data vào `sessionStorage` theo đúng key `last_result` mà `review.html` đã đọc, tránh lặp lại bug nhúng JSON vào thuộc tính HTML (dùng `data-idx` + `addEventListener`, không dùng `onclick='...JSON...'`).
- **Bug đã fix (mở rộng)**: không chỉ `Attempts`, kiểm tra lại thì các bảng `Exams`, `Questions`, `WritingSubmissions`, `WritingFeedback` đều có sẵn **3 dòng trống mặc định** (Airtable tự tạo khi mới lập bảng, chưa ai xoá) — `Students` thì không có dòng trống nào. Hậu quả: dashboard hiện "undefined", `totals.exams`/`totals.attempts` ở `admin-report.js` bị tính dư 3, và `get-exams.js` (danh sách đề cho học sinh chọn) có nguy cơ hiện thẻ đề trống.
  - Đã thêm bộ lọc bỏ dòng trống ở: `get-exams.js` (lọc theo `ExamId` tồn tại), `admin-report.js` (lọc `Exams` theo `ExamId`, `Attempts`/`WritingSubmissions` theo `SubmittedAt`, `Students` theo `Username`), `admin-recent-activity.js` (lọc theo `SubmittedAt`).
  - `Questions`/`WritingSubmissions`/`WritingFeedback` các chỗ dùng `filterByFormula` để truy vấn (get-exam.js, admin-list-writing.js) **tự động đã loại trừ dòng trống** rồi (vì filter so sánh field trống với giá trị thật không bao giờ khớp) — không cần sửa thêm.
  - **Khuyến nghị**: vào Airtable xoá tay 3 dòng trống ở mỗi bảng `Exams`, `Questions`, `WritingSubmissions`, `WritingFeedback`, `Attempts` cho gọn — không bắt buộc vì code đã lọc phòng thủ ở các chỗ quan trọng, nhưng dữ liệu rác vẫn tồn tại trong Airtable nếu không xoá tay.

## Cập nhật — trang "Hiệu suất" cho admin (`admin/performance.html`)

- Ý tưởng theo tham khảo 1 dashboard IELTS test-tracker (Target Score, Average Score, Total Tests, Average Time, Accuracy, biểu đồ điểm theo thời gian, bảng độ chính xác theo dạng câu hỏi).
- Luồng: trang liệt kê danh sách username học sinh (giống `admin/students.html`) → bấm "Xem hiệu suất" → hiện 3 khung riêng: **IELTS Reading**, **THPT Reading**, **IELTS Writing**.
- Mỗi khung Reading/THPT gồm: tổng lượt làm, điểm TB (hiện Band nếu đề đủ 40 câu, không thì hiện %), thời gian TB, **biểu đồ đường điểm theo thời gian** (tự vẽ bằng SVG polyline, không dùng thư viện chart ngoài — đúng tinh thần "không phụ thuộc dịch vụ trả phí"), và **bảng độ chính xác theo từng dạng câu hỏi** (vd True/False/Not Given, Table Completion, Summary Completion...).
- Khung Writing gồm: tổng bài nộp, Overall TB + trung bình từng tiêu chí TA/CC/LR/GRA (chỉ tính trên bài đã chấm), biểu đồ Overall theo thời gian. Không có bảng "độ chính xác theo dạng câu" vì Writing không chấm tự động theo câu.
- **Field mới bắt buộc để làm được phần "độ chính xác theo dạng câu hỏi"**: `Questions.SkillTag` (Single line text) — tên dạng câu hỏi IELTS thật (vd "True/False/Not Given", "Multiple Choice", "Matching Information", "Matching Headings", "Sentence Completion", "Summary Completion", "Table/Note/Flow-chart Completion", "Short Answer Questions"), **KHÔNG phải** field `Type` cũ (mc/tf/fill — chỉ là kiểu input để render UI). Claude tự gắn tag phù hợp khi soạn `exam.json` cho từng đề, không cần hỏi lại người dùng. `push-exam.js` đã cập nhật để ghi field này; `submit-attempt.js` lưu `skillTag` vào từng câu trong snapshot `AnswersJson` (để thống kê lịch sử chính xác dù sau này câu hỏi gốc bị sửa/xoá).
- **Field mới khác**: `Attempts.Category` (Single line text) — snapshot lại `Category` của đề (IELTS Reading / THPT Reading) ngay lúc nộp bài, để phân biệt 2 loại Reading trong cùng 1 bảng `Attempts` mà không cần join lại bảng `Exams`.
- Backend mới: `admin-student-performance.js?studentId=<id>` — gộp tính toán tất cả các số liệu trên cho 1 học sinh, dùng lại bảng quy đổi band `IELTS_READING_BAND_TABLE` (giống `review.html`).
- Đề "Finches on Islands" (13 câu) đã gắn tag mẫu: câu 1-4 = Table Completion, câu 5-8 = Summary Completion, câu 9-13 = True/False/Not Given — làm ví dụ tham khảo cách gắn tag cho các đề sau.

## Cập nhật — chấm Writing tách riêng theo từng Task, tính Overall theo trọng số IELTS thật (Task 1 = 1/3, Task 2 = 2/3)

- Trước đây `admin/grade.html` chỉ có **1 bộ điểm TA/CC/LR/GRA chung** cho cả bài Writing (gộp cả Task 1 lẫn Task 2). Giờ đổi thành **chấm riêng từng Task** — mỗi task có input TA/CC/LR/GRA + Comment riêng, `Overall` của từng task = trung bình 4 tiêu chí (làm tròn 0.5, giống công thức cũ).
- `Overall` cuối cùng của cả bài nộp = **trọng số chính thức IELTS**: Task 1 × 1 + Task 2 × 2, chia 3 (`admin-grade-writing.js`, hàm `weightForTaskIndex`). Nếu vì lý do gì đó đề không đúng 2 task thì fallback về trung bình đều (không có trọng số).
- Schema: `WritingFeedback.FeedbackJson` (Long text, JSON: mảng `[{taskOrder, ta, cc, lr, gra, overall, comment}]`) thay cho 5 cột `TA/CC/LR/GRA/Comment` cũ (cột cũ vẫn còn trên Airtable, không dùng nữa — không cần xoá). `Overall` (Number) vẫn giữ nguyên, lưu con số **đã tính trọng số** của cả bài.
- Các chỗ đọc feedback (`admin-list-writing.js`, `get-history.js`, `admin-student-performance.js`) đều có hàm `shapeFeedback()`/tương đương: đọc `FeedbackJson` nếu có, **fallback về dạng cũ** (1 bộ TA/CC/LR/GRA/Comment/Overall coi như "Task 1") nếu bản ghi cũ chưa có `FeedbackJson` — tránh vỡ dữ liệu cũ.
- `profile.html` (học sinh xem feedback) và `admin/grade.html` (tab "Đã chấm") đều hiện Overall tổng + breakdown theo từng Task riêng.
- Trang Hiệu suất (`admin/performance.html`) — khung Writing: `averageTA/CC/LR/GRA` tính trung bình phẳng qua TẤT CẢ các task đã chấm (không áp trọng số 1/3-2/3, vì đó là điểm từng tiêu chí chứ không phải Overall); `averageOverall` và biểu đồ theo thời gian dùng đúng `Overall` đã có trọng số.

## Cập nhật — đề THPT đầu tiên (Mã đề 1101, 2026) + cách gắn SkillTag cho THPT Reading

- Đề nguồn `exam-source/thpt/de-1101/` (docx đề gốc dạng ảnh scan + PDF giải thích chi tiết kèm bảng đáp án chính thức) — đã soạn thành `exam.json` 40 câu / 6 "passage" (examId `thpt-de-1101`), push thành công.
- Cấu trúc đề thật gồm 6 phần xen kẽ điền từ (cloze) và đọc hiểu thật, KHÔNG chỉ thuần "đọc hiểu": Phần I (Câu 1-6, cloze thông báo), Phần II (Câu 7-11, sắp xếp câu/hội thoại — không có đoạn văn chung, mỗi câu tự chứa các câu xáo trộn ngay trong `questionText`), Phần III (Câu 12-16, cloze đoạn "Psychology of Money" — **được ghi chú rõ trong tài liệu gốc là dạng khó nhất về ngữ pháp trong đề**), Phần IV (Câu 17-26, đọc hiểu Kinh tế môi trường), Phần V (Câu 27-32, cloze thông báo tuyển dụng), Phần VI (Câu 33-40, đọc hiểu Ghi chép tay/gõ máy).
- Quy ước gắn `SkillTag` cho THPT (khác IELTS Reading vì THPT có nhiều dạng bài hơn):
  - Cloze (Phần I, III, V): tag `"Điền từ/cụm từ (Cloze)"`, riêng Phần III tag `"Reading khó"` theo đúng yêu cầu — đây là phần được xác nhận khó nhất trong tài liệu giải thích gốc.
  - Sắp xếp câu/hội thoại (Phần II): tag `"Sắp xếp câu/hội thoại"`.
  - 2 bài đọc hiểu thật (Phần IV, VI): tách `"Reading"` (câu hỏi từ vựng, chi tiết trực tiếp, tham chiếu, vị trí chèn câu, vị trí thông tin) vs `"Inference"` (câu hỏi NOT-implied, tóm tắt đoạn, kết luận rút ra, có thể suy luận, tiêu đề phù hợp, ý định người viết, quan điểm người viết KHÔNG đồng ý) — theo đúng bản chất câu hỏi, không chỉ dựa vào chữ "infer" xuất hiện trong đề.
- `timeLimitMinutes`: ban đầu tạm để 60 vì lúc đó 50 chưa nằm trong danh sách hợp lệ — **đã sửa lại đúng 50 phút thật** sau khi thêm mốc mặc định THPT (xem mục "Mặc định thời gian" ở trên) và thêm 50 vào `VALID_TIME_LIMITS_BY_CATEGORY["THPT Reading"]`.
- File gốc (docx scan + pdf giải thích) giữ nguyên trong `exam-source/thpt/de-1101/` để đối chiếu sau này nếu cần sửa đề.

## Cập nhật — sửa lỗi tính điểm THPT nhầm sang thang Band IELTS

- Bug: `review.html` trước đó chỉ check `total === 40` để quyết định hiện "Band IELTS ước tính" — đề THPT "Mã đề 1101" cũng có đúng 40 câu nên bị tính band IELTS sai hoàn toàn (band không áp dụng cho THPT).
- Đã fix: mọi chỗ tính điểm giờ dựa vào `Category` của đề (đã lưu sẵn trong `Attempts.Category` từ trước) thay vì chỉ đếm số câu:
  - `IELTS Reading` (đủ 40 câu): hiện **Band ước tính** (thang 0-9.0), giữ nguyên bảng quy đổi cũ.
  - `THPT Reading`: hiện **điểm thang 10** (`score/total*10`, làm tròn 2 chữ số thập phân — đúng cách tính điểm thi thật, 1 câu = 10/tổng số câu điểm).
  - Category khác/không xác định: hiện `x/y` số câu đúng như cũ.
- Phải lan truyền field `category` qua toàn bộ luồng dữ liệu (trước đây chỉ lưu ở Airtable, chưa trả về client): `submit-attempt.js`, `get-history.js`, `admin-recent-activity.js` trả thêm `category`; `profile.html`, `admin/dashboard.html` lưu thêm `category` vào `sessionStorage` khi điều hướng sang `review.html`.
- `admin-student-performance.js`: `buildReadingCategoryStats(attempts, useBand)` giờ nhận thêm tham số `useBand` — chỉ tính Band khi gọi cho bucket `"IELTS Reading"` (`useBand=true`), luôn tính thêm `averageScore10` (điểm thang 10) để bucket `"THPT Reading"` dùng (`useBand=false`). `admin/performance.html` hiển thị đúng theo cờ này thay vì đoán qua số câu.

## Cập nhật — khung Writing ở trang Hiệu suất tách điểm TA/CC/LR/GRA riêng theo từng Task

- Trước đó khung Writing gộp phẳng tất cả các task đã chấm thành 1 con số trung bình TA/CC/LR/GRA chung (không phân biệt Task 1/Task 2). Giờ `admin-student-performance.js` trả về `writingStats.tasks` — mảng theo `taskOrder`, mỗi phần tử có `averageTA/CC/LR/GRA/Overall` **chỉ tính trên đúng task đó** (Task 1 gộp riêng với Task 1, Task 2 gộp riêng với Task 2, không trộn).
- `averageOverall` tổng vẫn hiện riêng 1 ô, ghi rõ chú thích "đã tính trọng số Task 1×⅓ + Task 2×⅔" để khỏi nhầm với trung bình cộng 2 task.
- `admin/performance.html` (`writingPanelHtml`) render từng khối "Task 1", "Task 2"... riêng biệt bên dưới hàng tổng quan.
- Cơ chế cập nhật: mỗi lần admin chấm xong 1 bài (`admin-grade-writing.js` tạo `WritingFeedback` mới), lần load tiếp theo của trang Hiệu suất tự tính lại ngay vì hàm luôn query trực tiếp Airtable (không cache) — không cần thao tác thêm. Phạm vi tự nhiên giới hạn trong 15 ngày gần nhất vì bài cũ hơn đã bị `cleanup-history.js` xoá khỏi Airtable, không cần lọc ngày thủ công.

## Cập nhật — trang tự đăng ký tài khoản admin (`admin/register.html`), chặn bằng mã PIN nội bộ

- Trước đây tạo admin CHỈ qua `scripts/seed-admin.js` (chạy tay trên máy, in ra hash để dán thủ công vào Airtable). Giờ có thêm cách tự đăng ký qua web tại `/admin/register.html` (link nhỏ ở dưới trang `/admin/login.html`), dùng cho **nội bộ** — cần đúng mã PIN mới tạo được tài khoản, không phải ai vào web cũng tự tạo admin được.
- Mã PIN hiện tại: **`1368`**, lưu trong biến môi trường `ADMIN_REGISTER_PIN` (file `.env` local, và phải khai báo thêm trên Netlify Site settings → Environment variables khi deploy thật — xem README Bước 3 & Bước 6). Kiểm tra PIN hoàn toàn ở server-side (`admin-register.js`), không lộ ra client.
- `admin-register.js`: nhận `username/password/pin`, check PIN đúng, check username chưa tồn tại trong `AdminAccounts`, hash mật khẩu, tạo record, trả token đăng nhập luôn (auto-login sau khi đăng ký, giống `register.js` bên học sinh) — token admin hết hạn 7 ngày như `admin-login.js`.
- Muốn đổi mã PIN: chỉ cần sửa giá trị `ADMIN_REGISTER_PIN` trong `.env` (và trên Netlify nếu đã deploy) — không cần sửa code.
- `scripts/seed-admin.js` vẫn giữ nguyên, dùng khi cần tạo admin trực tiếp qua script mà không qua PIN (vd Claude tạo giúp trong lúc code như đã làm với tài khoản `anhhai`).
