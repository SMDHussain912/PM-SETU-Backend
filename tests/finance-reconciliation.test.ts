import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFinanceReconciliation } from "../src/modules/finance/finance.reconciliation";

const sanctionDate = new Date("2026-04-10T00:00:00.000Z");
const releaseDate = new Date("2026-05-10T00:00:00.000Z");
const transactionDate = new Date("2026-06-10T00:00:00.000Z");

test("returns no findings for chronologically consistent linked records", () => {
    const findings = evaluateFinanceReconciliation({
        outlays: [{ id: 1, financialYear: "2026-27", sanctionDate, clusterId: 4, iti: { id: 9, clusterId: 4 } }],
        releases: [{ id: 2, financialYear: "2026-27", releaseDate, outlay: { id: 1, financialYear: "2026-27", sanctionDate } }],
        expenditures: [{
            id: 3,
            financialYear: "2026-27",
            transactionDate,
            outlay: { id: 1, financialYear: "2026-27", sanctionDate },
            release: { id: 2, financialYear: "2026-27", releaseDate },
        }],
    });
    assert.deepEqual(findings, []);
});

test("flags a release dated before its sanction and a financial-year mismatch", () => {
    const findings = evaluateFinanceReconciliation({
        outlays: [],
        releases: [{
            id: 2,
            financialYear: "2025-26",
            releaseDate: new Date("2026-03-01T00:00:00.000Z"),
            outlay: { id: 1, financialYear: "2026-27", sanctionDate },
        }],
        expenditures: [],
    });
    assert.deepEqual(findings.map((item) => item.code), [
        "RELEASE_FINANCIAL_YEAR_MISMATCH",
        "RELEASE_BEFORE_SANCTION",
    ]);
    assert.ok(findings.every((item) => item.severity === "WARNING"));
});

test("flags expenditure dated before its sanction or linked release", () => {
    const findings = evaluateFinanceReconciliation({
        outlays: [],
        releases: [],
        expenditures: [{
            id: 3,
            financialYear: "2026-27",
            transactionDate: new Date("2026-04-20T00:00:00.000Z"),
            outlay: { id: 1, financialYear: "2026-27", sanctionDate },
            release: { id: 2, financialYear: "2026-27", releaseDate },
        }],
    });
    assert.deepEqual(findings.map((item) => item.code), ["EXPENDITURE_BEFORE_RELEASE"]);
});

test("flags current ITI-to-cluster attribution mismatch without mutating records", () => {
    const findings = evaluateFinanceReconciliation({
        outlays: [{ id: 1, financialYear: "2026-27", sanctionDate, clusterId: 4, iti: { id: 9, clusterId: 8 } }],
        releases: [],
        expenditures: [],
    });
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "OUTLAY_ITI_CLUSTER_MISMATCH");
    assert.equal(findings[0].record_id, 1);
});

test("does not infer totals, accepted expenditure, utilisation, or balance", () => {
    const findings = evaluateFinanceReconciliation({
        outlays: [],
        releases: [],
        expenditures: [{
            id: 3,
            financialYear: "2026-27",
            transactionDate,
            outlay: { id: 1, financialYear: "2026-27", sanctionDate },
        }],
    });
    assert.deepEqual(findings, []);
});
