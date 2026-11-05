import type { CreateFinanceImportBatchInput } from "./finance.import-batch.repository";

/**
 * Validates that batch-level counters, row outcomes and lifecycle agree.
 * This is technical import metadata validation only; it does not confer
 * accounting acceptance or approval.
 */
export function validateFinanceImportBatchInput(input: CreateFinanceImportBatchInput): void {
    const attempted = input.attempted_rows ?? 0;
    const created = input.created_rows ?? 0;
    const duplicates = input.duplicate_rows ?? 0;
    const rejected = input.rejected_rows ?? 0;

    if (attempted !== created + duplicates + rejected) {
        throw new Error("FINANCE_IMPORT_ATTEMPT_COUNTERS_INCONSISTENT");
    }
    if (input.total_rows !== input.valid_rows + input.invalid_rows) {
        throw new Error("FINANCE_IMPORT_TOTAL_ROW_COUNTERS_INCONSISTENT");
    }
    if (input.rows.length !== input.valid_rows + input.invalid_rows) {
        throw new Error("FINANCE_IMPORT_ROW_OUTCOMES_INCOMPLETE");
    }

    const rowNumbers = new Set<number>();
    for (const row of input.rows) {
        if (!Number.isSafeInteger(row.row_number) || row.row_number < 2) {
            throw new Error("FINANCE_IMPORT_ROW_NUMBER_INVALID");
        }
        if (rowNumbers.has(row.row_number)) {
            throw new Error("FINANCE_IMPORT_ROW_NUMBER_DUPLICATE");
        }
        rowNumbers.add(row.row_number);
    }

    const counts = input.rows.reduce((result, row) => {
        result[row.outcome] += 1;
        return result;
    }, { VALID: 0, INVALID: 0, CREATED: 0, DUPLICATE: 0, REJECTED: 0 });

    if (counts.INVALID !== input.invalid_rows ||
        counts.VALID + counts.CREATED + counts.DUPLICATE + counts.REJECTED !== input.valid_rows) {
        throw new Error("FINANCE_IMPORT_ROW_COUNTS_INCONSISTENT");
    }
    if (counts.CREATED !== created || counts.DUPLICATE !== duplicates || counts.REJECTED !== rejected) {
        throw new Error("FINANCE_IMPORT_ROW_COUNTERS_INCONSISTENT");
    }

    if ((input.lifecycle === "PREVIEWED" || input.lifecycle === "INVALID" || input.lifecycle === "EXECUTION_BLOCKED") &&
        attempted !== 0) {
        throw new Error("FINANCE_IMPORT_LIFECYCLE_COUNTERS_INCONSISTENT");
    }
    const unattemptedValidRows = input.valid_rows - attempted;
    if (unattemptedValidRows < 0) throw new Error("FINANCE_IMPORT_ATTEMPTED_ROWS_EXCEED_VALID_ROWS");
    if ((input.lifecycle === "EXECUTED" || input.lifecycle === "EXECUTED_WITH_REJECTIONS") && unattemptedValidRows !== 0) {
        throw new Error("FINANCE_IMPORT_LIFECYCLE_COUNTERS_INCONSISTENT");
    }
    if ((input.lifecycle === "PARTIALLY_EXECUTED" || input.lifecycle === "PARTIALLY_EXECUTED_WITH_REJECTIONS") &&
        (attempted === 0 || unattemptedValidRows === 0)) {
        throw new Error("FINANCE_IMPORT_LIFECYCLE_COUNTERS_INCONSISTENT");
    }
    if (input.lifecycle === "EXECUTED" && (attempted === 0 || rejected > 0 || input.invalid_rows > 0)) {
        throw new Error("FINANCE_IMPORT_LIFECYCLE_COUNTERS_INCONSISTENT");
    }
    if ((input.lifecycle === "EXECUTED_WITH_REJECTIONS" || input.lifecycle === "PARTIALLY_EXECUTED_WITH_REJECTIONS") &&
        rejected === 0 && input.invalid_rows === 0) {
        throw new Error("FINANCE_IMPORT_LIFECYCLE_COUNTERS_INCONSISTENT");
    }
}
