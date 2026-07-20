const { schedule } = require("@netlify/functions");
const { listRecords, deleteRecord } = require("./_airtable");

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Chay tu dong moi ngay 3:00 UTC (Netlify Scheduled Function), xoa lich su qua 15 ngay
const handler = async () => {
  const cutoffIso = new Date(Date.now() - FIFTEEN_DAYS_MS).toISOString();

  const oldAttempts = await listRecords("Attempts", {
    filterByFormula: `IS_BEFORE({SubmittedAt}, "${cutoffIso}")`,
  });
  for (const r of oldAttempts) await deleteRecord("Attempts", r.id);

  const oldWritings = await listRecords("WritingSubmissions", {
    filterByFormula: `IS_BEFORE({SubmittedAt}, "${cutoffIso}")`,
  });
  for (const r of oldWritings) await deleteRecord("WritingSubmissions", r.id);

  return {
    statusCode: 200,
    body: JSON.stringify({ deletedAttempts: oldAttempts.length, deletedWritings: oldWritings.length }),
  };
};

exports.handler = schedule("0 3 * * *", handler);
