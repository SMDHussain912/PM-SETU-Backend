export type FinanceReconciliationSeverity = "WARNING";

export interface FinanceReconciliationFinding {
    code:
        | "RELEASE_FINANCIAL_YEAR_MISMATCH"
        | "RELEASE_BEFORE_SANCTION"
        | "EXPENDITURE_FINANCIAL_YEAR_MISMATCH"
        | "EXPENDITURE_BEFORE_SANCTION"
        | "EXPENDITURE_BEFORE_RELEASE"
        | "OUTLAY_ITI_CLUSTER_MISMATCH";
    severity: FinanceReconciliationSeverity;
    record_type: "OUTLAY" | "RELEASE" | "EXPENDITURE";
    record_id: number;
    related_record_id?: number;
    message: string;
}

export interface ReconciliationOutlay {
    id: number;
    financialYear: string;
    sanctionDate: Date;
    clusterId: number | null;
    iti?: { id: number; clusterId: number | null } | null;
}

export interface ReconciliationRelease {
    id: number;
    financialYear: string;
    releaseDate: Date;
    outlay: Pick<ReconciliationOutlay, "id" | "financialYear" | "sanctionDate">;
}

export interface ReconciliationExpenditure {
    id: number;
    financialYear: string;
    transactionDate: Date;
    outlay: Pick<ReconciliationOutlay, "id" | "financialYear" | "sanctionDate">;
    release?: { id: number; financialYear: string; releaseDate: Date } | null;
}

/**
 * Produces review flags only. It intentionally does not calculate financial
 * totals, decide expenditure recognition, or enforce unapproved policy.
 */
export function evaluateFinanceReconciliation(input: {
    outlays: ReconciliationOutlay[];
    releases: ReconciliationRelease[];
    expenditures: ReconciliationExpenditure[];
}): FinanceReconciliationFinding[] {
    const findings: FinanceReconciliationFinding[] = [];

    for (const outlay of input.outlays) {
        if (
            outlay.iti?.clusterId != null &&
            outlay.clusterId != null &&
            outlay.iti.clusterId !== outlay.clusterId
        ) {
            findings.push({
                code: "OUTLAY_ITI_CLUSTER_MISMATCH",
                severity: "WARNING",
                record_type: "OUTLAY",
                record_id: outlay.id,
                message: "The ITI is currently assigned to a different cluster than the approved outlay.",
            });
        }
    }

    for (const release of input.releases) {
        if (release.financialYear !== release.outlay.financialYear) {
            findings.push({
                code: "RELEASE_FINANCIAL_YEAR_MISMATCH",
                severity: "WARNING",
                record_type: "RELEASE",
                record_id: release.id,
                related_record_id: release.outlay.id,
                message: "The release financial year differs from its linked approved outlay.",
            });
        }
        if (release.releaseDate < release.outlay.sanctionDate) {
            findings.push({
                code: "RELEASE_BEFORE_SANCTION",
                severity: "WARNING",
                record_type: "RELEASE",
                record_id: release.id,
                related_record_id: release.outlay.id,
                message: "The release date is earlier than the linked sanction date.",
            });
        }
    }

    for (const expenditure of input.expenditures) {
        if (expenditure.financialYear !== expenditure.outlay.financialYear) {
            findings.push({
                code: "EXPENDITURE_FINANCIAL_YEAR_MISMATCH",
                severity: "WARNING",
                record_type: "EXPENDITURE",
                record_id: expenditure.id,
                related_record_id: expenditure.outlay.id,
                message: "The expenditure financial year differs from its linked approved outlay.",
            });
        }
        if (expenditure.transactionDate < expenditure.outlay.sanctionDate) {
            findings.push({
                code: "EXPENDITURE_BEFORE_SANCTION",
                severity: "WARNING",
                record_type: "EXPENDITURE",
                record_id: expenditure.id,
                related_record_id: expenditure.outlay.id,
                message: "The expenditure date is earlier than the linked sanction date.",
            });
        }
        if (expenditure.release) {
            if (expenditure.financialYear !== expenditure.release.financialYear) {
                findings.push({
                    code: "EXPENDITURE_FINANCIAL_YEAR_MISMATCH",
                    severity: "WARNING",
                    record_type: "EXPENDITURE",
                    record_id: expenditure.id,
                    related_record_id: expenditure.release.id,
                    message: "The expenditure financial year differs from its linked fund release.",
                });
            }
            if (expenditure.transactionDate < expenditure.release.releaseDate) {
                findings.push({
                    code: "EXPENDITURE_BEFORE_RELEASE",
                    severity: "WARNING",
                    record_type: "EXPENDITURE",
                    record_id: expenditure.id,
                    related_record_id: expenditure.release.id,
                    message: "The expenditure date is earlier than its linked fund release date.",
                });
            }
        }
    }

    return findings;
}
