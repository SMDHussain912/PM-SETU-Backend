import type { FinanceCsvParseResult } from "./finance.csv";

export type FinanceCsvRecordKind = "OUTLAY" | "RELEASE" | "EXPENDITURE";

export interface FinanceCsvMappingResult {
    record_kind: FinanceCsvRecordKind;
    valid_rows: Array<{ row_number: number; values: Record<string, string> }>;
    errors: Array<{ row_number: number; field: string; code: string; message: string }>;
    duplicate_source_rows: Array<{ row_number: number; first_row_number: number; source_system: string; source_record_id: string }>;
}

const schemas: Record<FinanceCsvRecordKind, {
    required: string[];
    optional: string[];
    amount_field: string;
    date_field: string;
}> = {
    OUTLAY: {
        required: ["source_system", "source_record_id", "sanction_reference", "sanction_date", "financial_year", "approved_amount", "scope_level"],
        optional: ["cluster_id", "iti_id", "project_reference", "source_updated_at"],
        amount_field: "approved_amount",
        date_field: "sanction_date",
    },
    RELEASE: {
        required: ["source_system", "source_record_id", "outlay_id", "release_reference", "release_date", "financial_year", "released_amount", "recipient_reference"],
        optional: ["source_updated_at"],
        amount_field: "released_amount",
        date_field: "release_date",
    },
    EXPENDITURE: {
        required: ["source_system", "source_record_id", "outlay_id", "transaction_reference", "transaction_date", "financial_year", "amount", "recognition_basis"],
        optional: ["release_id", "payee_reference", "evidence_reference", "source_updated_at"],
        amount_field: "amount",
        date_field: "transaction_date",
    },
};

const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const positiveIntegerPattern = /^[1-9]\d*$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
    if (!isoDatePattern.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Maps parsed CSV rows to normalized, untrusted DTOs; persistence is deliberately separate. */
export function mapFinanceCsvRows(
    parsed: FinanceCsvParseResult,
    kind: FinanceCsvRecordKind,
): FinanceCsvMappingResult {
    const schema = schemas[kind];
    const errors: FinanceCsvMappingResult["errors"] = [];
    const validRows: FinanceCsvMappingResult["valid_rows"] = [];
    const duplicateSourceRows: FinanceCsvMappingResult["duplicate_source_rows"] = [];
    const seen = new Map<string, number>();

    for (const header of schema.required) {
        if (!parsed.headers.includes(header)) {
            errors.push({ row_number: 1, field: header, code: "REQUIRED_HEADER_MISSING", message: `Required column "${header}" is missing` });
        }
    }
    if (errors.length) return { record_kind: kind, valid_rows: [], errors, duplicate_source_rows: [] };

    for (const row of parsed.rows) {
        const rowErrors: FinanceCsvMappingResult["errors"] = [];
        const values = Object.fromEntries([...schema.required, ...schema.optional]
            .filter((field) => parsed.headers.includes(field))
            .map((field) => [field, row.values[field].trim()]));

        for (const field of schema.required) {
            if (!values[field]) rowErrors.push({ row_number: row.row_number, field, code: "REQUIRED_VALUE_MISSING", message: `${field} is required` });
        }

        const amount = values[schema.amount_field];
        if (amount && !decimalPattern.test(amount)) {
            rowErrors.push({ row_number: row.row_number, field: schema.amount_field, code: "INVALID_DECIMAL", message: "Amount must fit DECIMAL(18,2): at most 16 integer digits, two fractional digits, and no exponent notation" });
        }

        const date = values[schema.date_field];
        if (date && !isValidDate(date)) {
            rowErrors.push({ row_number: row.row_number, field: schema.date_field, code: "INVALID_DATE", message: "Date must be a real calendar date in YYYY-MM-DD format" });
        }

        const integerFields = kind === "OUTLAY" ? ["cluster_id", "iti_id"] : kind === "RELEASE" ? ["outlay_id"] : ["outlay_id", "release_id"];
        for (const field of integerFields) {
            if (values[field] && (!positiveIntegerPattern.test(values[field]) || !Number.isSafeInteger(Number(values[field])))) {
                rowErrors.push({ row_number: row.row_number, field, code: "INVALID_ID", message: `${field} must be a positive safe integer` });
            }
        }

        if (values.source_system && values.source_record_id) {
            const key = `${values.source_system}\u0000${values.source_record_id}`;
            const first = seen.get(key);
            if (first !== undefined) {
                duplicateSourceRows.push({
                    row_number: row.row_number,
                    first_row_number: first,
                    source_system: values.source_system,
                    source_record_id: values.source_record_id,
                });
                rowErrors.push({ row_number: row.row_number, field: "source_record_id", code: "DUPLICATE_SOURCE_IN_FILE", message: `Source identity already appears on row ${first}` });
            } else {
                seen.set(key, row.row_number);
            }
        }

        errors.push(...rowErrors);
        if (rowErrors.length === 0) validRows.push({ row_number: row.row_number, values });
    }

    return { record_kind: kind, valid_rows: validRows, errors, duplicate_source_rows: duplicateSourceRows };
}
