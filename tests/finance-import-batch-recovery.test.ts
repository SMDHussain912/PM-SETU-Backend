import test from "node:test";
import assert from "node:assert/strict";
import { buildFinanceImportRecoveryCase } from "../src/modules/finance/finance.import-batch.recovery";
import type { FinanceImportReconciliation } from "../src/modules/finance/finance.import-batch.reconciliation";

test("matched reconciliation does not create a recovery case", () => {
    const result = buildFinanceImportRecoveryCase({
        status: "MATCHED", batch_id: 12, differences: [], automatic_retry_allowed: false,
    });
    assert.deepEqual(result, {
        status: "NO_RECOVERY_REQUIRED", batch_id: 12, case_type: "NONE",
        discrepancy_codes: [], affected_row_numbers: [], investigation_steps: [],
        automatic_retry_allowed: false,
    });
});

test("missing metadata produces a review plan without enabling retry", () => {
    const result = buildFinanceImportRecoveryCase({
        status: "METADATA_MISSING", batch_id: null,
        differences: ["EXECUTION_METADATA_NOT_PERSISTED"], automatic_retry_allowed: false,
    });
    assert.equal(result.status, "REQUIRES_REVIEW");
    if (result.status !== "REQUIRES_REVIEW") return;
    assert.equal(result.case_type, "MISSING_METADATA");
    assert.deepEqual(result.affected_row_numbers, []);
    assert.ok(result.investigation_steps.length >= 3);
    assert.equal(result.automatic_retry_allowed, false);
});

test("mismatch extracts unique sorted affected row numbers", () => {
    const reconciliation: FinanceImportReconciliation = {
        status: "MISMATCHED", batch_id: 31,
        differences: ["ROW_8_OUTCOME_MISMATCH", "CREATED_ROWS_MISMATCH",
            "ROW_3_MISSING", "ROW_8_TARGET_ID_MISMATCH", "ROW_0_UNEXPECTED"],
        automatic_retry_allowed: false,
    };
    const result = buildFinanceImportRecoveryCase(reconciliation);
    assert.equal(result.status, "REQUIRES_REVIEW");
    if (result.status !== "REQUIRES_REVIEW") return;
    assert.equal(result.case_type, "METADATA_MISMATCH");
    assert.deepEqual(result.affected_row_numbers, [3, 8]);
    assert.deepEqual(result.discrepancy_codes, reconciliation.differences);
    assert.equal(result.automatic_retry_allowed, false);
});

test("recovery planning is deterministic and does not mutate reconciliation", () => {
    const reconciliation: FinanceImportReconciliation = {
        status: "MISMATCHED", batch_id: 7, differences: ["ROW_2_MISSING"],
        automatic_retry_allowed: false,
    };
    const before = structuredClone(reconciliation);
    assert.deepEqual(buildFinanceImportRecoveryCase(reconciliation), buildFinanceImportRecoveryCase(reconciliation));
    assert.deepEqual(reconciliation, before);
});


test("recovery identifies rows implicated by duplicate and invalid-position findings", () => {
    const result = buildFinanceImportRecoveryCase({
        status: "MISMATCHED",
        batch_id: 44,
        differences: [
            "DUPLICATE_ROW_NUMBER",
            "ROW_2_DUPLICATE",
            "INVALID_EXECUTION_ROW_NUMBER",
            "ROW_1_INVALID_POSITION",
        ],
        automatic_retry_allowed: false,
    });
    assert.equal(result.status, "REQUIRES_REVIEW");
    if (result.status !== "REQUIRES_REVIEW") return;
    assert.deepEqual(result.affected_row_numbers, [1, 2]);
    assert.equal(result.automatic_retry_allowed, false);
});
