const { getRecord, updateRecord } = require("./_airtable");
const { verifyPassword, hashPassword, requireAuth } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const user = requireAuth(event, "student");
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Chua dang nhap" }) };

  try {
    const { oldPassword, newPassword } = JSON.parse(event.body || "{}");
    if (!oldPassword || !newPassword || newPassword.length < 4) {
      return { statusCode: 400, body: JSON.stringify({ error: "Mat khau moi phai tu 4 ky tu tro len" }) };
    }

    const student = await getRecord("Students", user.sub);
    if (!verifyPassword(oldPassword, student.fields.PasswordHash)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Mat khau cu khong dung" }) };
    }

    await updateRecord("Students", user.sub, { PasswordHash: hashPassword(newPassword) });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
