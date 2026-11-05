import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";

export type FinanceImportBatchLifecycle =
    | "PREVIEWED"
    | "INVALID"
    | "EXECUTED"
    | "EXECUTED_WITH_REJECTIONS"
    | "EXECUTION_BLOCKED";

export type FinanceImportBatchRowOutcome =
    | "VALID"
    | "INVALID"
    | "CREATED"
    | "DUPLICATE"
    | "REJECTED";

export interface FinanceImportBatchRowInput {
    row_number: number;
    outcome: FinanceImportBatchRowOutcome;
    target_record_id?: number;
    error_code?: string;
    error_message?: string;
}

export interface CreateFinanceImportBatchInput {
    record_kind: "OUTLAY" | "RELEASE" | "EXPENDITURE";
    file_sha256: string;
    lifecycle: FinanceImportBatchLifecycle;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    attempted_rows?: number;
    created_rows?: number;
    duplicate_rows?: number;
    rejected_rows?: number;
    created_by?: string;
    completed_at?: Date;
    rows: FinanceImportBatchRowInput[];
}

function assertNonNegativeInteger(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`INVALID_${field.toUpperCase()}`);
    }
}

/**
 * Persists technical import metadata and row outcomes atomically.
 * Financial CSV contents and normalized row payloads are never stored here.
 * This repository is internal-only; no HTTP permission or approval semantics
 * are implied by the lifecycle/outcome labels.
 */
export async function createFinanceImportBatch(input: CreateFinanceImportBatchInput) {
    if (!/^[a-f0-9]{64}$/i.test(input.file_sha256)) throw new Error("INVALID_FILE_SHA256");
    for (const [field, value] of Object.entries({
        total_rows: input.total_rows,
        valid_rows: input.valid_rows,
        invalid_rows: input.invalid_rows,
        attempted_rows: input.attempted_rows ?? 0,
        created_rows: input.created_rows ?? 0,
        duplicate_rows: input.duplicate_rows ?? 0,
        rejected_rows: input.rejected_rows ?? 0,
    })) assertNonNegativeInteger(value, field);

    if (input.valid_rows + input.invalid_rows > input.total_rows) {
        throw new Error("FINANCE_IMPORT_ROW_COUNTS_INCONSISTENT");
    }
    const seen = new Set<number>();
    for (const row of input.rows) {
        if (!Number.isSafeInteger(row.row_number) || row.row_number < 1) {
            throw new Error("INVALID_ROW_NUMBER");
        }
        if (seen.has(row.row_number)) throw new Error("DUPLICATE_BATCH_ROW_NUMBER");
        seen.add(row.row_number);
        if (row.target_record_id !== undefined &&
            (!Number.isSafeInteger(row.target_record_id) || row.target_record_id < 1)) {
            throw new Error("INVALID_TARGET_RECORD_ID");
        }
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const batch = await tx.financeImportBatch.create({
            data: {
                recordKind: input.record_kind,
                fileSha256: input.file_sha256.toLowerCase(),
                lifecycle: input.lifecycle,
                totalRows: input.total_rows,
                validRows: input.valid_rows,
                invalidRows: input.invalid_rows,
                attemptedRows: input.attempted_rows ?? 0,
                createdRows: input.created_rows ?? 0,
                duplicateRows: input.duplicate_rows ?? 0,
                rejectedRows: input.rejected_rows ?? 0,
                createdBy: input.created_by ?? null,
                completedAt: input.completed_at ?? null,
            },
        });

        if (input.rows.length > 0) {
            await tx.financeImportBatchRow.createMany({
                data: input.rows.map((row) => ({
                    batchId: batch.id,
                    rowNumber: row.row_number,
                    outcome: row.outcome,
                    targetRecordId: row.target_record_id ?? null,
                    errorCode: row.error_code?.slice(0, 100) ?? null,
                    errorMessage: row.error_message?.slice(0, 500) ?? null,
                })),
            });
        }

        return batch;
    });
}
