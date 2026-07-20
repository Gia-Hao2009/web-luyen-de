# Luyện Đề — IELTS & THPT Practice Platform

A free, self-hosted web app for practicing IELTS Reading/Writing and the English section of Vietnam's national high school exam (THPT), built and shipped solo while studying for my own IELTS retake and university applications.

**Live site:** [taupe-marzipan-9ef314.netlify.app](https://taupe-marzipan-9ef314.netlify.app) · **Source:** this repository

## Why I built this

I'm a 12th grader in Vietnam prepping for IELTS (7.0 → targeting 8.0) and the THPT national exam, on the way toward a Computer Science degree. Most decent IELTS practice platforms are either paid, ad-cluttered, or built for a generic audience instead of the exact question formats THPT and IELTS actually use. I wanted something that:

- Costs nothing to run or use — no subscriptions, no paid AI grading APIs, nothing my classmates would need to pay for.
- Grades Reading automatically and lets a real person (me) give honest, criteria-based feedback on Writing, instead of pretending an LLM can replace an examiner.
- Lets me drop in a real exam PDF/scan and have it turned into a clean, taggable, gradeable practice test in minutes — not hours of manual data entry.

So I designed the product, made every UX and scoring-logic call, and pair-programmed the implementation with Claude (Anthropic's AI coding assistant) as my primary tool — directing the architecture, reviewing every change, debugging issues myself, and writing all exam content and grading rubrics by hand. Every non-trivial product decision made along the way is logged in [`PROJECT_NOTES.md`](./PROJECT_NOTES.md), which doubles as a running design log of the project.

## What it does

- **IELTS Reading** — 1–3 passage exams, auto-graded, with an estimated band score, a full answer-review replay (keyword highlighting, correct/wrong pills), and accuracy breakdowns by question type (Table Completion, True/False/Not Given, etc.).
- **IELTS Writing** — Task 1 + Task 2, with a resizable split view for chart-based Task 1 prompts. Submissions are graded manually by an admin against the 4 real IELTS criteria (TA/CC/LR/GRA), weighted 1/3–2/3 the way the real exam is scored.
- **THPT Reading** — full-length practice tests matching the real exam format (cloze passages, sentence reordering, reading comprehension), scored on the real 10-point scale.
- **Admin tools** — a dashboard of recent activity, a per-student performance view (score trends over time, accuracy by question type, band/score estimates), and a Writing-grading queue with an in-browser highlighter for annotating essays while grading.
- **Annotation tools** for students while taking a test: highlight and strike-through directly on the passage, same as marking up a paper copy.

## How it's built

A static frontend (`public/`) talking to serverless backend functions (`netlify/functions/`) hosted free on Netlify, with Airtable as the database — no server to maintain, no hosting bill. New exams are never uploaded through a browser form: I drop the source file into a local folder, and Claude converts it into structured exam data and pushes it straight to Airtable via script — the fastest content pipeline I could design for a one-person operation.

| Layer | Choice | Why |
|---|---|---|
| Hosting | Netlify (free tier) | Static hosting + serverless functions in one place, generous free limits |
| Database | Airtable (free tier) | No database ops, good enough at this scale, easy to inspect/fix by hand |
| Auth | Custom HMAC tokens + scrypt hashing | No auth vendor dependency, small enough to fully understand and own |
| Grading | Rule-based (Reading/THPT) + manual (Writing) | Accuracy over the appearance of automation |

## What this project represents to me

It's the first full product I've taken from "I have a problem" to "real people are using this to study" — including the parts that aren't glamorous: data modeling, auth, admin tooling, retention policy, bug triage from actual user reports. I write the specs, make the calls, and use AI the way I intend to use it long-term as a future engineer: as leverage, not a replacement for understanding what I'm shipping.

---

Đây là hướng dẫn để đưa web này lên mạng, viết cho người **chưa từng làm việc này bao giờ**. Cứ làm theo đúng thứ tự từ trên xuống, đừng nhảy cóc.

## Trước tiên: web này gồm những gì?

Để dễ hình dung, có 3 "mảnh ghép":

1. **Cái web bạn nhìn thấy** (các trang HTML, nút bấm, giao diện) — nằm trong thư mục `public/`
2. **Nơi lưu dữ liệu** (tài khoản học sinh, đề thi, điểm số...) — dùng **Airtable**, về cơ bản nó giống một cái Google Sheets nhưng mạnh hơn, có thể dùng như 1 cái database miễn phí mà không cần biết lập trình database
3. **"Người đứng giữa"** xử lý logic (chấm điểm, đăng nhập, lưu bài...) — gọi là **Netlify Functions**, đây là những đoạn code nhỏ chạy trên server của Netlify, không chạy trên máy người dùng

Cả web lẫn "người đứng giữa" đều được host **miễn phí** trên **Netlify**. Chỉ có Airtable là dịch vụ tách riêng (cũng miễn phí ở quy mô nhỏ).

Bạn không cần hiểu sâu cách 3 mảnh này nói chuyện với nhau — chỉ cần làm đúng các bước setup bên dưới là nó tự chạy.

---

## Bước 1 — Tạo tài khoản Airtable và "cái kho" lưu dữ liệu

1. Vào [airtable.com](https://airtable.com), đăng ký tài khoản miễn phí (dùng email của bạn cũng được).
2. Sau khi đăng nhập, tạo mới 1 **Base** (Airtable gọi 1 "kho dữ liệu" là 1 Base) — đặt tên gì cũng được, ví dụ "IELTS Web DB".
3. Trong Base đó, bạn cần tạo đúng **7 bảng (table)** với tên và các cột (Airtable gọi là "field") y hệt danh sách dưới đây. Chỗ này hơi tốn thời gian nhưng chỉ cần làm 1 lần, làm sai tên field thì web sẽ không chạy được nên gõ cẩn thận (kể cả chữ hoa/thường).

> Mẹo: khi tạo field, Airtable sẽ hỏi bạn chọn "Field type" (kiểu dữ liệu) — cứ theo đúng cột "Kiểu" bên dưới.

### Bảng `Students` (tài khoản học sinh)
| Tên cột | Kiểu |
|---|---|
| Username | Single line text |
| PasswordHash | Single line text |
| CreatedAt | Single line text |

### Bảng `AdminAccounts` (tài khoản admin — của bạn)
| Tên cột | Kiểu |
|---|---|
| Username | Single line text |
| PasswordHash | Single line text |

### Bảng `Exams` (danh sách đề thi)
| Tên cột | Kiểu |
|---|---|
| ExamId | Single line text |
| Title | Single line text |
| Category | Single select — tạo sẵn 3 lựa chọn: `IELTS Reading`, `IELTS Writing`, `THPT Reading` |
| TimeLimitMinutes | Number |
| PassagesJson | Long text |
| TasksJson | Long text |
| CreatedAt | Single line text |

### Bảng `Questions` (từng câu hỏi trong 1 đề)
| Tên cột | Kiểu |
|---|---|
| ExamId | Single line text |
| Order | Number |
| PassageOrder | Number |
| Type | Single select — tạo sẵn 3 lựa chọn: `mc`, `tf`, `fill` |
| QuestionText | Long text |
| OptionsJson | Long text |
| CorrectAnswer | Single line text |
| SkillTag | Single line text |
| Explanation | Long text |
| KeywordHighlight | Single line text |
| MaxLength | Number |

### Bảng `Attempts` (kết quả mỗi lần học sinh làm bài Reading)
| Tên cột | Kiểu |
|---|---|
| StudentId | Single line text |
| ExamId | Single line text |
| ExamTitle | Single line text |
| Category | Single line text |
| Score | Number |
| TotalQuestions | Number |
| AnswersJson | Long text |
| ElapsedSeconds | Number |
| TimeLimitMinutes | Number |
| SubmittedAt | Single line text |

### Bảng `WritingSubmissions` (bài Writing học sinh nộp)
| Tên cột | Kiểu |
|---|---|
| StudentId | Single line text |
| ExamId | Single line text |
| ExamTitle | Single line text |
| EssaysJson | Long text |
| Status | Single select — tạo sẵn 2 lựa chọn: `pending`, `graded` |
| SubmittedAt | Single line text |

### Bảng `WritingFeedback` (điểm + nhận xét admin chấm cho bài Writing)
| Tên cột | Kiểu |
|---|---|
| SubmissionRecordId | Single line text |
| FeedbackJson | Long text |
| Overall | Number |
| GradedAt | Single line text |

Tạo xong hết 7 bảng rồi thì bỏ qua các bảng mặc định Airtable tự tạo sẵn (Table 1, Table 2...) — xoá đi cho gọn cũng được, không ảnh hưởng gì.

### Lấy 2 "mã số" quan trọng của Airtable

Web cần 2 thứ để "nói chuyện" được với Airtable:

- **Base ID**: mở Base bạn vừa tạo, nhìn lên thanh địa chỉ trình duyệt, sẽ thấy 1 đoạn dạng `appXXXXXXXXXXXXXX` — copy đoạn đó lại.
- **API Key** (Airtable gọi là "Personal Access Token" — hiểu đơn giản là 1 mật khẩu riêng để chương trình được phép đọc/ghi vào Base của bạn): vào [airtable.com/create/tokens](https://airtable.com/create/tokens) → bấm tạo token mới → đặt tên tuỳ ý → ở phần quyền (scopes) chọn `data.records:read` và `data.records:write` → ở phần "Access" chọn đúng Base bạn vừa tạo → bấm tạo, nó sẽ hiện ra 1 chuỗi dài bắt đầu bằng `pat...` — copy và **lưu lại chỗ an toàn**, vì Airtable chỉ hiện ra 1 lần duy nhất, đóng trang là mất, phải tạo token mới nếu quên.

Giữ cả 2 thứ này lại, bước sau sẽ dùng tới.

---

## Bước 2 — Cài đặt các công cụ cần thiết trên máy

Bạn cần cài 2 thứ (nếu máy chưa có):

1. **Node.js** — tải bản LTS tại [nodejs.org](https://nodejs.org), cài như cài phần mềm bình thường (Next, Next, Finish).
2. **Netlify CLI** — đây là 1 công cụ dòng lệnh giúp chạy thử web ngay trên máy. Mở Command Prompt (hoặc PowerShell) rồi gõ:

```bash
npm install -g netlify-cli
```

Đợi nó cài xong (chỉ cần làm 1 lần cho cả máy tính).

---

## Bước 3 — Điền "chìa khoá bí mật" vào project

Trong thư mục project, có sẵn 1 file tên `.env.example`. Bạn copy file đó, đổi tên bản copy thành `.env` (bỏ chữ `.example`), rồi mở file `.env` bằng Notepad, điền vào:

```
AIRTABLE_API_KEY=dán chuỗi pat... bạn lấy ở Bước 1 vào đây
AIRTABLE_BASE_ID=dán chuỗi app... bạn lấy ở Bước 1 vào đây
AUTH_SECRET=tự gõ đại 1 câu dài random, ví dụ: conmeocuatoiten-Mimi-va-thich-an-ca-2026
ADMIN_REGISTER_PIN=1368
```

`AUTH_SECRET` là 1 chuỗi bí mật để web "ký tên" xác nhận ai đã đăng nhập — bạn tự nghĩ ra 1 câu dài, khó đoán, không cần nhớ, không chia sẻ cho ai là được. Không được để trống.

`ADMIN_REGISTER_PIN` là mã PIN nội bộ để tạo tài khoản admin mới ở trang `/admin/register.html` — chỉ người biết mã này mới đăng ký được admin. Đổi thành số khác tuỳ ý, không chia sẻ công khai.

**Lưu ý quan trọng**: file `.env` chứa mật khẩu/khoá bí mật, tuyệt đối không gửi cho ai, không đăng lên mạng, không commit lên GitHub công khai.

---

## Bước 4 — Tạo tài khoản Admin (tài khoản của bạn để quản lý web)

Web này không có nút "đăng ký admin" công khai (để tránh người lạ tự tạo tài khoản admin). Thay vào đó, mở Command Prompt tại thư mục project, gõ:

```bash
node scripts/seed-admin.js ten-dang-nhap-ban-muon mat-khau-ban-muon
```

Ví dụ: `node scripts/seed-admin.js hao mymatkhau123`

Lệnh này sẽ in ra màn hình 1 đoạn chữ dài gọi là `PasswordHash` (mật khẩu của bạn đã được "mã hoá" — web không lưu mật khẩu thật, chỉ lưu bản mã hoá này cho an toàn). Bạn copy đúng đoạn `PasswordHash` đó.

Sau đó vào Airtable, mở bảng `AdminAccounts`, tạo 1 dòng (record) mới:
- Cột `Username`: gõ đúng tên đăng nhập bạn vừa chọn
- Cột `PasswordHash`: dán y nguyên đoạn chữ dài lúc nãy vào

Xong bước này là bạn đã có tài khoản admin để đăng nhập vào `/admin/login.html`.

---

## Bước 5 — Chạy thử trên máy (KHÔNG cần upload lên Netlify)

Đây là bước quan trọng bạn hỏi: chạy thử trước, thấy ổn rồi mới upload thật, đỡ tốn số lần deploy trên Netlify.

Trong Command Prompt, tại thư mục project, gõ lần lượt:

```bash
npm install
netlify dev
```

Lệnh `npm install` chỉ cần chạy 1 lần đầu tiên (nó tải về vài thư viện nhỏ cần thiết). Lệnh `netlify dev` là lệnh bạn sẽ dùng mỗi lần muốn test — nó tự mở 1 trang web chạy ngay trên máy bạn, y hệt bản thật, tại địa chỉ:

```
http://localhost:8888
```

Mở địa chỉ đó bằng trình duyệt (Chrome, Edge...) là vào được web, thử đăng ký tài khoản học sinh, làm bài, vào trang admin... Sửa file gì trong `public/` là chỉ cần load lại trang là thấy thay đổi ngay, không cần deploy.

**Mẹo an toàn**: muốn test thoải mái mà không sợ làm bẩn dữ liệu thật sau này, bạn có thể tạo thêm 1 Base Airtable thứ 2 chỉ để test (vào Base thật → góc trên có nút tên Base → "Duplicate base" để copy y hệt cấu trúc 7 bảng) rồi tạm thời trỏ `AIRTABLE_BASE_ID` trong `.env` sang Base test này. Test xong đổi lại `AIRTABLE_BASE_ID` về Base thật rồi mới deploy.

Muốn dừng chạy thử: quay lại Command Prompt, bấm `Ctrl + C`.

---

## Bước 6 — Đưa web lên mạng thật (deploy lên Netlify)

Khi đã test ổn rồi, bạn:

1. Vào [netlify.com](https://netlify.com), đăng ký tài khoản miễn phí.
2. Cách dễ nhất: đưa project này lên GitHub (1 kho lưu code miễn phí), rồi trong Netlify chọn "Add new site" → "Import from Git" → chọn đúng repo GitHub của bạn. Netlify tự đọc file `netlify.toml` đã có sẵn trong project để biết cách build.
3. Vào **Site settings → Environment variables** trên Netlify, khai báo lại đúng 4 biến giống hệt trong file `.env` của bạn (nhưng lần này trỏ `AIRTABLE_BASE_ID` về Base **thật**, không phải Base test):
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
   - `AUTH_SECRET`
   - `ADMIN_REGISTER_PIN`
4. Bấm Deploy. Sau vài phút, Netlify cho bạn 1 địa chỉ web dạng `ten-gi-do.netlify.app` — đó là web thật, ai cũng vào được.

Nếu không muốn dùng GitHub, cũng có thể deploy trực tiếp từ máy bằng lệnh `netlify deploy --prod` (Netlify CLI sẽ hỏi vài câu rồi tự upload) — nhưng cách qua GitHub tiện hơn cho lần sau, vì mỗi lần bạn sửa code và đẩy lên GitHub, Netlify tự deploy lại giúp bạn.

---

## Bước 7 — Cách thêm đề thi mới

Web này **không có trang import trên trình duyệt nữa** (đã bỏ, vì thao tác thẳng qua file + Claude nhanh và tiện hơn cho quy mô nhỏ). Quy trình giờ hoàn toàn dựa vào thư mục `exam-source/` ở gốc project:

1. Tạo 1 thư mục con mới trong đúng danh mục: `exam-source/reading/`, `exam-source/writing/`, hoặc `exam-source/thpt/` — đặt tên tuỳ ý, ví dụ `exam-source/reading/de-so-1/`.
2. Bỏ file đề gốc (ưu tiên `.txt` hoặc `.pdf`) vào đúng thư mục đó. Nếu là Reading, bỏ thêm file đáp án + giải thích (đã nhờ AI khác phân tích sẵn). Nếu đề có ảnh/biểu đồ, bỏ luôn file ảnh (`.png`/`.jpg`) vào cùng thư mục.
3. Báo cho Claude (ngay trong cuộc chat code này): *"xử lý đề trong exam-source/reading/de-so-1"*.
4. Claude đọc các file đó, tự soạn ra file `exam.json` đúng chuẩn (xem mẫu ở `exam-source/exam-template.json`), copy ảnh vào `public/exam-images/<examId>/`, rồi chạy:
   ```bash
   node scripts/push-exam.js exam-source/reading/de-so-1
   ```
   Lệnh này đẩy thẳng đề lên Airtable — đề hiện ngay trên web, không cần thao tác gì thêm trên trình duyệt.

Chi tiết đầy đủ (giới hạn thời gian hợp lệ theo từng loại đề, cách khai báo nhiều passage cho 1 đề Reading, lưu ý khi xoá thư mục...) xem trong `exam-source/README.md`.

## Bước 8 — Cách chấm bài Writing

Học sinh nộp bài luận ở trang Writing → bạn (admin) vào mục "Chấm Writing" trong trang admin, đọc bài, cho điểm theo 4 tiêu chí IELTS (TA, CC, LR, GRA) và viết nhận xét → điểm tự hiện lại cho học sinh xem ở trang "Lịch sử" của họ.

## Ghi chú: dữ liệu tự xoá sau 15 ngày

Theo đúng yêu cầu ban đầu, có 1 đoạn code (`cleanup-history.js`) tự động chạy mỗi ngày để xoá các lượt làm bài/bài nộp cũ hơn 15 ngày, tránh Airtable đầy chỗ (bản miễn phí có giới hạn số dòng dữ liệu).

---

Nếu làm tới bước nào bị lỗi, cứ copy nguyên đoạn lỗi hiện ra rồi hỏi lại — đừng tự đoán, báo mình xem giúp.
