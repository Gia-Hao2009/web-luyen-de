const { listRecords } = require("./_airtable");

exports.handler = async () => {
  try {
    const exams = await listRecords("Exams", { sort: [{ field: "CreatedAt", direction: "desc" }] });
    // Loc bo cac dong trong (Airtable tu tao san vai dong mau khi moi tao bang, chua bi xoa)
    const safe = exams.filter((r) => r.fields.ExamId).map((r) => ({
      id: r.id,
      examId: r.fields.ExamId,
      title: r.fields.Title,
      category: r.fields.Category,
      timeLimitMinutes: r.fields.TimeLimitMinutes ?? 0,
      createdAt: r.fields.CreatedAt,
    }));
    return { statusCode: 200, body: JSON.stringify({ exams: safe }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
