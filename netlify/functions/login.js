const { listRecords } = require("./_airtable");
const { verifyPassword, sign } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Thieu username/password" }) };
    }

    const records = await listRecords("Students", {
      filterByFormula: `LOWER({Username}) = LOWER("${username.replace(/"/g, '\\"')}")`,
    });
    const student = records[0];
    if (!student || !verifyPassword(password, student.fields.PasswordHash)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Sai username hoac password" }) };
    }

    const token = sign({ sub: student.id, username: student.fields.Username, role: "student" });
    return { statusCode: 200, body: JSON.stringify({ token, username: student.fields.Username }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
