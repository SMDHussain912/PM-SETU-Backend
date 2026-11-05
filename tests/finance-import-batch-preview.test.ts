import test from "node:test";
import assert from "node:assert/strict";
import { previewFinanceCsv } from "../src/modules/finance/finance.csv.preview";
import { persistFinanceCsvPreview } from "../src/modules/finance/finance.import-batch.preview";

const hash = "b".repeat(64);
const csv = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100.25,STATE";

test("persists preview metadata without invoking financial execution", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    let persisted: unknown;
    const result = await persistFinanceCsvPreview(
        preview,
        { file_sha256: hash, created_by: "operator-1" },
        async (input) => {
            persisted = input;
            return { id: 41 };
        },
    );

    assert.deepEqual(result, { id: 41 });
    assert.ok(persisted);
    const input = persisted as {
        lifecycle: string;
        attempted_rows?: number;
        rows: Array<Record<string, unknown>>;
    };
    assert.equal(input.lifecycle, "PREVIEWED");
    assert.equal(input.attempted_rows, 0);
    assert.equal(input.rows[0].outcome, "VALID");
    assert.equal("values" in input.rows[0], false);
});

test("persists invalid preview diagnostics for review", async () => {
    const invalidCsv = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,not-a-date,2026-27,100.25,STATE";
    const preview = previewFinanceCsv(invalidCsv, "OUTLAY");
    let persistedLifecycle = "";
    await persistFinanceCsvPreview(preview, { file_sha256: hash }, async (input) => {
        persistedLifecycle = input.lifecycle;
        return { id: 42 };
    });

    assert.equal(persistedLifecycle, "INVALID");
});

test("does not call persistence when projection options are invalid", async () => {
    const preview = previewFinanceCsv(csv, "OUTLAY");
    let called = false;
    await assert.rejects(
        persistFinanceCsvPreview(preview, { file_sha256: "invalid" }, async () => {
            called = true;
            return {};
        }),
        /INVALID_FILE_SHA256/,
    );
    assert.equal(called, false);
});
