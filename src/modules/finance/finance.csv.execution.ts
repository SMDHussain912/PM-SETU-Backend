import { Prisma } from "../../generated/prisma/client";
import type { ApprovedOutlayInput, ExpenditureInput, FundReleaseInput } from "./finance.types";
import type { FinanceCsvRecordKind } from "./finance.csv.mapping";
import type { FinanceCsvPreview } from "./finance.csv.preview";

export type FinanceCsvImportOutcome = "CREATED" | "DUPLICATE" | "REJECTED";

export interface FinanceCsvImportRowResult {
    row_number: number;
    outcome: FinanceCsvImportOutcome;
    record_id?: number;
    code?: string;
    message?: string;
}

export interface FinanceCsvImportSummary {
    record_kind: FinanceCsvRecordKind;
    total_rows: number;
    attempted_rows: number;
    created: number;
    duplicates: number;
    rejected: number;
    results: FinanceCsvImportRowResult[];
    partial_commit_possible: true;
}

export interface FinanceCsvImportHandlers {
    outlay(input: ApprovedOutlayInput): Promise<{ outcome: "CREATED" | "DUPLICATE"; item: { id: number } }>;
    release(input: FundReleaseInput): Promise<{ outcome: "CREATED" | "DUPLICATE"; item: { id: number } }>;
    expenditure(input: ExpenditureInput): Promise<{ outcome: "CREATED" | "DUPLICATE"; item: { id: number } }>;
}

function required(values: Record<string, string>, key: string): string {
    const value = values[key];
    if (!value) throw new Error(`MISSING_${key.toUpperCase()}`);
    return value;
}

function optional(values: Record<string, string>, key: string): string | null {
    return values[key] ? values[key] : null;
}

function date(values: Record<string, string>, key: string): Date {
    return new Date(`${required(values, key)}T00:00:00.000Z`);
}

function integer(values: Record<string, string>, key: string): number {
    return Number(required(values, key));
}

function nullableInteger(values: Record<string, string>, key: string): number | null {
    const value = optional(values, key);
    return value === null ? null : Number(value);
}

function decimal(values: Record<string, string>, key: string): Prisma.Decimal {
    return new Prisma.Decimal(required(values, key));
}

function toOutlay(values: Record<string, string>): ApprovedOutlayInput {
    return {
        source_system: required(values, "source_system"),
        source_record_id: required(values, "source_record_id"),
        sanction_reference: required(values, "sanction_reference"),
        sanction_date: date(values, "sanction_date"),
        financial_year: required(values, "financial_year"),
        approved_amount: decimal(values, "approved_amount"),
        scope_level: required(values, "scope_level"),
        cluster_id: nullableInteger(values, "cluster_id"),
        iti_id: nullableInteger(values, "iti_id"),
        project_reference: optional(values, "project_reference"),
        source_updated_at: optional(values, "source_updated_at") ? new Date(required(values, "source_updated_at")) : null,
    };
}

function toRelease(values: Record<string, string>): FundReleaseInput {
    return {
        source_system: required(values, "source_system"),
        source_record_id: required(values, "source_record_id"),
        outlay_id: integer(values, "outlay_id"),
        release_reference: required(values, "release_reference"),
        release_date: date(values, "release_date"),
        financial_year: required(values, "financial_year"),
        released_amount: decimal(values, "released_amount"),
        recipient_reference: required(values, "recipient_reference"),
        source_updated_at: optional(values, "source_updated_at") ? new Date(required(values, "source_updated_at")) : null,
    };
}

function toExpenditure(values: Record<string, string>): ExpenditureInput {
    return {
        source_system: required(values, "source_system"),
        source_record_id: required(values, "source_record_id"),
        outlay_id: integer(values, "outlay_id"),
        release_id: nullableInteger(values, "release_id"),
        transaction_reference: required(values, "transaction_reference"),
        transaction_date: date(values, "transaction_date"),
        financial_year: required(values, "financial_year"),
        amount: decimal(values, "amount"),
        payee_reference: optional(values, "payee_reference"),
        evidence_reference: optional(values, "evidence_reference"),
        recognition_basis: required(values, "recognition_basis"),
        source_updated_at: optional(values, "source_updated_at") ? new Date(required(values, "source_updated_at")) : null,
    };
}

/**
 * Internal execution coordinator. It requires an explicit handler dependency,
 * processes only structurally valid preview rows, and records row outcomes.
 * Each handler owns its transaction; earlier successful rows are not rolled back
 * if a later row fails. Do not expose this coordinator through HTTP until Finance
 * authorization and audit policies are approved.
 */
export async function executeFinanceCsvImport(
    preview: FinanceCsvPreview,
    handlers: FinanceCsvImportHandlers,
): Promise<FinanceCsvImportSummary> {
    if (preview.file_error || !preview.mapping) throw new Error("FINANCE_CSV_PREVIEW_REQUIRED");
    if (preview.mapping.errors.some((error) => error.row_number === 1)) {
        throw new Error("FINANCE_CSV_HEADERS_INVALID");
    }

    const results: FinanceCsvImportRowResult[] = [];
    let created = 0;
    let duplicates = 0;
    let rejected = 0;

    for (const row of preview.mapping.valid_rows) {
        try {
            const values = row.values;
            const result = preview.record_kind === "OUTLAY"
                ? await handlers.outlay(toOutlay(values))
                : preview.record_kind === "RELEASE"
                    ? await handlers.release(toRelease(values))
                    : await handlers.expenditure(toExpenditure(values));

            if (result.outcome === "CREATED") created += 1;
            else duplicates += 1;
            results.push({ row_number: row.row_number, outcome: result.outcome, record_id: result.item.id });
        } catch (error) {
            rejected += 1;
            const message = error instanceof Error ? error.message : "Finance row import failed";
            results.push({ row_number: row.row_number, outcome: "REJECTED", code: "ROW_IMPORT_FAILED", message });
        }
    }

    return {
        record_kind: preview.record_kind,
        total_rows: preview.total_rows,
        attempted_rows: results.length,
        created,
        duplicates,
        rejected,
        results,
        partial_commit_possible: true,
    };
}
