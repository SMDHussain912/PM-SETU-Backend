import { validateFinanceLedgerQuery } from "./finance.query.validation";
import type { FinanceLedgerQuery } from "./finance.query.types";
import { loadReconciliationRecords } from "./finance.reconciliation.repository";
import { evaluateFinanceReconciliation } from "./finance.reconciliation";
import { buildFinanceReconciliationReport, serializeFinanceReconciliationCsv } from "./finance.reconciliation.report";

/**
 * Internal, read-only diagnostics for finance source records.
 * Findings are review warnings, not accounting decisions or write blockers.
 */
export async function reconcileFinanceRecords(query: FinanceLedgerQuery) {
    validateFinanceLedgerQuery(query);
    const records = await loadReconciliationRecords(query);
    const findings = evaluateFinanceReconciliation(records);
    const scanned = {
        outlays: records.outlays.length,
        releases: records.releases.length,
        expenditure_records: records.expenditures.length,
    };
    const report = buildFinanceReconciliationReport({
        findings,
        scanned,
        page: query.page,
        page_size: query.page_size,
    });

    return {
        financial_year: query.financial_year,
        as_of_date: query.as_of_date ?? null,
        scope: {
            cluster_id: query.cluster_id ?? null,
            iti_id: query.iti_id ?? null,
            project_reference: query.project_reference ?? null,
        },
        ...report,
        export_csv: serializeFinanceReconciliationCsv(report.page.items),
        limitations: [
            "Findings are non-blocking review warnings, not proof of accounting error.",
            "Current ITI-to-cluster assignment may differ from historical assignment at sanction time.",
            "Financial-year and date differences require source-owner review.",
            "No monetary totals, accepted-expenditure amounts, utilisation, or balance are calculated.",
            "Review acknowledgement and approval workflows are not enabled; no review permissions have been assumed.",
            "CSV contains warning metadata for the current page only and excludes financial amounts.",
        ],
    };
}
