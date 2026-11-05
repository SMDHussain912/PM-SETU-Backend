import type { FinanceImportRecoveryReport } from "./finance.import-batch.recovery-report";

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates the report shape and fixed safety flags before export. */
export function validateFinanceImportRecoveryReport(value: unknown): value is FinanceImportRecoveryReport {
    if (!isObject(value) || value.report_type !== "FINANCE_IMPORT_RECOVERY") return false;
    if (value.status !== "NO_RECOVERY_REQUIRED" && value.status !== "REQUIRES_REVIEW") return false;
    if (!["NONE", "MISSING_METADATA", "METADATA_MISMATCH"].includes(String(value.case_type))) return false;
    if (!(value.batch_id === null || (Number.isSafeInteger(value.batch_id) && Number(value.batch_id) > 0))) return false;
    if (typeof value.summary !== "string" || !value.summary.trim()) return false;
    if (!Array.isArray(value.discrepancy_codes) || !value.discrepancy_codes.every((v) => typeof v === "string")) return false;
    if (!Array.isArray(value.affected_row_numbers) || !value.affected_row_numbers.every((v) => Number.isSafeInteger(v) && v > 0)) return false;
    if (!Array.isArray(value.investigation_steps) || !value.investigation_steps.every((v) => typeof v === "string")) return false;
    if (!Array.isArray(value.evidence_checklist)) return false;
    if (!value.evidence_checklist.every((item) => isObject(item) &&
        typeof item.evidence_key === "string" && item.evidence_key.trim().length > 0 &&
        typeof item.description === "string" && item.description.trim().length > 0 &&
        ["REQUIRED", "NOT_AVAILABLE", "CONDITIONAL"].includes(String(item.requirement)))) return false;
    if (!isObject(value.safeguards) || value.safeguards.automatic_retry_allowed !== false ||
        value.safeguards.financial_records_modified !== false ||
        value.safeguards.accounting_approval_granted !== false) return false;
    if (new Set(value.affected_row_numbers).size !== value.affected_row_numbers.length) return false;
    if (!value.discrepancy_codes.every((code) => code.trim().length > 0) ||
        !value.investigation_steps.every((step) => step.trim().length > 0)) return false;
    const evidenceKeys = value.evidence_checklist.map((item) => (item as Record<string, unknown>).evidence_key);
    if (new Set(evidenceKeys).size !== evidenceKeys.length) return false;
    if (value.status === "NO_RECOVERY_REQUIRED") {
        return value.case_type === "NONE" && value.batch_id !== null &&
            value.discrepancy_codes.length === 0 && value.affected_row_numbers.length === 0 &&
            value.investigation_steps.length === 0 && value.evidence_checklist.length === 0;
    }
    if (value.case_type !== "MISSING_METADATA" && value.case_type !== "METADATA_MISMATCH") return false;
    if ((value.case_type === "MISSING_METADATA") !== (value.batch_id === null)) return false;
    if (value.discrepancy_codes.length === 0 || value.investigation_steps.length === 0) return false;

    const expectedEvidence = [
        ["EXECUTION_SUMMARY", "REQUIRED"],
        ["SOURCE_FILE_SHA256", "REQUIRED"],
        ["PERSISTED_BATCH_SNAPSHOT", value.case_type === "MISSING_METADATA" ? "NOT_AVAILABLE" : "REQUIRED"],
        ["SOURCE_SYSTEM_COMPARISON", "REQUIRED"],
        ["EXECUTION_FAILURE_LOGS", "CONDITIONAL"],
    ];
    if (value.evidence_checklist.length !== expectedEvidence.length) return false;
    return value.evidence_checklist.every((item, index) => {
        const evidence = item as Record<string, unknown>;
        return evidence.evidence_key === expectedEvidence[index][0] &&
            evidence.requirement === expectedEvidence[index][1];
    });
}

/** Stable JSON text with fixed key order, two-space indentation, and trailing newline. */
export function serializeFinanceImportRecoveryReport(report: FinanceImportRecoveryReport): string {
    if (!validateFinanceImportRecoveryReport(report)) throw new Error("INVALID_FINANCE_IMPORT_RECOVERY_REPORT");
    return JSON.stringify({
        report_type: report.report_type,
        status: report.status,
        batch_id: report.batch_id,
        case_type: report.case_type,
        summary: report.summary,
        discrepancy_codes: [...report.discrepancy_codes],
        affected_row_numbers: [...report.affected_row_numbers],
        investigation_steps: [...report.investigation_steps],
        evidence_checklist: report.evidence_checklist.map((item) => ({
            evidence_key: item.evidence_key, description: item.description, requirement: item.requirement,
        })),
        safeguards: {
            automatic_retry_allowed: false,
            financial_records_modified: false,
            accounting_approval_granted: false,
        },
    }, null, 2) + "\n";
}

/** Parses JSON and validates it before returning the report. */
export function parseFinanceImportRecoveryReport(serialized: string): FinanceImportRecoveryReport {
    let parsed: unknown;
    try {
        parsed = JSON.parse(serialized);
    } catch {
        throw new Error("INVALID_FINANCE_IMPORT_RECOVERY_REPORT_JSON");
    }
    if (!validateFinanceImportRecoveryReport(parsed)) throw new Error("INVALID_FINANCE_IMPORT_RECOVERY_REPORT");
    return parsed;
}
