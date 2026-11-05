import test from "node:test";
import assert from "node:assert/strict";
import {
    buildFinanceReconciliationReport,
    serializeFinanceReconciliationCsv,
} from "../src/modules/finance/finance.reconciliation.report";
import type { FinanceReconciliationFinding } from "../src/modules/finance/finance.reconciliation";

const findings: FinanceReconciliationFinding[] = [
    {
        code: "RELEASE_BEFORE_SANCTION",
        severity: "WARNING",
        record_type: "RELEASE",
        record_id: 12,
        related_record_id: 4,
        message: "Release date precedes sanction.",
    },
    {
        code: "RELEASE_BEFORE_SANCTION",
        severity: "WARNING",
        record_type: "RELEASE",
        record_id: 13,
        related_record_id: 5,
        message: "Release date precedes sanction.",
    },
    {
        code: "OUTLAY_ITI_CLUSTER_MISMATCH",
        severity: "WARNING",
        record_type: "OUTLAY",
        record_id: 9,
        message: "Cluster assignment differs.",
    },
];

test("groups findings by warning code and record type across the full result set", () => {
    const report = buildFinanceReconciliationReport({
        findings,
        scanned: { outlays: 2, releases: 3, expenditure_records: 4 },
        page: 1,
        page_size: 1,
    });
    assert.equal(report.summary.total_findings, 3);
    assert.deepEqual(report.summary.by_code, [
        { code: "OUTLAY_ITI_CLUSTER_MISMATCH", severity: "WARNING", count: 1 },
        { code: "RELEASE_BEFORE_SANCTION", severity: "WARNING", count: 2 },
    ]);
    assert.deepEqual(report.summary.by_record_type, [
        { record_type: "OUTLAY", count: 1 },
        { record_type: "RELEASE", count: 2 },
    ]);
    assert.equal(report.page.total, 3);
    assert.equal(report.page.total_pages, 3);
    assert.equal(report.page.items.length, 1);
});

test("finding identifiers are stable and distinguish related source records", () => {
    const first = buildFinanceReconciliationReport({
        findings,
        scanned: { outlays: 0, releases: 0, expenditure_records: 0 },
        page: 1,
        page_size: 10,
    });
    const second = buildFinanceReconciliationReport({
        findings: [...findings],
        scanned: { outlays: 0, releases: 0, expenditure_records: 0 },
        page: 1,
        page_size: 10,
    });
    assert.equal(first.page.items[0].finding_id, second.page.items[0].finding_id);
    assert.notEqual(first.page.items[0].finding_id, first.page.items[1].finding_id);
});

test("CSV escapes quotes and neutralizes spreadsheet formula prefixes", () => {
    const csv = serializeFinanceReconciliationCsv([{
        finding_id: "WARNING:1",
        severity: "WARNING",
        code: "RELEASE_BEFORE_SANCTION",
        record_type: "RELEASE",
        record_id: 1,
        message: '=HYPERLINK("https://example.invalid","open")',
    }]);
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.invalid"",""open""\)"/);
    assert.ok(csv.startsWith('"finding_id","severity","code"'));
});

test("empty reports have zero pages and preserve scan counts", () => {
    const report = buildFinanceReconciliationReport({
        findings: [],
        scanned: { outlays: 1, releases: 2, expenditure_records: 3 },
        page: 1,
        page_size: 20,
    });
    assert.equal(report.page.total_pages, 0);
    assert.deepEqual(report.page.items, []);
    assert.deepEqual(report.scanned, { outlays: 1, releases: 2, expenditure_records: 3 });
});
