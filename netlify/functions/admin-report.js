const { listRecords } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const [attemptsRaw, writingsRaw, examsRaw, studentsRaw] = await Promise.all([
      listRecords("Attempts", {}),
      listRecords("WritingSubmissions", {}),
      listRecords("Exams", {}),
      listRecords("Students", {}),
    ]);

    // Loc bo cac dong trong (Airtable tu tao san vai dong mau khi moi tao bang, chua bi xoa)
    const attempts = attemptsRaw.filter((a) => a.fields.SubmittedAt);
    const writings = writingsRaw.filter((w) => w.fields.SubmittedAt);
    const exams = examsRaw.filter((e) => e.fields.ExamId);
    const students = studentsRaw.filter((s) => s.fields.Username);

    const byExam = {};
    for (const a of attempts) {
      const title = a.fields.ExamTitle || "?";
      if (!byExam[title]) byExam[title] = { attempts: 0, totalScorePct: 0 };
      const pct = a.fields.TotalQuestions ? (a.fields.Score / a.fields.TotalQuestions) * 100 : 0;
      byExam[title].attempts += 1;
      byExam[title].totalScorePct += pct;
    }
    const examStats = Object.entries(byExam).map(([title, v]) => ({
      title,
      attempts: v.attempts,
      averageScorePct: Math.round(v.totalScorePct / v.attempts),
    }));

    const studentById = Object.fromEntries(students.map((s) => [s.id, s.fields.Username]));
    const byStudent = {};
    for (const a of attempts) {
      const sid = a.fields.StudentId;
      if (!sid) continue;
      const username = studentById[sid] || "?";
      if (!byStudent[username]) byStudent[username] = { attempts: 0, totalScorePct: 0 };
      const pct = a.fields.TotalQuestions ? (a.fields.Score / a.fields.TotalQuestions) * 100 : 0;
      byStudent[username].attempts += 1;
      byStudent[username].totalScorePct += pct;
    }
    const studentStats = Object.entries(byStudent).map(([username, v]) => ({
      username,
      attempts: v.attempts,
      averageScorePct: Math.round(v.totalScorePct / v.attempts),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        totals: {
          exams: exams.length,
          students: students.length,
          attempts: attempts.length,
          writingsPending: writings.filter((w) => w.fields.Status === "pending").length,
          writingsGraded: writings.filter((w) => w.fields.Status === "graded").length,
        },
        examStats,
        studentStats,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
