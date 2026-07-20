const { getRecord, deleteRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const user = requireAuth(event, "student") || requireAuth(event, "admin");
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap" }) };

  try {
    const { attemptId } = JSON.parse(event.body || "{}");
    if (!attemptId) return { statusCode: 400, body: JSON.stringify({ error: "Thieu attemptId" }) };

    const attempt = await getRecord("Attempts", attemptId);
    if (attempt.fields.StudentId !== user.sub) {
      return { statusCode: 403, body: JSON.stringify({ error: "Khong co quyen xoa bai lam nay" }) };
    }

    await deleteRecord("Attempts", attemptId);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
