const { createRecord, updateRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

// Trong so chinh thuc IELTS Writing: Task 1 = 1/3, Task 2 = 2/3 tong diem.
function weightForTaskIndex(index, total) {
  if (total === 2) return index === 0 ? 1 : 2;
  return 1;
}

function round0_5(n) {
  return Math.round(n * 2) / 2;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const { submissionId, tasks } = JSON.parse(event.body || "{}");
    if (!submissionId || !Array.isArray(tasks) || tasks.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Thieu diem cham theo task" }) };
    }

    const taskFeedback = tasks.map((t) => {
      const scores = [t.ta, t.cc, t.lr, t.gra].map(Number);
      if (scores.some((s) => Number.isNaN(s))) {
        throw new Error(`Thieu diem 4 tieu chi (TA/CC/LR/GRA) cho Task ${t.taskOrder}`);
      }
      const overall = round0_5((scores[0] + scores[1] + scores[2] + scores[3]) / 4);
      return { taskOrder: t.taskOrder, ta: scores[0], cc: scores[1], lr: scores[2], gra: scores[3], overall, comment: t.comment || "" };
    });

    const totalWeight = taskFeedback.reduce((sum, _, i) => sum + weightForTaskIndex(i, taskFeedback.length), 0);
    const weightedSum = taskFeedback.reduce((sum, t, i) => sum + t.overall * weightForTaskIndex(i, taskFeedback.length), 0);
    const overall = round0_5(weightedSum / totalWeight);

    await createRecord("WritingFeedback", {
      SubmissionRecordId: submissionId,
      FeedbackJson: JSON.stringify(taskFeedback),
      Overall: overall,
      GradedAt: new Date().toISOString(),
    });

    await updateRecord("WritingSubmissions", submissionId, { Status: "graded" });

    return { statusCode: 200, body: JSON.stringify({ overall }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
