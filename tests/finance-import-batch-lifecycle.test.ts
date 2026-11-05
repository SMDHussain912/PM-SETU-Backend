import test from "node:test";
import assert from "node:assert/strict";
import { previewFinanceCsv } from "../src/modules/finance/finance.csv.preview";
import { buildFinanceImportBatchInput } from "../src/modules/finance/finance.import-batch.lifecycle";
import type { FinanceCsvImportSummary } from "../src/modules/finance/finance.csv.execution";

const hash = "a".repeat(64);
const idempotencyKey = "123e4567-e89b-42d3-a456-426614174000";
const validCsv = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100.25,STATE\nFMS,A2,SAN-2,2026-04-02,2026-27,200,STATE";

function summary(overrides: Partial<FinanceCsvImportSummary> = {}): FinanceCsvImportSummary {
    return {
        record_kind: "OUTLAY",
        total_rows: 2,
        attempted_rows: 2,
        created: 1,
        duplicates: 0,
        rejected: 1,
        results: [
            { row_number: 2, outcome: "CREATED", record_id: 12 },
            { row_number: 3, outcome: "REJECTED", code: "ROW_IMPORT_FAILED", message: "OUTLAY_NOT_FOUND" },
        ],
        partial_commit_possible: true,
        ...overrides,
    };
}

test("projects a preview into batch metadata without persisting financial payloads", () => {
    const preview = previewFinanceCsv(validCsv, "OUTLAY");
    const result = buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey, created_by: "operator-1" });
    assert.equal(result.lifecycle, "PREVIEWED");
    assert.equal(result.valid_rows, 2);
    assert.equal(result.invalid_rows, 0);
    assert.deepEqual(result.rows.map((row) => row.outcome), ["VALID", "VALID"]);
    assert.equal("values" in result.rows[0], false);
});

test("projects execution outcomes and counters into a consistent completed batch", () => {
    const preview = previewFinanceCsv(validCsv, "OUTLAY");
    const result = buildFinanceImportBatchInput(preview, {
        file_sha256: hash,
        idempotency_key: idempotencyKey,
        completed_at: new Date("2026-11-05T10:00:00.000Z"),
    }, summary());
    assert.equal(result.lifecycle, "EXECUTED_WITH_REJECTIONS");
    assert.equal(result.attempted_rows, 2);
    assert.equal(result.created_rows, 1);
    assert.equal(result.rejected_rows, 1);
    assert.deepEqual(result.rows.map((row) => row.outcome), ["CREATED", "REJECTED"]);
    assert.equal(result.rows[0].target_record_id, 12);
    assert.equal(result.rows[1].error_code, "ROW_IMPORT_FAILED");
});

test("preserves valid but unattempted rows during selective retry projection", () => {
    const preview = previewFinanceCsv(validCsv, "OUTLAY");
    const result = buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey }, summary({
        attempted_rows: 1,
        created: 1,
        rejected: 0,
        results: [{ row_number: 3, outcome: "CREATED", record_id: 22 }],
    }));
    assert.equal(result.lifecycle, "PARTIALLY_EXECUTED");
    assert.deepEqual(result.rows.map((row) => row.outcome), ["VALID", "CREATED"]);
});

test("marks structurally invalid rows and derives rejection lifecycle", () => {
    const preview = previewFinanceCsv(validCsv + "\nFMS,A3,SAN-3,not-a-date,2026-27,10,STATE", "OUTLAY");
    const result = buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey });
    assert.equal(result.lifecycle, "INVALID");
    assert.equal(result.invalid_rows, 1);
    assert.equal(result.rows.find((row) => row.row_number === 4)?.outcome, "INVALID");
});

test("rejects inconsistent execution counts and rows outside the preview", () => {
    const preview = previewFinanceCsv(validCsv, "OUTLAY");
    assert.throws(() => buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey }, summary({
        attempted_rows: 99,
    })), /COUNTERS_INCONSISTENT/);
    assert.throws(() => buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey }, summary({
        results: [{ row_number: 99, outcome: "CREATED", record_id: 1 }],
    })), /INVALID_FINANCE_IMPORT_EXECUTION_RESULTS/);
});

test("rejects invalid hashes and invalid completion timestamps", () => {
    const preview = previewFinanceCsv(validCsv, "OUTLAY");
    assert.throws(() => buildFinanceImportBatchInput(preview, { file_sha256: "bad", idempotency_key: idempotencyKey }), /INVALID_FILE_SHA256/);
    assert.throws(() => buildFinanceImportBatchInput(preview, {
        file_sha256: hash,
        idempotency_key: idempotencyKey,
        completed_at: new Date("invalid"),
    }, summary()), /INVALID_BATCH_COMPLETED_AT/);
});


test("accounts for every data row when required CSV headers are missing", () => {
    const preview = previewFinanceCsv("source_system,source_record_id\nFMS,A1\nFMS,A2", "OUTLAY");
    const result = buildFinanceImportBatchInput(preview, { file_sha256: hash, idempotency_key: idempotencyKey });
    assert.equal(result.total_rows, 2);
    assert.equal(result.valid_rows, 0);
    assert.equal(result.invalid_rows, 2);
    assert.deepEqual(result.rows.map((row) => row.row_number), [2, 3]);
    assert.deepEqual(result.rows.map((row) => row.outcome), ["INVALID", "INVALID"]);
});
