import type { FinanceImportRecoveryReport } from "./finance.import-batch.recovery-report";
import { serializeFinanceImportRecoveryReport } from "./finance.import-batch.recovery-export";

export interface FinanceImportRecoveryDownload {
    file_name: string;
    content_type: "application/json; charset=utf-8";
    content_disposition: string;
    body: string;
    cache_control: "no-store";
}

/**
 * Builds a download response descriptor for an already-authorised internal
 * caller. This helper does not authenticate users or expose an HTTP route.
 */
export function buildFinanceImportRecoveryDownload(
    report: FinanceImportRecoveryReport,
): FinanceImportRecoveryDownload {
    const identity = report.batch_id === null ? "metadata-missing" : `batch-${report.batch_id}`;
    const fileName = `finance-import-recovery-${identity}.json`;
    return {
        file_name: fileName,
        content_type: "application/json; charset=utf-8",
        content_disposition: `attachment; filename="${fileName}"`,
        body: serializeFinanceImportRecoveryReport(report),
        cache_control: "no-store",
    };
}
