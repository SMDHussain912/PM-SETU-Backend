import { ApiError } from "../../utils/response";
import type { IntegrationIngestInput } from "./integration.schema";

function invalidCsv(message: string): never {
  throw new ApiError({ statusCode: 422, code: "CSV_INVALID", message });
}

function rowsFromCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, quoteClosed = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; quoteClosed = true; }
      else cell += ch;
      continue;
    }
    if (quoteClosed && ch !== "," && ch !== "\n" && ch !== "\r") {
      invalidCsv("CSV contains unexpected characters after a closing quote");
    }
    if (ch === '"') {
      if (cell.length !== 0 || quoteClosed) invalidCsv("CSV contains a quote inside an unquoted field");
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = ""; quoteClosed = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; quoteClosed = false;
    } else {
      if (quoteClosed) invalidCsv("CSV contains unexpected characters after a closing quote");
      cell += ch;
    }
  }
  if (quoted) invalidCsv("CSV contains an unterminated quoted field");
  if (cell.length || row.length || quoteClosed) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function parseIntegrationCsv(input: string): IntegrationIngestInput["records"] {
  if (Buffer.byteLength(input, "utf8") > 1024 * 1024) throw new ApiError({ statusCode: 413, code: "CSV_TOO_LARGE", message: "CSV must not exceed 1 MB" });
  const rows = rowsFromCsv(input.replace(/^\uFEFF/, ""));
  const headers = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const required = ["source_record_id", "source_version", "occurred_at", "payload_json"];
  if (rows.length < 2 || headers.length !== required.length || required.some((h) => !headers.includes(h))) {
    throw new ApiError({ statusCode: 422, code: "CSV_HEADERS_INVALID", message: "CSV requires headers: source_record_id,source_version,occurred_at,payload_json and at least one row" });
  }
  if (rows.length - 1 > 500) throw new ApiError({ statusCode: 422, code: "CSV_BATCH_TOO_LARGE", message: "CSV may contain at most 500 records" });
  const index = Object.fromEntries(required.map((h) => [h, headers.indexOf(h)]));
  return rows.slice(1).map((r, i) => {
    if (r.length !== headers.length) throw new ApiError({ statusCode: 422, code: "CSV_ROW_INVALID", message: `CSV row ${i + 2} has an unexpected number of columns` });
    let payload: unknown;
    try { payload = JSON.parse(r[index.payload_json]); } catch { throw new ApiError({ statusCode: 422, code: "CSV_PAYLOAD_INVALID", message: `CSV row ${i + 2} has invalid payload_json` }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ApiError({ statusCode: 422, code: "CSV_PAYLOAD_INVALID", message: `CSV row ${i + 2} payload_json must be a JSON object` });
    return { source_record_id: r[index.source_record_id], source_version: r[index.source_version] || null, occurred_at: r[index.occurred_at] || null, payload: payload as Record<string, unknown> };
  });
}
