import type { FinanceCsvPreview } from "./finance.csv.preview";
import type { FinanceCsvImportSummary } from "./finance.csv.execution";
import type { CreateFinanceImportBatchInput, FinanceImportBatchRowInput } from "./finance.import-batch.repository";

export interface FinanceImportBatchProjectionOptions {
    file_sha256: string;
    idempotency_key: string;
    created_by?: string;
    completed_at?: Date;
}

/**
 * Converts a non-persistent preview and optional execution result into the
 * technical batch metadata contract. This does not persist source payloads,
 * imply accounting approval, or decide whether a financial record is accepted.
 */
export function buildFinanceImportBatchInput(
    preview: FinanceCsvPreview,
    options: FinanceImportBatchProjectionOptions,
    execution?: FinanceCsvImportSummary,
): CreateFinanceImportBatchInput {
    if (!/^[a-f0-9]{64}$/i.test(options.file_sha256)) throw new Error("INVALID_FILE_SHA256");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.idempotency_key)) {
        throw new Error("INVALID_FINANCE_IMPORT_IDEMPOTENCY_KEY");
    }
    if (options.completed_at && Number.isNaN(options.completed_at.getTime())) {
        throw new Error("INVALID_BATCH_COMPLETED_AT");
    }

    const mapping = preview.mapping;
    if (preview.file_error || !mapping) {
        if (execution) throw new Error("EXECUTION_WITHOUT_VALID_PREVIEW");
        return {
            record_kind: preview.record_kind,
            file_sha256: options.file_sha256,
            idempotency_key: options.idempotency_key,
            lifecycle: "INVALID",
            total_rows: 0,
            valid_rows: 0,
            invalid_rows: 0,
            created_by: options.created_by,
            rows: [],
        };
    }

    const validRowNumbers = new Set(mapping.valid_rows.map((row) => row.row_number));
    const resultsByRow = new Map<number, FinanceCsvImportSummary["results"][number]>();
    if (execution) {
        if (execution.record_kind !== preview.record_kind || execution.total_rows !== preview.total_rows) {
            throw new Error("FINANCE_IMPORT_EXECUTION_PREVIEW_MISMATCH");
        }
        for (const result of execution.results) {
            if (!validRowNumbers.has(result.row_number) || resultsByRow.has(result.row_number)) {
                throw new Error("INVALID_FINANCE_IMPORT_EXECUTION_RESULTS");
            }
            resultsByRow.set(result.row_number, result);
        }
        if (execution.attempted_rows !== execution.results.length ||
            execution.created !== execution.results.filter((row) => row.outcome === "CREATED").length ||
            execution.duplicates !== execution.results.filter((row) => row.outcome === "DUPLICATE").length ||
            execution.rejected !== execution.results.filter((row) => row.outcome === "REJECTED").length ||
            execution.created + execution.duplicates + execution.rejected !== execution.attempted_rows) {
            throw new Error("FINANCE_IMPORT_EXECUTION_COUNTERS_INCONSISTENT");
        }
    }

    const invalidByRow = new Map<number, typeof mapping.errors>();
    for (const error of mapping.errors) {
        if (error.row_number <= 1) continue;
        const existing = invalidByRow.get(error.row_number) ?? [];
        existing.push(error);
        invalidByRow.set(error.row_number, existing);
    }

    const rows: FinanceImportBatchRowInput[] = [];
    for (const [rowNumber, errors] of invalidByRow) {
        rows.push({
            row_number: rowNumber,
            outcome: "INVALID",
            error_code: errors.map((error) => error.code).join(",").slice(0, 100),
            error_message: errors.map((error) => error.message).join("; ").slice(0, 500),
        });
    }
    for (const row of mapping.valid_rows) {
        const result = resultsByRow.get(row.row_number);
        rows.push(result ? {
            row_number: row.row_number,
            outcome: result.outcome,
            target_record_id: result.record_id,
            error_code: result.code,
            error_message: result.message,
        } : { row_number: row.row_number, outcome: "VALID" });
    }
    rows.sort((a, b) => a.row_number - b.row_number);

    const invalidRows = invalidByRow.size;
    const unattemptedValidRows = mapping.valid_rows.length - (execution?.attempted_rows ?? 0);
    if (unattemptedValidRows < 0) throw new Error("FINANCE_IMPORT_ATTEMPTED_ROWS_EXCEED_VALID_ROWS");
    const lifecycle = execution
        ? (unattemptedValidRows > 0
            ? (invalidRows > 0 || execution.rejected > 0 ? "PARTIALLY_EXECUTED_WITH_REJECTIONS" : "PARTIALLY_EXECUTED")
            : (invalidRows > 0 || execution.rejected > 0 ? "EXECUTED_WITH_REJECTIONS" : "EXECUTED"))
        : (preview.accepted_for_review ? "PREVIEWED" : "INVALID");

    return {
        record_kind: preview.record_kind,
        file_sha256: options.file_sha256,
        idempotency_key: options.idempotency_key,
        lifecycle,
        total_rows: preview.total_rows,
        valid_rows: mapping.valid_rows.length,
        invalid_rows: invalidRows,
        attempted_rows: execution?.attempted_rows ?? 0,
        created_rows: execution?.created ?? 0,
        duplicate_rows: execution?.duplicates ?? 0,
        rejected_rows: execution?.rejected ?? 0,
        created_by: options.created_by,
        completed_at: execution ? options.completed_at : undefined,
        rows,
    };
}
