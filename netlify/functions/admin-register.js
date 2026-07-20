const { listRecords, createRecord } = require("./_airtable");
const { hashPassword, sign } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { username, password, pin } = JSON.parse(event.body || "{}");
    if (!username || !password || password.length < 4) {
      return { statusCode: 400, body: JSON.stringify({ error: "Username va password (>=4 ky tu) la bat buoc" }) };
    }

    const requiredPin = process.env.ADMIN_REGISTER_PIN;
    if (!requiredPin) throw new Error("Missing env var ADMIN_REGISTER_PIN");
    if (pin !== requiredPin) {
      return { statusCode: 403, body: JSON.stringify({ error: "Sai ma PIN" }) };
    }

    const existing = await listRecords("AdminAccounts", {
      filterByFormula: `LOWER({Username}) = LOWER("${username.replace(/"/g, '\\"')}")`,
    });
    if (existing.length > 0) {
      return { statusCode: 409, body: JSON.stringify({ error: "Username da ton tai" }) };
    }

    const record = await createRecord("AdminAccounts", {
      Username: username,
      PasswordHash: hashPassword(password),
    });

    const token = sign({ sub: record.id, username, role: "admin" }, 60 * 60 * 24 * 7);
    return { statusCode: 200, body: JSON.stringify({ token, username }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
