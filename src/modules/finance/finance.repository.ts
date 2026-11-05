import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type {
    ApprovedOutlayInput,
    ExpenditureInput,
    FinanceIngestionResult,
    FinanceValidationFailure,
    FundReleaseInput,
} from "./finance.types";

type Db = Prisma.TransactionClient;

export async function ingestApprovedOutlay(
    input: ApprovedOutlayInput,
    tx: Db = prisma,
): Promise<FinanceIngestionResult<Prisma.FinanceApprovedOutlayGetPayload<{}>> | FinanceValidationFailure> {
    const existing = await tx.financeApprovedOutlay.findUnique({
        where: { sourceSystem_sourceRecordId: { sourceSystem: input.source_system, sourceRecordId: input.source_record_id } },
    });
    if (existing) return { outcome: "DUPLICATE", item: existing };

    if (input.cluster_id != null) {
        const cluster = await tx.cluster.findUnique({ where: { id: input.cluster_id }, select: { id: true } });
        if (!cluster) return { error: "CLUSTER_NOT_FOUND" };
    }
    if (input.iti_id != null) {
        const iti = await tx.iti.findUnique({ where: { id: input.iti_id }, select: { id: true, clusterId: true } });
        if (!iti) return { error: "ITI_NOT_FOUND" };
        if (input.cluster_id != null && iti.clusterId !== input.cluster_id) return { error: "ITI_CLUSTER_MISMATCH" };
    }

    const item = await tx.financeApprovedOutlay.create({
        data: {
            sanctionReference: input.sanction_reference,
            sanctionDate: input.sanction_date,
            financialYear: input.financial_year,
            approvedAmount: input.approved_amount,
            scopeLevel: input.scope_level,
            clusterId: input.cluster_id ?? null,
            itiId: input.iti_id ?? null,
            projectReference: input.project_reference ?? null,
            sourceSystem: input.source_system,
            sourceRecordId: input.source_record_id,
            sourceUpdatedAt: input.source_updated_at ?? null,
            createdBy: input.created_by ?? null,
        },
    });
    return { outcome: "CREATED", item };
}

export async function ingestFundRelease(
    input: FundReleaseInput,
    tx: Db = prisma,
): Promise<FinanceIngestionResult<Prisma.FinanceFundReleaseGetPayload<{}>> | FinanceValidationFailure> {
    const existing = await tx.financeFundRelease.findUnique({
        where: { sourceSystem_sourceRecordId: { sourceSystem: input.source_system, sourceRecordId: input.source_record_id } },
    });
    if (existing) return { outcome: "DUPLICATE", item: existing };

    const outlay = await tx.financeApprovedOutlay.findUnique({ where: { id: input.outlay_id }, select: { id: true } });
    if (!outlay) return { error: "OUTLAY_NOT_FOUND" };

    const item = await tx.financeFundRelease.create({
        data: {
            outlayId: input.outlay_id,
            releaseReference: input.release_reference,
            releaseDate: input.release_date,
            financialYear: input.financial_year,
            releasedAmount: input.released_amount,
            recipientReference: input.recipient_reference,
            sourceSystem: input.source_system,
            sourceRecordId: input.source_record_id,
            sourceUpdatedAt: input.source_updated_at ?? null,
            createdBy: input.created_by ?? null,
        },
    });
    return { outcome: "CREATED", item };
}

export async function ingestExpenditure(
    input: ExpenditureInput,
    tx: Db = prisma,
): Promise<FinanceIngestionResult<Prisma.FinanceExpenditureGetPayload<{}>> | FinanceValidationFailure> {
    const existing = await tx.financeExpenditure.findUnique({
        where: { sourceSystem_sourceRecordId: { sourceSystem: input.source_system, sourceRecordId: input.source_record_id } },
    });
    if (existing) return { outcome: "DUPLICATE", item: existing };

    const outlay = await tx.financeApprovedOutlay.findUnique({ where: { id: input.outlay_id }, select: { id: true } });
    if (!outlay) return { error: "OUTLAY_NOT_FOUND" };

    if (input.release_id != null) {
        const release = await tx.financeFundRelease.findUnique({
            where: { id: input.release_id },
            select: { id: true, outlayId: true },
        });
        if (!release) return { error: "RELEASE_NOT_FOUND" };
        if (release.outlayId !== input.outlay_id) return { error: "RELEASE_OUTLAY_MISMATCH" };
    }

    const item = await tx.financeExpenditure.create({
        data: {
            outlayId: input.outlay_id,
            releaseId: input.release_id ?? null,
            transactionReference: input.transaction_reference,
            transactionDate: input.transaction_date,
            financialYear: input.financial_year,
            amount: input.amount,
            payeeReference: input.payee_reference ?? null,
            evidenceReference: input.evidence_reference ?? null,
            recognitionBasis: input.recognition_basis,
            sourceSystem: input.source_system,
            sourceRecordId: input.source_record_id,
            sourceUpdatedAt: input.source_updated_at ?? null,
            createdBy: input.created_by ?? null,
        },
    });
    return { outcome: "CREATED", item };
}
