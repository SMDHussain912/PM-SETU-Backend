import type { Prisma } from "../../generated/prisma/client";

export interface FinanceSourceIdentity {
    source_system: string;
    source_record_id: string;
    source_updated_at?: Date | null;
    created_by?: string | null;
}

export interface ApprovedOutlayInput extends FinanceSourceIdentity {
    sanction_reference: string;
    sanction_date: Date;
    financial_year: string;
    approved_amount: Prisma.Decimal;
    scope_level: string;
    cluster_id?: number | null;
    iti_id?: number | null;
    project_reference?: string | null;
}

export interface FundReleaseInput extends FinanceSourceIdentity {
    outlay_id: number;
    release_reference: string;
    release_date: Date;
    financial_year: string;
    released_amount: Prisma.Decimal;
    recipient_reference: string;
}

export interface ExpenditureInput extends FinanceSourceIdentity {
    outlay_id: number;
    release_id?: number | null;
    transaction_reference: string;
    transaction_date: Date;
    financial_year: string;
    amount: Prisma.Decimal;
    payee_reference?: string | null;
    evidence_reference?: string | null;
    recognition_basis: string;
}

export type FinanceIngestionResult<T> =
    | { outcome: "CREATED"; item: T }
    | { outcome: "DUPLICATE"; item: T };

export type FinanceValidationFailure =
    | { error: "CLUSTER_NOT_FOUND" }
    | { error: "ITI_NOT_FOUND" }
    | { error: "ITI_CLUSTER_MISMATCH" }
    | { error: "OUTLAY_NOT_FOUND" }
    | { error: "RELEASE_NOT_FOUND" }
    | { error: "RELEASE_OUTLAY_MISMATCH" };
