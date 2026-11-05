import test from "node:test";
import assert from "node:assert/strict";
import { buildFinanceImportRecoveryCase } from "../src/modules/finance/finance.import-batch.recovery";
import { buildFinanceImportRecoveryEvidenceChecklist } from "../src/modules/finance/finance.import-batch.recovery-evidence";
import { buildFinanceImportRecoveryReport } from "../src/modules/finance/finance.import-batch.recovery-report";
import { parseFinanceImportRecoveryReport, serializeFinanceImportRecoveryReport, validateFinanceImportRecoveryReport } from "../src/modules/finance/finance.import-batch.recovery-export";

function reportFixture() {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MISMATCHED", batch_id: 42, differences: ["ROW_5_MISSING"],
        automatic_retry_allowed: false,
    });
    return buildFinanceImportRecoveryReport(recovery, buildFinanceImportRecoveryEvidenceChecklist(recovery));
}

test("JSON export is deterministic and newline terminated", () => {
    const report = reportFixture();
    const json = serializeFinanceImportRecoveryReport(report);
    assert.equal(json, serializeFinanceImportRecoveryReport(report));
    assert.ok(json.endsWith("\n"));
});

test("JSON export parses back to the original report", () => {
    const report = reportFixture();
    assert.deepEqual(parseFinanceImportRecoveryReport(serializeFinanceImportRecoveryReport(report)), report);
});

test("validator rejects invalid report and changed safety flags", () => {
    const report = reportFixture();
    assert.equal(validateFinanceImportRecoveryReport(report), true);
    assert.equal(validateFinanceImportRecoveryReport({ ...report, safeguards: { ...report.safeguards, automatic_retry_allowed: true } }), false);
    assert.throws(() => parseFinanceImportRecoveryReport("not-json"));
});

test("serializer rejects invalid runtime input", () => {
    assert.throws(() => serializeFinanceImportRecoveryReport({} as never), {
        message: "INVALID_FINANCE_IMPORT_RECOVERY_REPORT",
    });
});


test("validator rejects inconsistent recovery identity and duplicate row/evidence references", () => {
    const report = reportFixture();
    assert.equal(validateFinanceImportRecoveryReport({ ...report, batch_id: null }), false);
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        affected_row_numbers: [5, 5],
    }), false);
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        evidence_checklist: [...report.evidence_checklist, report.evidence_checklist[0]],
    }), false);
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        evidence_checklist: [{ ...report.evidence_checklist[0], evidence_key: " " }],
    }), false);
});

test("validator requires missing-metadata cases to have a null batch identifier", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "METADATA_MISSING", batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"],
        automatic_retry_allowed: false,
    });
    const report = buildFinanceImportRecoveryReport(
        recovery,
        buildFinanceImportRecoveryEvidenceChecklist(recovery),
    );
    assert.equal(validateFinanceImportRecoveryReport(report), true);
    assert.equal(validateFinanceImportRecoveryReport({ ...report, batch_id: 42 }), false);
});


test("validator enforces canonical evidence checklist semantics for missing metadata", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "METADATA_MISSING", batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"],
        automatic_retry_allowed: false,
    });
    const report = buildFinanceImportRecoveryReport(
        recovery,
        buildFinanceImportRecoveryEvidenceChecklist(recovery),
    );
    assert.equal(validateFinanceImportRecoveryReport(report), true);
    const incorrectChecklist = report.evidence_checklist.map((item) =>
        item.evidence_key === "PERSISTED_BATCH_SNAPSHOT"
            ? { ...item, requirement: "REQUIRED" as const }
            : item,
    );
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        evidence_checklist: incorrectChecklist,
    }), false);
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        evidence_checklist: report.evidence_checklist.slice(0, 4),
    }), false);
});

test("validator rejects unexpected evidence keys even when checklist fields are valid", () => {
    const report = reportFixture();
    const alteredChecklist = report.evidence_checklist.map((item, index) =>
        index === 0 ? { ...item, evidence_key: "UNAPPROVED_EVIDENCE" } : item,
    );
    assert.equal(validateFinanceImportRecoveryReport({
        ...report,
        evidence_checklist: alteredChecklist,
    }), false);
});
