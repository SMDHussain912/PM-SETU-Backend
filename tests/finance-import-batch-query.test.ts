import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/utils/response";
import { validateFinanceImportBatchQuery, validateFinanceImportBatchRowsQuery, type FinanceImportBatchQuery } from "../src/modules/finance/finance.import-batch.query";

const valid: FinanceImportBatchQuery = { page: 1, page_size: 25 };

function expectError(run: () => void, code: string) {
    assert.throws(run, (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.code, code);
        assert.equal(error.statusCode, 422);
        return true;
    });
}

test("accepts valid batch history filters", () => {
    assert.doesNotThrow(() => validateFinanceImportBatchQuery({
        ...valid,
        record_kind: "OUTLAY",
        lifecycle: "EXECUTED",
        created_from: new Date("2026-01-01T00:00:00.000Z"),
        created_to: new Date("2026-12-31T23:59:59.000Z"),
    }));
});

test("enforces bounded pagination", () => {
    expectError(() => validateFinanceImportBatchQuery({ ...valid, page: 0 }), "INVALID_PAGE");
    expectError(() => validateFinanceImportBatchQuery({ ...valid, page_size: 101 }), "INVALID_PAGE_SIZE");
});

test("rejects unknown record kinds and lifecycle values", () => {
    expectError(() => validateFinanceImportBatchQuery({ ...valid, record_kind: "OTHER" as never }), "INVALID_RECORD_KIND");
    expectError(() => validateFinanceImportBatchQuery({ ...valid, lifecycle: "APPROVED" }), "INVALID_BATCH_LIFECYCLE");
});

test("rejects invalid and reversed date ranges", () => {
    expectError(() => validateFinanceImportBatchQuery({ ...valid, created_from: new Date("bad") }), "INVALID_BATCH_DATE");
    expectError(() => validateFinanceImportBatchQuery({
        ...valid,
        created_from: new Date("2026-12-01T00:00:00.000Z"),
        created_to: new Date("2026-01-01T00:00:00.000Z"),
    }), "INVALID_BATCH_DATE_RANGE");
});


test("validates bounded pagination for batch row diagnostics", () => {
    assert.doesNotThrow(() => validateFinanceImportBatchRowsQuery({ batch_id: 5, page: 1, page_size: 50 }));
    expectError(() => validateFinanceImportBatchRowsQuery({ batch_id: 0, page: 1, page_size: 50 }), "INVALID_BATCH_ID");
    expectError(() => validateFinanceImportBatchRowsQuery({ batch_id: 5, page: 0, page_size: 50 }), "INVALID_PAGE");
    expectError(() => validateFinanceImportBatchRowsQuery({ batch_id: 5, page: 1, page_size: 101 }), "INVALID_PAGE_SIZE");
});
