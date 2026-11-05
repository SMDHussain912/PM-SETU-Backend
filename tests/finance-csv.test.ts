import test from "node:test";
import assert from "node:assert/strict";
import { parseFinanceCsv } from "../src/modules/finance/finance.csv";

test("parses headers, rows, escaped quotes and commas in quoted fields", () => {
    const result = parseFinanceCsv('source_id,description,amount\nA-1,"Equipment, phase 1",1200.50\nA-2,"He said ""approved""",50', {
        requiredHeaders: ["source_id", "amount"],
    });
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].values.description, "Equipment, phase 1");
    assert.equal(result.rows[1].values.description, 'He said "approved"');
    assert.equal(result.rows[0].row_number, 2);
});

test("accepts UTF-8 BOM and CRLF line endings", () => {
    const result = parseFinanceCsv('\uFEFFid,amount\r\n1,10\r\n', { requiredHeaders: ["id", "amount"] });
    assert.equal(result.rows[0].values.id, "1");
});

test("rejects missing, duplicate and empty headers", () => {
    assert.throws(() => parseFinanceCsv("id,value\n1,2", { requiredHeaders: ["amount"] }), /MISSING_HEADERS/);
    assert.throws(() => parseFinanceCsv("id,id\n1,2", { requiredHeaders: [] }), /DUPLICATE_HEADER/);
    assert.throws(() => parseFinanceCsv(",amount\n1,2", { requiredHeaders: [] }), /EMPTY_HEADER/);
});

test("rejects malformed quoting and mismatched column counts", () => {
    assert.throws(() => parseFinanceCsv('id,name\n1,"broken', { requiredHeaders: ["id"] }), /UNCLOSED_QUOTE/);
    assert.throws(() => parseFinanceCsv("id,name\n1,2,3", { requiredHeaders: ["id"] }), /COLUMN_COUNT_MISMATCH/);
    assert.throws(() => parseFinanceCsv('id,name\n1,ab"cd', { requiredHeaders: ["id"] }), /MALFORMED_QUOTE/);
});

test("enforces byte and row limits and rejects NUL characters", () => {
    assert.throws(() => parseFinanceCsv("id\n12345", { requiredHeaders: ["id"], maxBytes: 4 }), /TOO_LARGE/);
    assert.throws(() => parseFinanceCsv("id\n1\n2", { requiredHeaders: ["id"], maxRows: 1 }), /TOO_MANY_ROWS/);
    assert.throws(() => parseFinanceCsv("id\n\u0000", { requiredHeaders: ["id"] }), /INVALID_CHARACTER/);
});
