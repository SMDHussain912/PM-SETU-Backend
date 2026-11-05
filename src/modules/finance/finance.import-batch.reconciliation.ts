import type { FinanceCsvImportSummary } from "./finance.csv.execution";

export interface PersistedFinanceBatchSnapshot {
    id: number;
    recordKind: string;
    totalRows: number;
    attemptedRows: number;
    createdRows: number;
    duplicateRows: number;
    rejectedRows: number;
    rows: Array<{
        rowNumber: number;
        outcome: string;
        targetRecordId: number | null;
    }>;
}

export type FinanceImportReconciliation =
    | { status: "METADATA_MISSING"; batch_id: null; differences: string[]; automatic_retry_allowed: false }
    | { status: "MATCHED"; batch_id: number; differences: []; automatic_retry_allowed: false }
    | { status: "MISMATCHED"; batch_id: number; differences: string[]; automatic_retry_allowed: false };

/**
 * Compares an execution summary with persisted technical batch metadata.
 *
 * A missing/mismatched batch is surfaced for controlled investigation only.
 * This function never replays financial writes: row handlers may already have
 * committed independently, so automatic retry could duplicate external effects.
 */
export function reconcileFinanceImportBatch(
    execution: FinanceCsvImportSummary,
    persisted: PersistedFinanceBatchSnapshot | null,
): FinanceImportReconciliation {
    if (!persisted) {
        return {
            status: "METADATA_MISSING",
            batch_id: null,
            differences: ["EXECUTION_METADATA_NOT_PERSISTED"],
            automatic_retry_allowed: false,
        };
    }

    const differences: string[] = [];
    if (persisted.id < 1 || !Number.isSafeInteger(persisted.id)) differences.push("INVALID_BATCH_ID");
    if (persisted.recordKind !== execution.record_kind) differences.push("RECORD_KIND_MISMATCH");
    if (persisted.totalRows !== execution.total_rows) differences.push("TOTAL_ROWS_MISMATCH");
    if (persisted.attemptedRows !== execution.attempted_rows) differences.push("ATTEMPTED_ROWS_MISMATCH");
    if (persisted.createdRows !== execution.created) differences.push("CREATED_ROWS_MISMATCH");
    if (persisted.duplicateRows !== execution.duplicates) differences.push("DUPLICATE_ROWS_MISMATCH");
    if (persisted.rejectedRows !== execution.rejected) differences.push("REJECTED_ROWS_MISMATCH");

    const expectedRows = new Map(execution.results.map((row) => [row.row_number, row]));
    const actualRows = new Map(persisted.rows.map((row) => [row.rowNumber, row]));
    if (expectedRows.size !== execution.results.length || actualRows.size !== persisted.rows.length) {
        differences.push("DUPLICATE_ROW_NUMBER");
    }
    if (expectedRows.size !== actualRows.size) differences.push("ROW_RESULT_COUNT_MISMATCH");

    for (const [rowNumber, expected] of expectedRows) {
        const actual = actualRows.get(rowNumber);
        if (!actual) {
            differences.push(`ROW_${rowNumber}_MISSING`);
            continue;
        }
        if (actual.outcome !== expected.outcome) differences.push(`ROW_${rowNumber}_OUTCOME_MISMATCH`);
        if ((expected.record_id ?? null) !== actual.targetRecordId) {
            differences.push(`ROW_${rowNumber}_TARGET_ID_MISMATCH`);
        }
    }
    for (const rowNumber of actualRows.keys()) {
        if (!expectedRows.has(rowNumber)) differences.push(`ROW_${rowNumber}_UNEXPECTED`);
    }

    return differences.length === 0
        ? { status: "MATCHED", batch_id: persisted.id, differences: [], automatic_retry_allowed: false }
        : { status: "MISMATCHED", batch_id: persisted.id, differences, automatic_retry_allowed: false };
}
