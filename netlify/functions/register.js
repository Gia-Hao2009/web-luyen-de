const { listRecords, createRecord } = require("./_airtable");
const { hashPassword, sign } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password || password.length < 4) {
      return { statusCode: 400, body: JSON.stringify({ error: "Username va password (>=4 ky tu) la bat buoc" }) };
    }

    const existing = await listRecords("Students", {
      filterByFormula: `LOWER({Username}) = LOWER("${username.replace(/"/g, '\\"')}")`,
    });
    if (existing.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ error: "Username da ton tai" }) };
    }

    const record = await createRecord("Students", {
      Username: username,
      PasswordHash: hashPassword(password),
      CreatedAt: new Date().toISOString(),
    });

    const token = sign({ sub: record.id, username, role: "student" });
    return { statusCode: 200, body: JSON.stringify({ token, username }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
