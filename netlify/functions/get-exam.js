const { listRecords, getRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  try {
    const examRecordId = event.queryStringParameters?.id;
    if (!examRecordId) return { statusCode: 400, body: JSON.stringify({ error: "Thieu id" }) };

    const exam = await getRecord("Exams", examRecordId);
    const isAdmin = !!requireAuth(event, "admin");

    const base = {
      id: exam.id,
      examId: exam.fields.ExamId,
      title: exam.fields.Title,
      category: exam.fields.Category,
      timeLimitMinutes: exam.fields.TimeLimitMinutes ?? 0,
      passages: exam.fields.PassagesJson ? JSON.parse(exam.fields.PassagesJson) : [],
      tasks: exam.fields.TasksJson ? JSON.parse(exam.fields.TasksJson) : [],
    };

    if (exam.fields.Category === "IELTS Writing") {
      return { statusCode: 200, body: JSON.stringify({ exam: base }) };
    }

    const questions = await listRecords("Questions", {
      filterByFormula: `{ExamId} = "${exam.fields.ExamId}"`,
      sort: [{ field: "Order", direction: "asc" }],
    });

    const shaped = questions.map((q) => {
      const common = {
        id: q.id,
        order: q.fields.Order,
        passageOrder: q.fields.PassageOrder || 1,
        type: q.fields.Type,
        questionText: q.fields.QuestionText,
        options: q.fields.OptionsJson ? JSON.parse(q.fields.OptionsJson) : null,
        maxLength: q.fields.MaxLength || null,
      };
      if (isAdmin) {
        common.correctAnswer = q.fields.CorrectAnswer;
        common.explanation = q.fields.Explanation;
        common.keywordHighlight = q.fields.KeywordHighlight;
      }
      return common;
    });

    return { statusCode: 200, body: JSON.stringify({ exam: { ...base, questions: shaped } }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
