import test from "node:test";
import assert from "node:assert/strict";
import { planFinanceCsvRetry } from "../src/modules/finance/finance.import-batch.retry";
import { previewFinanceCsv } from "../src/modules/finance/finance.csv.preview";

const hash = "a".repeat(64);
const csv = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100.25,STATE\nFMS,A2,SAN-2,2026-04-02,2026-27,200,STATE";
const preview = previewFinanceCsv(csv, "OUTLAY");

test("retry plan selects only previously rejected rows that remain valid on exact re-upload", () => {
    const result = planFinanceCsvRetry(preview, hash, hash, [
        { row_number: 2, outcome: "CREATED" },
        { row_number: 3, outcome: "REJECTED" },
    ]);
    assert.deepEqual(result.retry_row_numbers, [3]);
    assert.deepEqual(result.skipped_row_numbers, [2]);
    assert.equal(result.reason, "RETRY_REJECTED_ROWS");
});

test("rejects a changed re-upload rather than risking row-number mismatch", () => {
    assert.throws(
        () => planFinanceCsvRetry(preview, "b".repeat(64), hash, [{ row_number: 3, outcome: "REJECTED" }]),
        /REUPLOAD_FILE_MISMATCH/,
    );
});

test("does not retry rejected rows that are invalid in the new preview", () => {
    const result = planFinanceCsvRetry(preview, hash, hash, [
        { row_number: 3, outcome: "INVALID" },
    ]);
    assert.deepEqual(result.retry_row_numbers, []);
    assert.deepEqual(result.skipped_row_numbers, [3]);
    assert.equal(result.reason, "NO_REJECTED_ROWS");
});

test("rejects duplicate or malformed previous row identities", () => {
    assert.throws(() => planFinanceCsvRetry(preview, hash, hash, [
        { row_number: 3, outcome: "REJECTED" },
        { row_number: 3, outcome: "REJECTED" },
    ]), /INVALID_PREVIOUS_BATCH_ROWS/);
});
