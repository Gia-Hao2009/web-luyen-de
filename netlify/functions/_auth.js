// Helper mat khau + token dang nhap, khong dung thu vien ngoai (chi crypto co san cua Node)
const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, expiresInSeconds = 60 * 60 * 24 * 30) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing env var AUTH_SECRET");
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const data = base64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  const payload = JSON.parse(Buffer.from(data, "base64url").toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function getTokenFromEvent(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length);
}

function requireAuth(event, role) {
  const token = getTokenFromEvent(event);
  const payload = token ? verify(token) : null;
  if (!payload || (role && payload.role !== role)) return null;
  return payload;
}

module.exports = {
  hashPassword,
  verifyPassword,
  sign,
  verify,
  getTokenFromEvent,
  requireAuth,
};
