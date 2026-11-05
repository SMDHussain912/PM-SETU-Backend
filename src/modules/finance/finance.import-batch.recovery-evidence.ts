import type { FinanceImportRecoveryCase } from "./finance.import-batch.recovery";

export interface FinanceImportRecoveryEvidenceItem {
    evidence_key: string;
    description: string;
    requirement: "REQUIRED" | "NOT_AVAILABLE" | "CONDITIONAL";
}

/**
 * Produces a deterministic evidence checklist for a recovery review.
 * This is a report projection only: it does not fetch, store, or certify evidence.
 */
export function buildFinanceImportRecoveryEvidenceChecklist(
    recovery: FinanceImportRecoveryCase,
): FinanceImportRecoveryEvidenceItem[] {
    if (recovery.status === "NO_RECOVERY_REQUIRED") return [];

    const missingMetadata = recovery.case_type === "MISSING_METADATA";
    return [
        {
            evidence_key: "EXECUTION_SUMMARY",
            description: "Original row execution summary, including counters and row outcomes",
            requirement: "REQUIRED",
        },
        {
            evidence_key: "SOURCE_FILE_SHA256",
            description: "SHA-256 digest of the exact uploaded source file",
            requirement: "REQUIRED",
        },
        {
            evidence_key: "PERSISTED_BATCH_SNAPSHOT",
            description: "Persisted batch counters and row-level metadata snapshot",
            requirement: missingMetadata ? "NOT_AVAILABLE" : "REQUIRED",
        },
        {
            evidence_key: "SOURCE_SYSTEM_COMPARISON",
            description: "Comparison with the authoritative finance source system",
            requirement: "REQUIRED",
        },
        {
            evidence_key: "EXECUTION_FAILURE_LOGS",
            description: "Relevant application or persistence failure logs, if any",
            requirement: "CONDITIONAL",
        },
    ];
}
