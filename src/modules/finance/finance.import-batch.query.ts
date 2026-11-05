import { ApiError } from "../../utils/response";
import { prisma } from "../../config/database";

export interface FinanceImportBatchQuery {
    page: number;
    page_size: number;
    record_kind?: "OUTLAY" | "RELEASE" | "EXPENDITURE";
    lifecycle?: string;
    created_from?: Date;
    created_to?: Date;
}

export function validateFinanceImportBatchQuery(query: FinanceImportBatchQuery): void {
    if (!Number.isSafeInteger(query.page) || query.page < 1) {
        throw new ApiError({ statusCode: 422, code: "INVALID_PAGE", message: "page must be a positive integer" });
    }
    if (!Number.isSafeInteger(query.page_size) || query.page_size < 1 || query.page_size > 100) {
        throw new ApiError({ statusCode: 422, code: "INVALID_PAGE_SIZE", message: "page_size must be between 1 and 100" });
    }
    if (query.record_kind !== undefined && !["OUTLAY", "RELEASE", "EXPENDITURE"].includes(query.record_kind)) {
        throw new ApiError({ statusCode: 422, code: "INVALID_RECORD_KIND", message: "record_kind is invalid" });
    }
    if (query.lifecycle !== undefined && ![
        "PREVIEWED", "INVALID", "EXECUTED", "EXECUTED_WITH_REJECTIONS", "EXECUTION_BLOCKED",
    ].includes(query.lifecycle)) {
        throw new ApiError({ statusCode: 422, code: "INVALID_BATCH_LIFECYCLE", message: "lifecycle is invalid" });
    }
    for (const [field, value] of [["created_from", query.created_from], ["created_to", query.created_to]] as const) {
        if (value !== undefined && (!(value instanceof Date) || Number.isNaN(value.getTime()))) {
            throw new ApiError({ statusCode: 422, code: "INVALID_BATCH_DATE", message: `${field} must be a valid date` });
        }
    }
    if (query.created_from && query.created_to && query.created_from > query.created_to) {
        throw new ApiError({ statusCode: 422, code: "INVALID_BATCH_DATE_RANGE", message: "created_from must not be after created_to" });
    }
}

export async function listFinanceImportBatches(query: FinanceImportBatchQuery) {
    validateFinanceImportBatchQuery(query);
    const where = {
        ...(query.record_kind ? { recordKind: query.record_kind } : {}),
        ...(query.lifecycle ? { lifecycle: query.lifecycle } : {}),
        ...(query.created_from || query.created_to ? {
            createdAt: {
                ...(query.created_from ? { gte: query.created_from } : {}),
                ...(query.created_to ? { lte: query.created_to } : {}),
            },
        } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.financeImportBatch.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.page_size,
            take: query.page_size,
        }),
        prisma.financeImportBatch.count({ where }),
    ]);
    return { items, total, page: query.page, page_size: query.page_size, total_pages: Math.ceil(total / query.page_size) };
}

export async function getFinanceImportBatch(batchId: number) {
    if (!Number.isSafeInteger(batchId) || batchId < 1) {
        throw new ApiError({ statusCode: 422, code: "INVALID_BATCH_ID", message: "batch_id must be a positive integer" });
    }
    const batch = await prisma.financeImportBatch.findUnique({
        where: { id: batchId },
        include: { rows: { orderBy: { rowNumber: "asc" } } },
    });
    if (!batch) throw new ApiError({ statusCode: 404, code: "FINANCE_IMPORT_BATCH_NOT_FOUND", message: "Finance import batch not found" });
    return batch;
}


export interface FinanceImportBatchRowsQuery {
    batch_id: number;
    page: number;
    page_size: number;
}

/** Validates bounded pagination for row-level batch diagnostics. */
export function validateFinanceImportBatchRowsQuery(query: FinanceImportBatchRowsQuery): void {
    if (!Number.isSafeInteger(query.batch_id) || query.batch_id < 1) {
        throw new ApiError({ statusCode: 422, code: "INVALID_BATCH_ID", message: "batch_id must be a positive integer" });
    }
    if (!Number.isSafeInteger(query.page) || query.page < 1) {
        throw new ApiError({ statusCode: 422, code: "INVALID_PAGE", message: "page must be a positive integer" });
    }
    if (!Number.isSafeInteger(query.page_size) || query.page_size < 1 || query.page_size > 100) {
        throw new ApiError({ statusCode: 422, code: "INVALID_PAGE_SIZE", message: "page_size must be between 1 and 100" });
    }
}

/**
 * Returns row diagnostics in bounded pages so large imports do not require
 * loading every row outcome into memory for a single detail request.
 */
export async function listFinanceImportBatchRows(query: FinanceImportBatchRowsQuery) {
    validateFinanceImportBatchRowsQuery(query);
    const batch = await prisma.financeImportBatch.findUnique({
        where: { id: query.batch_id },
        select: { id: true },
    });
    if (!batch) {
        throw new ApiError({ statusCode: 404, code: "FINANCE_IMPORT_BATCH_NOT_FOUND", message: "Finance import batch not found" });
    }

    const where = { batchId: query.batch_id };
    const [items, total] = await Promise.all([
        prisma.financeImportBatchRow.findMany({
            where,
            orderBy: [{ rowNumber: "asc" }, { id: "asc" }],
            skip: (query.page - 1) * query.page_size,
            take: query.page_size,
        }),
        prisma.financeImportBatchRow.count({ where }),
    ]);
    return {
        items,
        total,
        page: query.page,
        page_size: query.page_size,
        total_pages: Math.ceil(total / query.page_size),
    };
}
