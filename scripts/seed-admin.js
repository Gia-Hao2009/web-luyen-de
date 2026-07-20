// Chay local: node scripts/seed-admin.js <username> <password>
// In ra chuoi PasswordHash de dan thu cong vao Airtable, bang AdminAccounts (khong can deploy endpoint nao).
const { hashPassword } = require("../netlify/functions/_auth");

const [, , username, password] = process.argv;
if (!username || !password) {
  console.log("Cach dung: node scripts/seed-admin.js <username> <password>");
  process.exit(1);
}

console.log("\nTao 1 record moi trong bang AdminAccounts cua Airtable voi:");
console.log("  Username     :", username);
console.log("  PasswordHash :", hashPassword(password));
console.log("\n(Dan nguyen chuoi PasswordHash o tren vao dung field PasswordHash, khong sua gi them)\n");
