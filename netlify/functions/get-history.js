const { listRecords } = require("./_airtable");
const { requireAuth } = require("./_auth");

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// FeedbackJson la dinh dang moi (cham rieng tung task). Fallback ve dinh dang cu
// (1 bo TA/CC/LR/GRA chung cho ca bai) neu ban ghi cu chua co FeedbackJson.
function shapeFeedback(fields) {
  const tasks = fields.FeedbackJson
    ? JSON.parse(fields.FeedbackJson)
    : [{ taskOrder: 1, ta: fields.TA, cc: fields.CC, lr: fields.LR, gra: fields.GRA, overall: fields.Overall, comment: fields.Comment || "" }];
  return { overall: fields.Overall, tasks };
}

exports.handler = async (event) => {
  const user = requireAuth(event, "student") || requireAuth(event, "admin");
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap" }) };

  try {
    const cutoff = new Date(Date.now() - FIFTEEN_DAYS_MS).toISOString();

    const attempts = await listRecords("Attempts", {
      filterByFormula: `AND({StudentId} = "${user.sub}", IS_AFTER({SubmittedAt}, "${cutoff}"))`,
      sort: [{ field: "SubmittedAt", direction: "desc" }],
    });

    const writings = await listRecords("WritingSubmissions", {
      filterByFormula: `AND({StudentId} = "${user.sub}", IS_AFTER({SubmittedAt}, "${cutoff}"))`,
      sort: [{ field: "SubmittedAt", direction: "desc" }],
    });

    const feedbacks = await listRecords("WritingFeedback", {});
    const feedbackBySubmission = Object.fromEntries(
      feedbacks.map((f) => [f.fields.SubmissionRecordId, shapeFeedback(f.fields)])
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        attempts: attempts.map((a) => {
          const results = a.fields.AnswersJson ? JSON.parse(a.fields.AnswersJson) : [];
          const passageCount = new Set(results.map((r) => r.passageOrder || 1)).size || 1;
          return {
            id: a.id,
            examRecordId: a.fields.ExamId,
            examTitle: a.fields.ExamTitle,
            category: a.fields.Category,
            score: a.fields.Score,
            total: a.fields.TotalQuestions,
            submittedAt: a.fields.SubmittedAt,
            elapsedSeconds: a.fields.ElapsedSeconds || 0,
            timeLimitMinutes: a.fields.TimeLimitMinutes || 0,
            passageCount,
            results,
          };
        }),
        writings: writings.map((w) => ({
          id: w.id,
          examTitle: w.fields.ExamTitle,
          status: w.fields.Status,
          submittedAt: w.fields.SubmittedAt,
          essays: w.fields.EssaysJson ? JSON.parse(w.fields.EssaysJson) : [{ taskOrder: 1, essayText: w.fields.EssayText || "" }],
          feedback: feedbackBySubmission[w.id] || null,
        })),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
