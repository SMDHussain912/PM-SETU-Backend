import * as repository from "./finance.read.repository";
import type { FinanceLedgerPage, FinanceLedgerQuery } from "./finance.query.types";
import { validateFinanceLedgerQuery } from "./finance.query.validation";


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
    validateFinanceLedgerQuery(query);
    const result = await repository.listOutlays(query);
    return toPage(result.items, result.total, query);
}

export async function listFundReleases(query: FinanceLedgerQuery) {
    validateFinanceLedgerQuery(query);
    const result = await repository.listReleases(query);
    return toPage(result.items, result.total, query);
}

export async function listExpenditureRecords(query: FinanceLedgerQuery) {
    validateFinanceLedgerQuery(query);
    const result = await repository.listExpenditures(query);
    return toPage(result.items, result.total, query);
}
