// Helper dung chung de goi Airtable REST API tu cac Netlify Functions.
// API key CHI duoc dung o day (server-side), khong bao gio gui ve client.

const BASE_URL = "https://api.airtable.com/v0";

function envOrThrow(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function airtableHeaders() {
  return {
    Authorization: `Bearer ${envOrThrow("AIRTABLE_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

function tableUrl(table, suffix = "") {
  const baseId = envOrThrow("AIRTABLE_BASE_ID");
  return `${BASE_URL}/${baseId}/${encodeURIComponent(table)}${suffix}`;
}

async function airtableFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: airtableHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(`Airtable error (${res.status}): ${msg}`);
  }
  return data;
}

// Lay toan bo record thoa filterByFormula (Airtable REST tra ve toi da 100 record/trang, tu dong gop trang)
async function listRecords(table, { filterByFormula, sort, maxRecords } = {}) {
  let records = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (filterByFormula) params.set("filterByFormula", filterByFormula);
    if (maxRecords) params.set("maxRecords", String(maxRecords));
    if (sort) {
      sort.forEach((s, i) => {
        params.set(`sort[${i}][field]`, s.field);
        params.set(`sort[${i}][direction]`, s.direction || "asc");
      });
    }
    if (offset) params.set("offset", offset);
    const data = await airtableFetch(`${tableUrl(table)}?${params.toString()}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function getRecord(table, id) {
  return airtableFetch(tableUrl(table, `/${id}`));
}

async function createRecord(table, fields) {
  return airtableFetch(tableUrl(table), {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

async function createRecords(table, recordsFields) {
  // Airtable gioi han 10 record/request
  const chunks = [];
  for (let i = 0; i < recordsFields.length; i += 10) {
    chunks.push(recordsFields.slice(i, i + 10));
  }
  const created = [];
  for (const chunk of chunks) {
    const data = await airtableFetch(tableUrl(table), {
      method: "POST",
      body: JSON.stringify({ records: chunk.map((fields) => ({ fields })) }),
    });
    created.push(...data.records);
  }
  return created;
}

async function updateRecord(table, id, fields) {
  return airtableFetch(tableUrl(table, `/${id}`), {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

async function deleteRecord(table, id) {
  return airtableFetch(tableUrl(table, `/${id}`), { method: "DELETE" });
}

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  createRecords,
  updateRecord,
  deleteRecord,
};
