const { listRecords } = require("./_airtable");
const { requireAuth } = require("./_auth");

// FeedbackJson la dinh dang moi (cham rieng tung task). Fallback ve dinh dang cu
// (1 bo TA/CC/LR/GRA chung cho ca bai) neu ban ghi cu chua co FeedbackJson.
function shapeFeedback(fields) {
  const tasks = fields.FeedbackJson
    ? JSON.parse(fields.FeedbackJson)
    : [{ taskOrder: 1, ta: fields.TA, cc: fields.CC, lr: fields.LR, gra: fields.GRA, overall: fields.Overall, comment: fields.Comment || "" }];
  return { overall: fields.Overall, tasks };
}

exports.handler = async (event) => {
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const status = event.queryStringParameters?.status || "pending";
    const submissions = await listRecords("WritingSubmissions", {
      filterByFormula: `{Status} = "${status}"`,
      sort: [{ field: "SubmittedAt", direction: "desc" }],
    });

    const students = await listRecords("Students", {});
    const studentById = Object.fromEntries(students.map((s) => [s.id, s.fields.Username]));

    const feedbacks = await listRecords("WritingFeedback", {});
    const feedbackBySubmission = Object.fromEntries(
      feedbacks.map((f) => [f.fields.SubmissionRecordId, shapeFeedback(f.fields)])
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        submissions: submissions.map((s) => ({
          id: s.id,
          examTitle: s.fields.ExamTitle,
          studentUsername: studentById[s.fields.StudentId] || "?",
          essays: s.fields.EssaysJson ? JSON.parse(s.fields.EssaysJson) : [{ taskOrder: 1, essayText: s.fields.EssayText || "" }],
          submittedAt: s.fields.SubmittedAt,
          status: s.fields.Status,
          feedback: feedbackBySubmission[s.id] || null,
        })),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
