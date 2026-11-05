import type { FinanceCsvPreview } from "./finance.csv.preview";

export interface PreviousFinanceImportRow {
    row_number: number;
    outcome: "VALID" | "INVALID" | "CREATED" | "DUPLICATE" | "REJECTED";
}

export interface FinanceCsvRetryPlan {
    retry_row_numbers: number[];
    skipped_row_numbers: number[];
    reason: "RETRY_REJECTED_ROWS" | "NO_REJECTED_ROWS";
}

/**
 * Plans a safe re-upload retry without persisting or reconstructing financial
 * payloads. Caller must hash the newly uploaded bytes and provide the exact
 * original batch hash. Only prior REJECTED rows are eligible; created,
 * duplicate, invalid and merely-previewed rows are never replayed.
 */
export function planFinanceCsvRetry(
    preview: FinanceCsvPreview,
    uploadedFileSha256: string,
    originalFileSha256: string,
    previousRows: PreviousFinanceImportRow[],
): FinanceCsvRetryPlan {
    if (!/^[a-f0-9]{64}$/i.test(uploadedFileSha256) ||
        !/^[a-f0-9]{64}$/i.test(originalFileSha256) ||
        uploadedFileSha256.toLowerCase() !== originalFileSha256.toLowerCase()) {
        throw new Error("FINANCE_REUPLOAD_FILE_MISMATCH");
    }
    if (preview.file_error || !preview.mapping) throw new Error("FINANCE_CSV_PREVIEW_REQUIRED");
    if (preview.mapping.errors.some((error) => error.row_number === 1)) {
        throw new Error("FINANCE_CSV_HEADERS_INVALID");
    }

    const validRowNumbers = new Set(preview.mapping.valid_rows.map((row) => row.row_number));
    const seen = new Set<number>();
    const retry: number[] = [];
    const skipped: number[] = [];

    for (const row of previousRows) {
        if (!Number.isSafeInteger(row.row_number) || row.row_number < 1 || seen.has(row.row_number)) {
            throw new Error("INVALID_PREVIOUS_BATCH_ROWS");
        }
        seen.add(row.row_number);
        if (row.outcome === "REJECTED" && validRowNumbers.has(row.row_number)) retry.push(row.row_number);
        else skipped.push(row.row_number);
    }

    return {
        retry_row_numbers: retry.sort((a, b) => a - b),
        skipped_row_numbers: skipped.sort((a, b) => a - b),
        reason: retry.length ? "RETRY_REJECTED_ROWS" : "NO_REJECTED_ROWS",
    };
}
