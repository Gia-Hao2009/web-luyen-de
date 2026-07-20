const { listRecords, deleteRecord } = require("./_airtable");
const { requireAuth } = require("./_auth");

exports.handler = async (event) => {
  const admin = requireAuth(event, "admin");
  if (!admin) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap admin" }) };

  try {
    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode: 400, body: JSON.stringify({ error: "Thieu id" }) };
      await deleteRecord("Students", id);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    const students = await listRecords("Students", { sort: [{ field: "CreatedAt", direction: "desc" }] });
    const attempts = await listRecords("Attempts", {});

    const attemptCountByStudent = {};
    for (const a of attempts) {
      const sid = a.fields.StudentId;
      if (sid) attemptCountByStudent[sid] = (attemptCountByStudent[sid] || 0) + 1;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        students: students.map((s) => ({
          id: s.id,
          username: s.fields.Username,
          createdAt: s.fields.CreatedAt,
          attemptCount: attemptCountByStudent[s.id] || 0,
        })),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
