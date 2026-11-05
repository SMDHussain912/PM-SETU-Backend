import test from "node:test";
import assert from "node:assert/strict";
import { buildFinanceImportRecoveryEvidenceChecklist } from "../src/modules/finance/finance.import-batch.recovery-evidence";
import { buildFinanceImportRecoveryCase } from "../src/modules/finance/finance.import-batch.recovery";

test("matched recovery produces no evidence checklist", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MATCHED", batch_id: 1, differences: [], automatic_retry_allowed: false,
    });
    assert.deepEqual(buildFinanceImportRecoveryEvidenceChecklist(recovery), []);
});

test("missing metadata marks the absent snapshot explicitly", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "METADATA_MISSING", batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"], automatic_retry_allowed: false,
    });
    const checklist = buildFinanceImportRecoveryEvidenceChecklist(recovery);
    assert.equal(checklist.find((item) => item.evidence_key === "PERSISTED_BATCH_SNAPSHOT")?.requirement, "NOT_AVAILABLE");
    assert.equal(checklist.find((item) => item.evidence_key === "EXECUTION_SUMMARY")?.requirement, "REQUIRED");
});

test("mismatch requires the persisted snapshot and source comparison", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MISMATCHED", batch_id: 8,
        differences: ["ROW_4_OUTCOME_MISMATCH"], automatic_retry_allowed: false,
    });
    const checklist = buildFinanceImportRecoveryEvidenceChecklist(recovery);
    assert.equal(checklist.find((item) => item.evidence_key === "PERSISTED_BATCH_SNAPSHOT")?.requirement, "REQUIRED");
    assert.equal(checklist.find((item) => item.evidence_key === "SOURCE_SYSTEM_COMPARISON")?.requirement, "REQUIRED");
    assert.equal(checklist.find((item) => item.evidence_key === "EXECUTION_FAILURE_LOGS")?.requirement, "CONDITIONAL");
});

test("evidence checklist is deterministic", () => {
    const recovery = buildFinanceImportRecoveryCase({
        status: "MISMATCHED", batch_id: 9,
        differences: ["CREATED_ROWS_MISMATCH"], automatic_retry_allowed: false,
    });
    assert.deepEqual(
        buildFinanceImportRecoveryEvidenceChecklist(recovery),
        buildFinanceImportRecoveryEvidenceChecklist(recovery),
    );
});
