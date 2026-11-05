import test from "node:test";
import assert from "node:assert/strict";
import { mapFinanceCsvRows } from "../src/modules/finance/finance.csv.mapping";
import { parseFinanceCsv } from "../src/modules/finance/finance.csv";

const headers = "source_system,source_record_id,sanction_reference,sanction_date,financial_year,approved_amount,scope_level";
function mapAmount(amount: string) {
    const csv = headers + "\nFMS,1,SAN-1,2026-04-01,2026-27," + amount + ",STATE";
    return mapFinanceCsvRows(parseFinanceCsv(csv, { requiredHeaders: [] }), "OUTLAY");
}

test("CSV mapping accepts maximum DECIMAL(18,2) and zero", () => {
    assert.equal(mapAmount("9999999999999999.99").valid_rows.length, 1);
    assert.equal(mapAmount("0").valid_rows.length, 1);
});

test("CSV mapping rejects amounts outside DECIMAL(18,2)", () => {
    for (const amount of ["10000000000000000", "1.234", "-1", "1e3", "99999999999999999.99"]) {
        const result = mapAmount(amount);
        assert.equal(result.valid_rows.length, 0, amount);
        assert.ok(result.errors.some((error) => error.code === "INVALID_DECIMAL"), amount);
    }
});