// Chay local: node scripts/push-exam.js exam-source/reading/ten-thu-muc-de
//
// Doc file exam.json trong thu muc de (do Claude soan san theo dung schema),
// copy anh (.png/.jpg/.jpeg/.gif) trong cung thu muc do vao public/exam-images/<examId>/,
// roi day thang du lieu de + cau hoi len Airtable — khong can qua trang web nao ca.
//
// examId duoc sinh CO DINH tu duong dan thu muc (vd exam-source/writing/de-1 -> "writing-de-1"),
// khong random nua — de anh trong exam.json co the tro toi /exam-images/<examId>/... ngay tu luc soan,
// khong can biet truoc ID nao khac.
//
// Cap nhat de da day roi (sua noi dung / giai thich...): them --update vao cuoi lenh, vi du:
// node scripts/push-exam.js exam-source/reading/de-1 --update

const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const { createRecord, createRecords, updateRecord, deleteRecord, listRecords } = require("../netlify/functions/_airtable");

const VALID_CATEGORIES = ["IELTS Reading", "IELTS Writing", "THPT Reading"];
// Mac dinh: IELTS Reading 20 phut/passage (1 passage=20, 2=40, 3=60); THPT Reading 50 phut;
// IELTS Writing Task 1=15 + Task 2=45=60 phut. Chi lech khoi mac dinh khi file de goc co
// note ro la de de/kho can chinh gio — van giu them cac moc khac de linh hoat cho truong hop do.
const VALID_TIME_LIMITS_BY_CATEGORY = {
  "IELTS Reading": [0, 20, 30, 40, 45, 60, 75, 90],
  "THPT Reading": [0, 30, 45, 50, 60, 75, 90],
  "IELTS Writing": [0, 15, 30, 45, 60],
};
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const folderArg = process.argv[2];
  const isUpdate = process.argv.includes("--update");
  const idFlagIdx = process.argv.indexOf("--id");
  const explicitId = idFlagIdx !== -1 ? process.argv[idFlagIdx + 1] : null;

  if (!folderArg) {
    console.log("Cach dung: node scripts/push-exam.js <duong-dan-thu-muc-de>");
    console.log("Vi du: node scripts/push-exam.js exam-source/reading/de-so-1");
    console.log("Cap nhat de da co: node scripts/push-exam.js <duong-dan-thu-muc-de> --update");
    console.log("Cap nhat de co examId cu (sinh truoc khi doi sang ID theo thu muc): them --id <examId-cu>");
    process.exit(1);
  }

  const folderPath = path.resolve(folderArg);
  const jsonPath = path.join(folderPath, "exam.json");
  if (!fs.existsSync(jsonPath)) {
    console.log(`Khong tim thay file exam.json trong ${folderPath}`);
    process.exit(1);
  }

  const examSourceRoot = path.join(__dirname, "..", "exam-source");
  const relFromRoot = path.relative(examSourceRoot, folderPath).split(path.sep).join("/");
  const examId = explicitId || slugify(relFromRoot);

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const {
    title,
    category,
    timeLimitMinutes = 0,
    passages = [],
    tasks = [],
    questions = [],
  } = data;

  if (!title || !VALID_CATEGORIES.includes(category)) {
    console.log(`Thieu title hoac category khong hop le (${VALID_CATEGORIES.join(", ")})`);
    process.exit(1);
  }
  const validTimes = VALID_TIME_LIMITS_BY_CATEGORY[category];
  if (!validTimes.includes(timeLimitMinutes)) {
    console.log(`timeLimitMinutes cho ${category} phai la 1 trong: ${validTimes.join(", ")}`);
    process.exit(1);
  }
  if (category !== "IELTS Writing" && (!Array.isArray(questions) || questions.length === 0)) {
    console.log("Can it nhat 1 cau hoi cho de dang Reading");
    process.exit(1);
  }
  if (category === "IELTS Writing" && (!Array.isArray(tasks) || tasks.length === 0)) {
    console.log("De Writing can it nhat 1 task trong mang 'tasks'");
    process.exit(1);
  }

  // Copy anh trong thu muc de vao public/exam-images/<examId>/
  const imageFiles = fs.readdirSync(folderPath).filter((f) =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );
  if (imageFiles.length > 0) {
    const destDir = path.join(__dirname, "..", "public", "exam-images", examId);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of imageFiles) {
      fs.copyFileSync(path.join(folderPath, file), path.join(destDir, file));
      console.log(`Da copy anh: ${file} -> public/exam-images/${examId}/${file}`);
    }
  }

  const examFields = {
    ExamId: examId,
    Title: title,
    Category: category,
    TimeLimitMinutes: timeLimitMinutes,
    PassagesJson: JSON.stringify(passages),
    TasksJson: JSON.stringify(tasks),
  };

  if (isUpdate) {
    const existing = await listRecords("Exams", { filterByFormula: `{ExamId} = "${examId}"` });
    if (existing.length === 0) {
      console.log(`Khong tim thay de nao co ExamId = "${examId}" tren Airtable de cap nhat (thu muc: ${relFromRoot}).`);
      process.exit(1);
    }
    await updateRecord("Exams", existing[0].id, examFields);

    if (category !== "IELTS Writing") {
      const oldQuestions = await listRecords("Questions", { filterByFormula: `{ExamId} = "${examId}"` });
      for (const q of oldQuestions) {
        await deleteRecord("Questions", q.id);
      }
      const questionFields = questions.map((q, idx) => ({
        ExamId: examId,
        Order: q.order ?? idx + 1,
        PassageOrder: q.passageOrder ?? 1,
        Type: q.type,
        QuestionText: q.questionText,
        OptionsJson: q.options ? JSON.stringify(q.options) : "",
        CorrectAnswer: String(q.correctAnswer ?? ""),
        SkillTag: q.skillTag || "",
        Explanation: q.explanation || "",
        KeywordHighlight: q.keywordHighlight || "",
        MaxLength: q.maxLength || null,
      }));
      await createRecords("Questions", questionFields);
    }

    console.log(`\nDa cap nhat de "${title}" tren Airtable thanh cong. examId: ${examId}\n`);
    return;
  }

  const existing = await listRecords("Exams", { filterByFormula: `{ExamId} = "${examId}"` });
  if (existing.length > 0) {
    console.log(`Da co de voi examId "${examId}" tren Airtable roi. Neu muon sua noi dung, chay lai lenh nay kem --update o cuoi.`);
    process.exit(1);
  }

  await createRecord("Exams", { ...examFields, CreatedAt: new Date().toISOString() });

  if (category !== "IELTS Writing") {
    const questionFields = questions.map((q, idx) => ({
      ExamId: examId,
      Order: q.order ?? idx + 1,
      PassageOrder: q.passageOrder ?? 1,
      Type: q.type,
      QuestionText: q.questionText,
      OptionsJson: q.options ? JSON.stringify(q.options) : "",
      CorrectAnswer: String(q.correctAnswer ?? ""),
      Explanation: q.explanation || "",
      KeywordHighlight: q.keywordHighlight || "",
      MaxLength: q.maxLength || null,
    }));
    await createRecords("Questions", questionFields);
  }

  console.log(`\nDa day de "${title}" len Airtable thanh cong. examId: ${examId}\n`);
}

main().catch((err) => {
  console.error("Loi:", err.message);
  process.exit(1);
});
