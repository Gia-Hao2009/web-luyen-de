const { deleteRecord, listRecords } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    const { submissionId } = JSON.parse(event.body || "{}");
    if (!submissionId) return { statusCode: 400, body: JSON.stringify({ error: "Thieu submissionId" }) };

    const feedbacks = await listRecords("WritingFeedback", {
      filterByFormula: `{SubmissionRecordId} = "${submissionId}"`,
    });
    for (const f of feedbacks) await deleteRecord("WritingFeedback", f.id);

    await deleteRecord("WritingSubmissions", submissionId);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
