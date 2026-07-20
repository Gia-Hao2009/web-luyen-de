const { getRecord, createRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const user = requireAuth(event, "student") || requireAuth(event, "admin");
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap" }) };

  try {
    const { examRecordId, essays } = JSON.parse(event.body || "{}");
    if (!examRecordId || !Array.isArray(essays) || essays.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Thieu du lieu bai lam" }) };
    }
    const tooShort = essays.some((e) => !e.essayText || e.essayText.trim().length < 10);
    if (tooShort) {
      return { statusCode: 400, body: JSON.stringify({ error: "Co bai viet qua ngan" }) };
    }

    const exam = await getRecord("Exams", examRecordId);
    const submission = await createRecord("WritingSubmissions", {
      StudentId: user.sub,
      ExamId: exam.id,
      ExamTitle: exam.fields.Title,
      EssaysJson: JSON.stringify(essays),
      Status: "pending",
      SubmittedAt: new Date().toISOString(),
    });

    return { statusCode: 200, body: JSON.stringify({ submissionId: submission.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
