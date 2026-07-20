const { listRecords } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const [attempts, students, admins] = await Promise.all([
      listRecords("Attempts", { sort: [{ field: "SubmittedAt", direction: "desc" }] }),
      listRecords("Students", {}),
      listRecords("AdminAccounts", {}),
    ]);

    const nameById = {};
    students.forEach((s) => { nameById[s.id] = s.fields.Username; });
    admins.forEach((a) => { nameById[a.id] = `${a.fields.Username} (admin)`; });

    return {
      statusCode: 200,
      body: JSON.stringify({
        // Loc bo cac dong trong (Airtable tu tao san 3 dong mau khi moi tao bang, chua bi xoa)
        activity: attempts.filter((a) => a.fields.SubmittedAt).map((a) => {
          const results = a.fields.AnswersJson ? JSON.parse(a.fields.AnswersJson) : [];
          const passageCount = new Set(results.map((r) => r.passageOrder || 1)).size || 1;
          return {
            id: a.id,
            examRecordId: a.fields.ExamId,
            username: nameById[a.fields.StudentId] || "?",
            examTitle: a.fields.ExamTitle,
            category: a.fields.Category,
            score: a.fields.Score,
            total: a.fields.TotalQuestions,
            elapsedSeconds: a.fields.ElapsedSeconds || 0,
            timeLimitMinutes: a.fields.TimeLimitMinutes || 0,
            submittedAt: a.fields.SubmittedAt,
            results,
            passageCount,
          };
        }),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
