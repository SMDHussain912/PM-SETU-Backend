import test from "node:test";
import assert from "node:assert/strict";
import { reconcileFinanceImportBatch, type PersistedFinanceBatchSnapshot } from "../src/modules/finance/finance.import-batch.reconciliation";
import type { FinanceCsvImportSummary } from "../src/modules/finance/finance.csv.execution";

const execution: FinanceCsvImportSummary = {
    record_kind: "OUTLAY",
    total_rows: 2,
    attempted_rows: 2,
    created: 1,
    duplicates: 1,
    rejected: 0,
    results: [
        { row_number: 2, outcome: "CREATED", record_id: 101 },
        { row_number: 3, outcome: "DUPLICATE", record_id: 102 },
    ],
    partial_commit_possible: true,
};

const persisted: PersistedFinanceBatchSnapshot = {
    id: 55,
    recordKind: "OUTLAY",
    totalRows: 2,
    attemptedRows: 2,
    createdRows: 1,
    duplicateRows: 1,
    rejectedRows: 0,
    rows: [
        { rowNumber: 2, outcome: "CREATED", targetRecordId: 101 },
        { rowNumber: 3, outcome: "DUPLICATE", targetRecordId: 102 },
    ],
};

test("matches persisted batch metadata against execution results", () => {
    assert.deepEqual(reconcileFinanceImportBatch(execution, persisted), {
        status: "MATCHED",
        batch_id: 55,
        differences: [],
        automatic_retry_allowed: false,
    });
});

test("flags missing metadata without allowing automatic replay", () => {
    assert.deepEqual(reconcileFinanceImportBatch(execution, null), {
        status: "METADATA_MISSING",
        batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"],
        automatic_retry_allowed: false,
    });
});

test("reports counter and row-level metadata mismatches", () => {
    const result = reconcileFinanceImportBatch(execution, {
        ...persisted,
        createdRows: 2,
        rows: [
            { rowNumber: 2, outcome: "REJECTED", targetRecordId: null },
            { rowNumber: 4, outcome: "DUPLICATE", targetRecordId: 102 },
        ],
    });
    assert.equal(result.status, "MISMATCHED");
    if (result.status !== "MISMATCHED") return;
    assert.ok(result.differences.includes("CREATED_ROWS_MISMATCH"));
    assert.ok(result.differences.includes("ROW_2_OUTCOME_MISMATCH"));
    assert.ok(result.differences.includes("ROW_2_TARGET_ID_MISMATCH"));
    assert.ok(result.differences.includes("ROW_3_MISSING"));
    assert.ok(result.differences.includes("ROW_4_UNEXPECTED"));
    assert.equal(result.automatic_retry_allowed, false);
});

test("detects duplicate row numbers in persisted metadata", () => {
    const result = reconcileFinanceImportBatch(execution, {
        ...persisted,
        rows: [...persisted.rows, persisted.rows[0]],
    });
    assert.equal(result.status, "MISMATCHED");
    if (result.status === "MISMATCHED") {
        assert.ok(result.differences.includes("DUPLICATE_ROW_NUMBER"));
    }
});
