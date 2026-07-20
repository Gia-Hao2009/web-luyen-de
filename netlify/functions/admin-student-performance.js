const { listRecords, getRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

const IELTS_READING_BAND_TABLE = [
  { min: 39, band: 9.0 }, { min: 37, band: 8.5 }, { min: 35, band: 8.0 },
  { min: 33, band: 7.5 }, { min: 30, band: 7.0 }, { min: 27, band: 6.5 },
  { min: 23, band: 6.0 }, { min: 19, band: 5.5 }, { min: 15, band: 5.0 },
  { min: 13, band: 4.5 }, { min: 10, band: 4.0 }, { min: 8, band: 3.5 },
  { min: 6, band: 3.0 }, { min: 4, band: 2.5 },
];
function estimateBand(score) {
  const row = IELTS_READING_BAND_TABLE.find((r) => score >= r.min);
  return row ? row.band : 2.0;
}
function round1(n) { return Math.round(n * 10) / 10; }

// useBand: chi tinh Band IELTS khi category la "IELTS Reading" (de du 40 cau).
// THPT Reading dung thang diem 10 (score10), khong dung bang quy doi Band IELTS.
function buildReadingCategoryStats(attempts, useBand) {
  if (attempts.length === 0) {
    return { totalTests: 0, averageScorePct: null, averageBand: null, averageScore10: null, averageElapsedSeconds: 0, history: [], skillStats: [] };
  }
  let totalPct = 0;
  let bandSum = 0;
  let bandCount = 0;
  let score10Sum = 0;
  let elapsedSum = 0;
  const history = [];
  const bySkill = {};

  for (const a of attempts) {
    const total = a.fields.TotalQuestions || 0;
    const score = a.fields.Score || 0;
    const pct = total ? (score / total) * 100 : 0;
    totalPct += pct;
    score10Sum += total ? (score / total) * 10 : 0;
    elapsedSum += a.fields.ElapsedSeconds || 0;
    if (useBand && total === 40) {
      bandSum += estimateBand(score);
      bandCount += 1;
    }
    history.push({ date: a.fields.SubmittedAt, scorePct: Math.round(pct) });

    const results = a.fields.AnswersJson ? JSON.parse(a.fields.AnswersJson) : [];
    for (const r of results) {
      const tag = r.skillTag || "Chưa gắn tag";
      if (!bySkill[tag]) bySkill[tag] = { correct: 0, total: 0 };
      bySkill[tag].total += 1;
      if (r.isCorrect) bySkill[tag].correct += 1;
    }
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  const skillStats = Object.entries(bySkill).map(([tag, v]) => ({
    tag,
    correct: v.correct,
    total: v.total,
    accuracyPct: Math.round((v.correct / v.total) * 100),
  }));

  return {
    totalTests: attempts.length,
    averageScorePct: Math.round(totalPct / attempts.length),
    averageBand: bandCount ? round1(bandSum / bandCount) : null,
    averageScore10: round1(score10Sum / attempts.length),
    averageElapsedSeconds: Math.round(elapsedSum / attempts.length),
    history,
    skillStats,
  };
}

exports.handler = async (event) => {
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const studentId = event.queryStringParameters?.studentId;
    if (!studentId) return { statusCode: 400, body: JSON.stringify({ error: "Thieu studentId" }) };

    const student = await getRecord("Students", studentId);

    const [allAttempts, allWritings, feedbacks] = await Promise.all([
      listRecords("Attempts", { filterByFormula: `{StudentId} = "${studentId}"` }),
      listRecords("WritingSubmissions", { filterByFormula: `{StudentId} = "${studentId}"` }),
      listRecords("WritingFeedback", {}),
    ]);

    const readingAttempts = allAttempts.filter((a) => a.fields.SubmittedAt && a.fields.Category === "IELTS Reading");
    const thptAttempts = allAttempts.filter((a) => a.fields.SubmittedAt && a.fields.Category === "THPT Reading");

    // FeedbackJson la dinh dang moi (cham rieng tung task). Fallback ve dinh dang cu
    // (1 bo TA/CC/LR/GRA chung cho ca bai) neu ban ghi cu chua co FeedbackJson.
    function tasksOf(fields) {
      return fields.FeedbackJson
        ? JSON.parse(fields.FeedbackJson)
        : [{ taskOrder: 1, ta: fields.TA, cc: fields.CC, lr: fields.LR, gra: fields.GRA, overall: fields.Overall }];
    }
    const feedbackBySubmission = Object.fromEntries(
      feedbacks.map((f) => [f.fields.SubmissionRecordId, { overall: f.fields.Overall, tasks: tasksOf(f.fields) }])
    );
    const gradedWritings = allWritings
      .filter((w) => w.fields.SubmittedAt && w.fields.Status === "graded")
      .map((w) => ({ submittedAt: w.fields.SubmittedAt, feedback: feedbackBySubmission[w.id] }))
      .filter((w) => w.feedback);

    let writingStats = { totalTests: allWritings.filter((w) => w.fields.SubmittedAt).length, averageOverall: null, tasks: [], history: [] };
    if (gradedWritings.length > 0) {
      let overallSum = 0;
      const byTask = {};
      for (const w of gradedWritings) {
        overallSum += w.feedback.overall;
        for (const t of w.feedback.tasks) {
          if (!byTask[t.taskOrder]) byTask[t.taskOrder] = { TA: 0, CC: 0, LR: 0, GRA: 0, Overall: 0, count: 0 };
          const bucket = byTask[t.taskOrder];
          bucket.TA += t.ta; bucket.CC += t.cc; bucket.LR += t.lr; bucket.GRA += t.gra; bucket.Overall += t.overall;
          bucket.count += 1;
        }
      }
      writingStats.averageOverall = round1(overallSum / gradedWritings.length);
      writingStats.tasks = Object.entries(byTask)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([taskOrder, v]) => ({
          taskOrder: Number(taskOrder),
          averageTA: round1(v.TA / v.count),
          averageCC: round1(v.CC / v.count),
          averageLR: round1(v.LR / v.count),
          averageGRA: round1(v.GRA / v.count),
          averageOverall: round1(v.Overall / v.count),
        }));
      writingStats.history = gradedWritings
        .map((w) => ({ date: w.submittedAt, overall: w.feedback.overall }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        username: student.fields.Username,
        categories: {
          "IELTS Reading": buildReadingCategoryStats(readingAttempts, true),
          "THPT Reading": buildReadingCategoryStats(thptAttempts, false),
          "IELTS Writing": writingStats,
        },
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
