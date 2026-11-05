import type { FinanceImportReconciliation } from "./finance.import-batch.reconciliation";

export type FinanceImportRecoveryCase =
    | {
        status: "NO_RECOVERY_REQUIRED";
        batch_id: number;
        case_type: "NONE";
        discrepancy_codes: [];
        affected_row_numbers: [];
        investigation_steps: [];
        automatic_retry_allowed: false;
    }
    | {
        status: "REQUIRES_REVIEW";
        batch_id: number | null;
        case_type: "MISSING_METADATA" | "METADATA_MISMATCH";
        discrepancy_codes: string[];
        affected_row_numbers: number[];
        investigation_steps: string[];
        automatic_retry_allowed: false;
    };

/**
 * Builds a deterministic, metadata-only investigation plan from reconciliation.
 * It does not persist a case, assign an owner, authorize a correction, or replay
 * financial handlers. Those operational policies require Finance approval.
 */
export function buildFinanceImportRecoveryCase(
    reconciliation: FinanceImportReconciliation,
): FinanceImportRecoveryCase {
    if (reconciliation.status === "MATCHED") {
        return {
            status: "NO_RECOVERY_REQUIRED",
            batch_id: reconciliation.batch_id,
            case_type: "NONE",
            discrepancy_codes: [],
            affected_row_numbers: [],
            investigation_steps: [],
            automatic_retry_allowed: false,
        };
    }

    const missingMetadata = reconciliation.status === "METADATA_MISSING";
    const affectedRows = reconciliation.differences
        .map((difference) => difference.match(/^ROW_(\d+)_/))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => Number(match[1]))
        .filter((rowNumber) => Number.isSafeInteger(rowNumber) && rowNumber > 0);
    const steps = missingMetadata
        ? [
            "Locate the original execution summary and its file SHA-256 evidence.",
            "Check whether batch metadata persistence failed after row handlers committed.",
            "Compare source-system records with the execution summary before any corrective action.",
            "Escalate unresolved evidence gaps to the authorised Finance/DET owner.",
        ]
        : [
            "Preserve the execution summary and persisted batch snapshot as investigation evidence.",
            "Compare the listed counters and row-level outcomes against the authoritative source records.",
            "Determine whether the difference is a metadata defect or a source-record discrepancy.",
            "Obtain the required Finance/DET decision before any correction or re-import.",
        ];

    return {
        status: "REQUIRES_REVIEW",
        batch_id: reconciliation.batch_id,
        case_type: missingMetadata ? "MISSING_METADATA" : "METADATA_MISMATCH",
        discrepancy_codes: [...reconciliation.differences],
        affected_row_numbers: [...new Set(affectedRows)].sort((a, b) => a - b),
        investigation_steps: steps,
        automatic_retry_allowed: false,
    };
}
