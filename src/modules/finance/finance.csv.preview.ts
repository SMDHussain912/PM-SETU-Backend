import { parseFinanceCsv, type FinanceCsvParseOptions } from "./finance.csv";
import { mapFinanceCsvRows, type FinanceCsvRecordKind, type FinanceCsvMappingResult } from "./finance.csv.mapping";

export interface FinanceCsvPreview {
    accepted_for_review: boolean;
    record_kind: FinanceCsvRecordKind;
    total_rows: number;
    valid_row_count: number;
    invalid_row_count: number;
    mapping: FinanceCsvMappingResult | null;
    file_error: { code: string; message: string } | null;
}

/**
 * Produces a non-persistent preview. "Valid" means structurally mapped only;
 * it does not mean the row is authorized, authoritative, or safe to post.
 */
export function previewFinanceCsv(
    content: string,
    kind: FinanceCsvRecordKind,
    limits: Pick<FinanceCsvParseOptions, "maxBytes" | "maxRows"> = {},
): FinanceCsvPreview {
    try {
        const parsed = parseFinanceCsv(content, { requiredHeaders: [], ...limits });
        const mapping = mapFinanceCsvRows(parsed, kind);
        const invalid = mapping.errors.filter((error) => error.row_number > 1);
        return {
            accepted_for_review: mapping.errors.length === 0,
            record_kind: kind,
            total_rows: parsed.rows.length,
            valid_row_count: mapping.valid_rows.length,
            invalid_row_count: new Set(invalid.map((error) => error.row_number)).size,
            mapping,
            file_error: null,
        };
    } catch (error) {
        const code = error instanceof Error ? error.message : "FINANCE_CSV_PARSE_FAILED";
        return {
            accepted_for_review: false,
            record_kind: kind,
            total_rows: 0,
            valid_row_count: 0,
            invalid_row_count: 0,
            mapping: null,
            file_error: {
                code,
                message: "The CSV file could not be parsed. Correct the file and preview it again.",
            },
        };
    }
}
