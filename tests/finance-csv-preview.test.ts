import test from "node:test";
import assert from "node:assert/strict";
import { previewFinanceCsv } from "../src/modules/finance/finance.csv.preview";

const validOutlay = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100,STATE";

test("previews valid rows without claiming they are persisted or approved", () => {
    const preview = previewFinanceCsv(validOutlay, "OUTLAY");
    assert.equal(preview.accepted_for_review, true);
    assert.equal(preview.total_rows, 1);
    assert.equal(preview.valid_row_count, 1);
    assert.equal(preview.invalid_row_count, 0);
    assert.equal(preview.file_error, null);
});

test("reports row validation failures while retaining valid rows", () => {
    const preview = previewFinanceCsv(
        validOutlay + "\nFMS,A2,SAN-2,not-a-date,2026-27,200,STATE",
        "OUTLAY",
    );
    assert.equal(preview.accepted_for_review, false);
    assert.equal(preview.valid_row_count, 1);
    assert.equal(preview.invalid_row_count, 1);
});

test("converts parser failures into a safe file-level preview error", () => {
    const preview = previewFinanceCsv("id,name\n1,\"broken", "OUTLAY");
    assert.equal(preview.accepted_for_review, false);
    assert.equal(preview.mapping, null);
    assert.equal(preview.file_error?.code, "FINANCE_CSV_UNCLOSED_QUOTE");
});

test("supports import size limits during preview", () => {
    const preview = previewFinanceCsv(validOutlay, "OUTLAY", { maxBytes: 10 });
    assert.equal(preview.accepted_for_review, false);
    assert.equal(preview.file_error?.code, "FINANCE_CSV_TOO_LARGE");
});
