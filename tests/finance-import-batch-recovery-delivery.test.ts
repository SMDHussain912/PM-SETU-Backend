import test from "node:test";
import assert from "node:assert/strict";
import { buildFinanceImportRecoveryCase } from "../src/modules/finance/finance.import-batch.recovery";
import { buildFinanceImportRecoveryEvidenceChecklist } from "../src/modules/finance/finance.import-batch.recovery-evidence";
import { buildFinanceImportRecoveryReport } from "../src/modules/finance/finance.import-batch.recovery-report";
import { buildFinanceImportRecoveryDownload } from "../src/modules/finance/finance.import-batch.recovery-delivery";

function createReport(batchId: number | null) {
    const recovery = batchId === null
        ? buildFinanceImportRecoveryCase({ status: "METADATA_MISSING", batch_id: null, differences: ["EXECUTION_METADATA_NOT_PERSISTED"], automatic_retry_allowed: false })
        : buildFinanceImportRecoveryCase({ status: "MISMATCHED", batch_id: batchId, differences: ["ROW_4_MISSING"], automatic_retry_allowed: false });
    return buildFinanceImportRecoveryReport(recovery, buildFinanceImportRecoveryEvidenceChecklist(recovery));
}

test("builds a no-store JSON attachment for a batch report", () => {
    const result = buildFinanceImportRecoveryDownload(createReport(18));
    assert.equal(result.file_name, "finance-import-recovery-batch-18.json");
    assert.equal(result.content_type, "application/json; charset=utf-8");
    assert.equal(result.content_disposition, 'attachment; filename="finance-import-recovery-batch-18.json"');
    assert.equal(result.cache_control, "no-store");
    assert.equal(JSON.parse(result.body).batch_id, 18);
});

test("uses a safe stable filename when batch metadata is missing", () => {
    const result = buildFinanceImportRecoveryDownload(createReport(null));
    assert.equal(result.file_name, "finance-import-recovery-metadata-missing.json");
    assert.equal(result.cache_control, "no-store");
});

test("delivery descriptor does not mutate report data", () => {
    const report = createReport(19);
    const before = structuredClone(report);
    buildFinanceImportRecoveryDownload(report);
    assert.deepEqual(report, before);
});
