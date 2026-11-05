import type { FinanceCsvImportSummary } from "./finance.csv.execution";

export interface PersistedFinanceBatchSnapshot {
    id: number;
    recordKind: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
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
 * Persisted rows cover the entire preview, while execution.results contains
 * only rows attempted by this execution (notably for selective retries).
 * VALID and INVALID are therefore legitimate non-executed preview outcomes.
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
    if (!Number.isSafeInteger(persisted.id) || persisted.id < 1) differences.push("INVALID_BATCH_ID");
    if (persisted.recordKind !== execution.record_kind) differences.push("RECORD_KIND_MISMATCH");
    if (persisted.totalRows !== execution.total_rows) differences.push("TOTAL_ROWS_MISMATCH");

    const persistedCounters = [
        persisted.totalRows, persisted.validRows, persisted.invalidRows, persisted.attemptedRows,
        persisted.createdRows, persisted.duplicateRows, persisted.rejectedRows,
    ];
    if (persistedCounters.some((value) => !Number.isSafeInteger(value) || value < 0) ||
        persisted.validRows + persisted.invalidRows !== persisted.totalRows) {
        differences.push("PREVIEW_ROW_COUNTS_MISMATCH");
    }
    if (persisted.rows.length !== persisted.totalRows) differences.push("PERSISTED_ROW_COUNT_MISMATCH");

    const executionCounters = [
        execution.total_rows, execution.attempted_rows, execution.created,
        execution.duplicates, execution.rejected,
    ];
    const resultCounts = {
        created: execution.results.filter((row) => row.outcome === "CREATED").length,
        duplicates: execution.results.filter((row) => row.outcome === "DUPLICATE").length,
        rejected: execution.results.filter((row) => row.outcome === "REJECTED").length,
    };
    if (executionCounters.some((value) => !Number.isSafeInteger(value) || value < 0) ||
        execution.attempted_rows !== execution.results.length ||
        execution.created !== resultCounts.created ||
        execution.duplicates !== resultCounts.duplicates ||
        execution.rejected !== resultCounts.rejected ||
        execution.created + execution.duplicates + execution.rejected !== execution.attempted_rows) {
        differences.push("EXECUTION_SUMMARY_INCONSISTENT");
    }

    if (persisted.attemptedRows !== execution.attempted_rows) differences.push("ATTEMPTED_ROWS_MISMATCH");
    if (persisted.createdRows !== execution.created) differences.push("CREATED_ROWS_MISMATCH");
    if (persisted.duplicateRows !== execution.duplicates) differences.push("DUPLICATE_ROWS_MISMATCH");
    if (persisted.rejectedRows !== execution.rejected) differences.push("REJECTED_ROWS_MISMATCH");

    const expectedRows = new Map(execution.results.map((row) => [row.row_number, row]));
    const actualRows = new Map(persisted.rows.map((row) => [row.rowNumber, row]));
    if (expectedRows.size !== execution.results.length || actualRows.size !== persisted.rows.length) {
        differences.push("DUPLICATE_ROW_NUMBER");
    }
    const persistedRowNumbers = new Set<number>();
    for (const row of persisted.rows) {
        if (!Number.isSafeInteger(row.rowNumber) || row.rowNumber < 2) {
            differences.push("INVALID_PERSISTED_ROW_NUMBER");
            if (Number.isSafeInteger(row.rowNumber) && row.rowNumber > 0) {
                differences.push(`ROW_${row.rowNumber}_INVALID_POSITION`);
            }
        }
        if (persistedRowNumbers.has(row.rowNumber) && Number.isSafeInteger(row.rowNumber) && row.rowNumber > 0) {
            differences.push(`ROW_${row.rowNumber}_DUPLICATE`);
        }
        persistedRowNumbers.add(row.rowNumber);
    }
    const executionRowNumbers = new Set<number>();
    for (const row of execution.results) {
        if (!Number.isSafeInteger(row.row_number) || row.row_number < 2) {
            differences.push("INVALID_EXECUTION_ROW_NUMBER");
            if (Number.isSafeInteger(row.row_number) && row.row_number > 0) {
                differences.push(`ROW_${row.row_number}_INVALID_POSITION`);
            }
        }
        if (executionRowNumbers.has(row.row_number) && Number.isSafeInteger(row.row_number) && row.row_number > 0) {
            differences.push(`ROW_${row.row_number}_DUPLICATE`);
        }
        executionRowNumbers.add(row.row_number);
    }

    const persistedInvalidCount = persisted.rows.filter((row) => row.outcome === "INVALID").length;
    const persistedValidCount = persisted.rows.length - persistedInvalidCount;
    if (persistedInvalidCount !== persisted.invalidRows || persistedValidCount !== persisted.validRows) {
        differences.push("PERSISTED_OUTCOME_COUNTS_MISMATCH");
    }

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
    for (const [rowNumber, actual] of actualRows) {
        if (expectedRows.has(rowNumber)) continue;
        if (actual.outcome !== "VALID" && actual.outcome !== "INVALID") {
            differences.push(`ROW_${rowNumber}_UNEXPECTED`);
        }
        if (actual.targetRecordId !== null) {
            differences.push(`ROW_${rowNumber}_UNEXPECTED_TARGET_ID`);
        }
    }

    return differences.length === 0
        ? { status: "MATCHED", batch_id: persisted.id, differences: [], automatic_retry_allowed: false }
        : { status: "MISMATCHED", batch_id: persisted.id, differences, automatic_retry_allowed: false };
}
