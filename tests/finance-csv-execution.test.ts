import test from "node:test";
import assert from "node:assert/strict";
import { executeFinanceCsvImport, executeFinanceCsvRetry, type FinanceCsvImportHandlers } from "../src/modules/finance/finance.csv.execution";
import { planFinanceCsvRetry } from "../src/modules/finance/finance.import-batch.retry";
import { previewFinanceCsv } from "../src/modules/finance/finance.csv.preview";

const csv = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100.25,STATE\nFMS,A2,SAN-2,2026-04-02,2026-27,200,STATE";

function handlers(): FinanceCsvImportHandlers {
    let id = 0;
    return {
        outlay: async (input) => {
            assert.equal(input.approved_amount.toFixed(2), input.source_record_id === "A1" ? "100.25" : "200.00");
            id += 1;
            return { outcome: input.source_record_id === "A2" ? "DUPLICATE" : "CREATED", item: { id } };
        },
        release: async () => ({ outcome: "CREATED", item: { id: 10 } }),
        expenditure: async () => ({ outcome: "CREATED", item: { id: 11 } }),
    };
}

test("executes only valid preview rows and summarizes created and duplicate outcomes", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    const result = await executeFinanceCsvImport(preview, handlers());
    assert.equal(result.attempted_rows, 2);
    assert.equal(result.created, 1);
    assert.equal(result.duplicates, 1);
    assert.equal(result.rejected, 0);
    assert.equal(result.partial_commit_possible, true);
});

test("records row failures and continues processing subsequent rows", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    let calls = 0;
    const h = handlers();
    h.outlay = async () => {
        calls += 1;
        if (calls === 1) throw new Error("OUTLAY_NOT_FOUND");
        return { outcome: "CREATED", item: { id: 22 } };
    };
    const result = await executeFinanceCsvImport(preview, h);
    assert.equal(result.rejected, 1);
    assert.equal(result.created, 1);
    assert.equal(result.results[0].code, "ROW_IMPORT_FAILED");
});

test("refuses files without a successful parse and mapping preview", async () => {
    const preview = previewFinanceCsv('id,name\n1,"broken', "OUTLAY");
    await assert.rejects(() => executeFinanceCsvImport(preview, handlers()), /PREVIEW_REQUIRED/);
});

test("does not execute rows when required headers are invalid", async () => {
    const preview = previewFinanceCsv("source_system,source_record_id\nFMS,A1", "OUTLAY");
    await assert.rejects(() => executeFinanceCsvImport(preview, handlers()), /HEADERS_INVALID/);
});

test("does not attempt invalid rows from a partially valid preview", async () => {
    const preview = previewFinanceCsv(
        csv + "\nFMS,A3,SAN-3,bad-date,2026-27,10,STATE",
        "OUTLAY",
    );
    const result = await executeFinanceCsvImport(preview, handlers());
    assert.equal(result.total_rows, 3);
    assert.equal(result.attempted_rows, 2);
    assert.equal(result.rejected, 0);
});


test("retry execution dispatches only rejected rows selected by the safe retry plan", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    const hash = "a".repeat(64);
    const plan = planFinanceCsvRetry(preview, hash, hash, [
        { row_number: 2, outcome: "CREATED" },
        { row_number: 3, outcome: "REJECTED" },
    ]);
    const calls: string[] = [];
    const h = handlers();
    h.outlay = async (input) => {
        calls.push(input.source_record_id);
        return { outcome: "CREATED", item: { id: 33 } };
    };

    const result = await executeFinanceCsvRetry(preview, plan, h);
    assert.deepEqual(calls, ["A2"]);
    assert.equal(result.attempted_rows, 1);
    assert.equal(result.created, 1);
    assert.equal(result.total_rows, 2);
    assert.equal(result.partial_commit_possible, true);
});

test("retry execution rejects duplicate or invalid row selections", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    await assert.rejects(() => executeFinanceCsvRetry(preview, {
        retry_row_numbers: [2, 2],
        skipped_row_numbers: [3],
        reason: "RETRY_REJECTED_ROWS",
    }, handlers()), /INVALID_FINANCE_RETRY_PLAN/);
    await assert.rejects(() => executeFinanceCsvRetry(preview, {
        retry_row_numbers: [1],
        skipped_row_numbers: [],
        reason: "RETRY_REJECTED_ROWS",
    }, handlers()), /INVALID_FINANCE_RETRY_PLAN/);
    await assert.rejects(() => executeFinanceCsvRetry(preview, {
        retry_row_numbers: [99],
        skipped_row_numbers: [],
        reason: "RETRY_REJECTED_ROWS",
    }, handlers()), /INVALID_FINANCE_RETRY_PLAN/);
});

test("empty retry plan performs no writes", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    const calls: string[] = [];
    const h = handlers();
    h.outlay = async (input) => {
        calls.push(input.source_record_id);
        return { outcome: "CREATED", item: { id: 44 } };
    };
    const result = await executeFinanceCsvRetry(preview, {
        retry_row_numbers: [],
        skipped_row_numbers: [2, 3],
        reason: "NO_REJECTED_ROWS",
    }, h);
    assert.deepEqual(calls, []);
    assert.equal(result.attempted_rows, 0);
});
