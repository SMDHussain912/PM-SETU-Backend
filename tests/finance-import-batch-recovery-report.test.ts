import test from "node:test";
import assert from "node:assert/strict";
import { buildFinanceImportRecoveryCase } from "../src/modules/finance/finance.import-batch.recovery";
import { buildFinanceImportRecoveryEvidenceChecklist } from "../src/modules/finance/finance.import-batch.recovery-evidence";
import { buildFinanceImportRecoveryReport } from "../src/modules/finance/finance.import-batch.recovery-report";

test("report composes matched state with empty review sections", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MATCHED", batch_id: 5, differences: [], automatic_retry_allowed: false,
    });
    const checklist = buildFinanceImportRecoveryEvidenceChecklist(recovery);
    const report = buildFinanceImportRecoveryReport(recovery, checklist);
    assert.equal(report.report_type, "FINANCE_IMPORT_RECOVERY");
    assert.equal(report.status, "NO_RECOVERY_REQUIRED");
    assert.equal(report.batch_id, 5);
    assert.deepEqual(report.discrepancy_codes, []);
    assert.deepEqual(report.evidence_checklist, []);
    assert.equal(report.safeguards.accounting_approval_granted, false);
});

test("report includes missing metadata guidance and evidence state", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "METADATA_MISSING", batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"], automatic_retry_allowed: false,
    });
    const report = buildFinanceImportRecoveryReport(
        recovery, buildFinanceImportRecoveryEvidenceChecklist(recovery),
    );
    assert.equal(report.case_type, "MISSING_METADATA");
    assert.equal(report.evidence_checklist.find((item) => item.evidence_key === "PERSISTED_BATCH_SNAPSHOT")?.requirement, "NOT_AVAILABLE");
    assert.equal(report.safeguards.automatic_retry_allowed, false);
});

test("report carries affected rows and discrepancy codes without mutating inputs", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MISMATCHED", batch_id: 22,
        differences: ["ROW_6_MISSING", "ROW_2_OUTCOME_MISMATCH"],
        automatic_retry_allowed: false,
    });
    const evidence = buildFinanceImportRecoveryEvidenceChecklist(recovery);
    const beforeRecovery = structuredClone(recovery);
    const beforeEvidence = structuredClone(evidence);
    const report = buildFinanceImportRecoveryReport(recovery, evidence);
    assert.deepEqual(report.affected_row_numbers, [2, 6]);
    assert.deepEqual(report.discrepancy_codes, ["ROW_6_MISSING", "ROW_2_OUTCOME_MISMATCH"]);
    assert.deepEqual(recovery, beforeRecovery);
    assert.deepEqual(evidence, beforeEvidence);
    assert.equal(report.safeguards.financial_records_modified, false);
});

test("report generation is deterministic", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MISMATCHED", batch_id: 23,
        differences: ["CREATED_ROWS_MISMATCH"], automatic_retry_allowed: false,
    });
    const evidence = buildFinanceImportRecoveryEvidenceChecklist(recovery);
    assert.deepEqual(
        buildFinanceImportRecoveryReport(recovery, evidence),
        buildFinanceImportRecoveryReport(recovery, evidence),
    );
});
