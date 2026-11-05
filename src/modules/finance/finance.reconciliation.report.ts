import type { FinanceReconciliationFinding } from "./finance.reconciliation";

export interface FinanceReconciliationScanned {
    outlays: number;
    releases: number;
    expenditure_records: number;
}

export interface FinanceReconciliationReportFinding extends FinanceReconciliationFinding {
    finding_id: string;
}

export interface FinanceReconciliationReport {
    summary: {
        total_findings: number;
        by_code: Array<{ code: FinanceReconciliationFinding["code"]; severity: "WARNING"; count: number }>;
        by_record_type: Array<{ record_type: FinanceReconciliationFinding["record_type"]; count: number }>;
    };
    scanned: FinanceReconciliationScanned;
    page: {
        items: FinanceReconciliationReportFinding[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };
}

function findingId(finding: FinanceReconciliationFinding): string {
    return [
        finding.code,
        finding.record_type,
        finding.record_id,
        finding.related_record_id ?? "none",
    ].join(":");
}

/** Builds a deterministic, read-only report. Summary counts cover the full scoped scan. */
export function buildFinanceReconciliationReport(input: {
    findings: FinanceReconciliationFinding[];
    scanned: FinanceReconciliationScanned;
    page: number;
    page_size: number;
}): FinanceReconciliationReport {
    const codeCounts = new Map<FinanceReconciliationFinding["code"], number>();
    const recordCounts = new Map<FinanceReconciliationFinding["record_type"], number>();

    for (const finding of input.findings) {
        codeCounts.set(finding.code, (codeCounts.get(finding.code) ?? 0) + 1);
        recordCounts.set(finding.record_type, (recordCounts.get(finding.record_type) ?? 0) + 1);
    }

    const total = input.findings.length;
    const totalPages = Math.ceil(total / input.page_size);
    const start = (input.page - 1) * input.page_size;

    return {
        summary: {
            total_findings: total,
            by_code: [...codeCounts.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([code, count]) => ({ code, severity: "WARNING", count })),
            by_record_type: [...recordCounts.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([record_type, count]) => ({ record_type, count })),
        },
        scanned: input.scanned,
        page: {
            items: input.findings.slice(start, start + input.page_size).map((finding) => ({
                ...finding,
                finding_id: findingId(finding),
            })),
            total,
            page: input.page,
            page_size: input.page_size,
            total_pages: totalPages,
        },
    };
}

function csvCell(value: string | number | undefined): string {
    let text = value === undefined ? "" : String(value);
    // Prevent spreadsheet applications from evaluating untrusted text as a formula.
    if (/^[\u0000-\u0020]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

/** Exports warning metadata only; monetary/source payloads are deliberately excluded. */
export function serializeFinanceReconciliationCsv(findings: FinanceReconciliationReportFinding[]): string {
    const headers = ["finding_id", "severity", "code", "record_type", "record_id", "related_record_id", "message"];
    const rows = findings.map((finding) => [
        finding.finding_id,
        finding.severity,
        finding.code,
        finding.record_type,
        finding.record_id,
        finding.related_record_id,
        finding.message,
    ]);
    return [headers, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n");
}
