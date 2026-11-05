import type { FinanceImportRecoveryCase } from "./finance.import-batch.recovery";
import type { FinanceImportRecoveryEvidenceItem } from "./finance.import-batch.recovery-evidence";

export interface FinanceImportRecoveryReport {
    report_type: "FINANCE_IMPORT_RECOVERY";
    status: FinanceImportRecoveryCase["status"];
    batch_id: number | null;
    case_type: "NONE" | "MISSING_METADATA" | "METADATA_MISMATCH";
    summary: string;
    discrepancy_codes: string[];
    affected_row_numbers: number[];
    investigation_steps: string[];
    evidence_checklist: FinanceImportRecoveryEvidenceItem[];
    safeguards: {
        automatic_retry_allowed: false;
        financial_records_modified: false;
        accounting_approval_granted: false;
    };
}

/**
 * Composes recovery planning outputs into a stable, serialisable report.
 * This report is informational only and must not be treated as an approval.
 */
export function buildFinanceImportRecoveryReport(
    recovery: FinanceImportRecoveryCase,
    evidenceChecklist: FinanceImportRecoveryEvidenceItem[],
): FinanceImportRecoveryReport {
    const summary = recovery.status === "NO_RECOVERY_REQUIRED"
        ? "Persisted import metadata matches the execution summary; no recovery review is indicated."
        : recovery.case_type === "MISSING_METADATA"
            ? "Execution evidence is available but persisted batch metadata is missing; investigation is required."
            : "Persisted batch metadata differs from execution evidence; investigation is required.";

    return {
        report_type: "FINANCE_IMPORT_RECOVERY",
        status: recovery.status,
        batch_id: recovery.batch_id,
        case_type: recovery.case_type,
        summary,
        discrepancy_codes: [...recovery.discrepancy_codes],
        affected_row_numbers: [...recovery.affected_row_numbers],
        investigation_steps: [...recovery.investigation_steps],
        evidence_checklist: evidenceChecklist.map((item) => ({ ...item })),
        safeguards: {
            automatic_retry_allowed: false,
            financial_records_modified: false,
            accounting_approval_granted: false,
        },
    };
}
