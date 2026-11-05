import test from "node:test";
import assert from "node:assert/strict";
import { parseFinanceCsv } from "../src/modules/finance/finance.csv";
import { mapFinanceCsvRows } from "../src/modules/finance/finance.csv.mapping";

test("maps valid outlay rows and retains normalized source values", () => {
    const parsed = parseFinanceCsv(
        "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level,cluster_id\nFMS,A1,SAN-1,2026-04-01,2026-27,1000.50,CLUSTER,4",
        { requiredHeaders: ["source_system"] },
    );
    const result = mapFinanceCsvRows(parsed, "OUTLAY");
    assert.equal(result.valid_rows.length, 1);
    assert.equal(result.valid_rows[0].values.approved_amount, "1000.50");
    assert.equal(result.valid_rows[0].values.cluster_id, "4");
    assert.deepEqual(result.errors, []);
});

test("reports missing required columns before mapping any row", () => {
    const parsed = parseFinanceCsv("source_system,source_record_id\nFMS,A1", { requiredHeaders: ["source_system"] });
    const result = mapFinanceCsvRows(parsed, "OUTLAY");
    assert.equal(result.valid_rows.length, 0);
    assert.ok(result.errors.some((error) => error.code === "REQUIRED_HEADER_MISSING" && error.field === "sanction_date"));
});

test("rejects malformed amounts, impossible dates and unsafe IDs", () => {
    const parsed = parseFinanceCsv(
        "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level,cluster_id\nFMS,A1,SAN-1,2026-02-30,2026-27,1e6,CLUSTER,0",
        { requiredHeaders: ["source_system"] },
    );
    const result = mapFinanceCsvRows(parsed, "OUTLAY");
    assert.equal(result.valid_rows.length, 0);
    assert.deepEqual(result.errors.map((error) => error.code).sort(), ["INVALID_DATE", "INVALID_DECIMAL", "INVALID_ID"]);
});

test("detects duplicate source identities within one file", () => {
    const parsed = parseFinanceCsv(
        "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level\nFMS,A1,SAN-1,2026-04-01,2026-27,100,STATE\nFMS,A1,SAN-2,2026-04-02,2026-27,200,STATE",
        { requiredHeaders: ["source_system"] },
    );
    const result = mapFinanceCsvRows(parsed, "OUTLAY");
    assert.equal(result.valid_rows.length, 1);
    assert.deepEqual(result.duplicate_source_rows, [{
        row_number: 3,
        first_row_number: 2,
        source_system: "FMS",
        source_record_id: "A1",
    }]);
});

test("validates release and expenditure-specific linkage identifiers", () => {
    const release = parseFinanceCsv(
        "source_system,source_record_id,outlay_id,release_reference,release_date,financial_year,released_amount,recipient_reference\nFMS,R1,0,REL-1,2026-04-01,2026-27,50,ITI",
        { requiredHeaders: ["source_system"] },
    );
    assert.ok(mapFinanceCsvRows(release, "RELEASE").errors.some((error) => error.field === "outlay_id"));

    const expenditure = parseFinanceCsv(
        "source_system,source_record_id,outlay_id,release_id,transaction_reference,transaction_date,financial_year,amount,recognition_basis\nFMS,E1,1,-2,V-1,2026-04-02,2026-27,10,UNCONFIRMED",
        { requiredHeaders: ["source_system"] },
    );
    assert.ok(mapFinanceCsvRows(expenditure, "EXPENDITURE").errors.some((error) => error.field === "release_id"));
});
