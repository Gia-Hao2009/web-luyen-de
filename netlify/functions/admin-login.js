const { listRecords } = require("./_airtable");
const { verifyPassword, sign } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Thieu username/password" }) };
    }

    const records = await listRecords("AdminAccounts", {
      filterByFormula: `LOWER({Username}) = LOWER("${username.replace(/"/g, '\\"')}")`,
    });
    const admin = records[0];
    if (!admin || !verifyPassword(password, admin.fields.PasswordHash)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Sai username hoac password" }) };
    }

    const token = sign({ sub: admin.id, username: admin.fields.Username, role: "admin" }, 60 * 60 * 24 * 7);
    return { statusCode: 200, body: JSON.stringify({ token, username: admin.fields.Username }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
