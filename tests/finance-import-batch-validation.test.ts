import test from "node:test";
import assert from "node:assert/strict";
import type { CreateFinanceImportBatchInput } from "../src/modules/finance/finance.import-batch.repository";
import { validateFinanceImportBatchInput } from "../src/modules/finance/finance.import-batch.validation";

const base: CreateFinanceImportBatchInput = {
    record_kind: "OUTLAY",
    file_sha256: "a".repeat(64),
    idempotency_key: "123e4567-e89b-42d3-a456-426614174000",
    lifecycle: "PREVIEWED",
    total_rows: 2,
    valid_rows: 2,
    invalid_rows: 0,
    attempted_rows: 0,
    rows: [
        { row_number: 2, outcome: "VALID" },
        { row_number: 3, outcome: "VALID" },
    ],
};

test("accepts a preview batch with complete valid row outcomes", () => {
    assert.doesNotThrow(() => validateFinanceImportBatchInput(base));
});

test("accepts a partially executed batch with a selective retry remainder", () => {
    assert.doesNotThrow(() => validateFinanceImportBatchInput({
        ...base,
        lifecycle: "PARTIALLY_EXECUTED",
        attempted_rows: 1,
        created_rows: 1,
        rows: [
            { row_number: 2, outcome: "VALID" },
            { row_number: 3, outcome: "CREATED", target_record_id: 7 },
        ],
    }));
});

test("rejects incomplete row outcome metadata", () => {
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        rows: [{ row_number: 2, outcome: "VALID" }],
    }), /ROW_OUTCOMES_INCOMPLETE/);
});

test("rejects mismatched attempt counters and row outcomes", () => {
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        attempted_rows: 1,
        created_rows: 0,
    }), /ATTEMPT_COUNTERS_INCONSISTENT/);
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        lifecycle: "EXECUTED",
        attempted_rows: 1,
        created_rows: 1,
    }), /ROW_COUNTERS_INCONSISTENT/);
});

test("rejects lifecycle labels that contradict the recorded outcomes", () => {\n    assert.throws(() => validateFinanceImportBatchInput({\n        ...base,\n        lifecycle: "EXECUTED",\n        attempted_rows: 1,\n        created_rows: 1,\n        rows: [{ row_number: 2, outcome: "CREATED", target_record_id: 1 }, { row_number: 3, outcome: "VALID" }],\n    }), /LIFECYCLE_COUNTERS_INCONSISTENT/);
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        lifecycle: "EXECUTED",
    }), /LIFECYCLE_COUNTERS_INCONSISTENT/);
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        lifecycle: "EXECUTED_WITH_REJECTIONS",
    }), /LIFECYCLE_COUNTERS_INCONSISTENT/);
});

test("accepts invalid preview rows without marking them as attempted", () => {
    assert.doesNotThrow(() => validateFinanceImportBatchInput({
        ...base,
        lifecycle: "INVALID",
        valid_rows: 1,
        invalid_rows: 1,
        rows: [
            { row_number: 2, outcome: "VALID" },
            { row_number: 3, outcome: "INVALID", error_code: "BAD_DATE" },
        ],
    }));
});


test("rejects total row counters that do not match valid and invalid rows", () => {
    assert.throws(() => validateFinanceImportBatchInput({ ...base, total_rows: 3 }), /TOTAL_ROW_COUNTERS_INCONSISTENT/);
});

test("rejects duplicate or invalid CSV row positions", () => {
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        rows: [
            { row_number: 2, outcome: "VALID" },
            { row_number: 2, outcome: "VALID" },
        ],
    }), /ROW_NUMBER_DUPLICATE/);
    assert.throws(() => validateFinanceImportBatchInput({
        ...base,
        rows: [
            { row_number: 1, outcome: "VALID" },
            { row_number: 3, outcome: "VALID" },
        ],
    }), /ROW_NUMBER_INVALID/);
});

test("rejects header row and non-integer CSV row positions", () => {
    for (const row_number of [1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => validateFinanceImportBatchInput({
            ...base,
            rows: [
                { row_number, outcome: "VALID" },
                { row_number: 3, outcome: "VALID" },
            ],
        }), /ROW_NUMBER_INVALID/);
    }
});
