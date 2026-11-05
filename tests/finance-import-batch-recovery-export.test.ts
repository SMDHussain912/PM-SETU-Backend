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
