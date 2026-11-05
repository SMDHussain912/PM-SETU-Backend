import { ApiError } from "../../utils/response";
import * as repository from "./finance.read.repository";
import type { FinanceLedgerPage, FinanceLedgerQuery } from "./finance.query.types";

function validateQuery(query: FinanceLedgerQuery): void {
    if (typeof query.financial_year !== "string" || !query.financial_year.trim()) {
        throw new ApiError({
            statusCode: 422,
            code: "FINANCIAL_YEAR_REQUIRED",
            message: "financial_year is required",
        });
    }

    if (!Number.isSafeInteger(query.page) || query.page < 1) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_PAGE",
            message: "page must be a positive integer",
        });
    }

    if (!Number.isSafeInteger(query.page_size) || query.page_size < 1 || query.page_size > 100) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_PAGE_SIZE",
            message: "page_size must be an integer between 1 and 100",
        });
    }

    for (const [field, value] of [
        ["cluster_id", query.cluster_id],
        ["iti_id", query.iti_id],
    ] as const) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
            throw new ApiError({
                statusCode: 422,
                code: "INVALID_FINANCE_SCOPE",
                message: `${field} must be a positive integer`,
            });
        }
    }

    if (query.project_reference !== undefined && !query.project_reference.trim()) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_PROJECT_REFERENCE",
            message: "project_reference cannot be empty",
        });
    }

    if (
        query.as_of_date !== undefined &&
        (!(query.as_of_date instanceof Date) || Number.isNaN(query.as_of_date.getTime()))
    ) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_AS_OF_DATE",
            message: "as_of_date must be a valid date",
        });
    }
}

function toPage<T>(
    items: T[],
    total: number,
    query: FinanceLedgerQuery,
): FinanceLedgerPage<T> {
    return {
        items,
        total,
        page: query.page,
        page_size: query.page_size,
        total_pages: Math.ceil(total / query.page_size),
    };
}

/**
 * Read-only internal finance ledger queries.
 *
 * These functions return source records and pagination metadata only. They do
 * not calculate official financial KPIs, classify expenditure as accepted,
 * or derive utilisation/balance values. Those rules require Finance approval.
 */
export async function listApprovedOutlays(query: FinanceLedgerQuery) {
    validateQuery(query);
    const result = await repository.listOutlays(query);
    return toPage(result.items, result.total, query);
}

export async function listFundReleases(query: FinanceLedgerQuery) {
    validateQuery(query);
    const result = await repository.listReleases(query);
    return toPage(result.items, result.total, query);
}

export async function listExpenditureRecords(query: FinanceLedgerQuery) {
    validateQuery(query);
    const result = await repository.listExpenditures(query);
    return toPage(result.items, result.total, query);
}
