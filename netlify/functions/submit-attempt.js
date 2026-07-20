const { listRecords, getRecord, createRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

function normalize(str) {
  return String(str ?? "").trim().toLowerCase();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const user = requireAuth(event, "student") || requireAuth(event, "admin");
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap" }) };

  try {
    const { examRecordId, answers, elapsedSeconds } = JSON.parse(event.body || "{}");
    // answers: { [questionRecordId]: givenAnswer }
    if (!examRecordId || !answers) {
      return { statusCode: 400, body: JSON.stringify({ error: "Thieu du lieu bai lam" }) };
    }

    const exam = await getRecord("Exams", examRecordId);
    const questions = await listRecords("Questions", {
      filterByFormula: `{ExamId} = "${exam.fields.ExamId}"`,
      sort: [{ field: "Order", direction: "asc" }],
    });

    let score = 0;
    const results = questions.map((q) => {
      const given = answers[q.id];
      const isCorrect = normalize(given) === normalize(q.fields.CorrectAnswer);
      if (isCorrect) score += 1;
      return {
        questionId: q.id,
        order: q.fields.Order,
        passageOrder: q.fields.PassageOrder || 1,
        questionText: q.fields.QuestionText,
        given: given ?? "",
        correctAnswer: q.fields.CorrectAnswer,
        isCorrect,
        explanation: q.fields.Explanation || "",
        keywordHighlight: q.fields.KeywordHighlight || "",
        skillTag: q.fields.SkillTag || "",
      };
    });

    const passageCount = exam.fields.PassagesJson ? JSON.parse(exam.fields.PassagesJson).length : 1;
    const timeLimitMinutes = exam.fields.TimeLimitMinutes || 0;

    const attempt = await createRecord("Attempts", {
      StudentId: user.sub,
      ExamId: exam.id,
      ExamTitle: exam.fields.Title,
      Category: exam.fields.Category,
      Score: score,
      TotalQuestions: questions.length,
      AnswersJson: JSON.stringify(results),
      ElapsedSeconds: Number(elapsedSeconds) || 0,
      TimeLimitMinutes: timeLimitMinutes,
      SubmittedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        attemptId: attempt.id,
        examRecordId: exam.id,
        category: exam.fields.Category,
        score,
        total: questions.length,
        passageCount,
        elapsedSeconds: Number(elapsedSeconds) || 0,
        timeLimitMinutes,
        results,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
