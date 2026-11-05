import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateOutcomeBody, OutcomeListQuery, ReviewOutcomeBody } from "./industry-outcome.schema";

export async function listOutcomes(query: OutcomeListQuery) {
    const where: Prisma.IndustryOutcomeRecordWhereInput = {
        ...(query.outcome_type ? { outcomeType: query.outcome_type } : {}),
        ...(query.review_status ? { reviewStatus: query.review_status } : {}),
        ...(query.cluster_id ? { clusterId: query.cluster_id } : {}),
        ...(query.iti_id ? { itiId: query.iti_id } : {}),
        ...(query.source_system ? { sourceSystem: query.source_system } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.industryOutcomeRecord.findMany({
            where,
            orderBy: [{ eventDate: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
        prisma.industryOutcomeRecord.count({ where }),
    ]);
    return { items, total };
}

export function getOutcomeById(id: number) {
    return prisma.industryOutcomeRecord.findUnique({ where: { id } });
}

export async function createOutcome(input: CreateOutcomeBody, createdBy: number, tx: Prisma.TransactionClient) {
    if (input.cluster_id !== undefined && input.cluster_id !== null) {
        const cluster = await tx.cluster.findUnique({ where: { id: input.cluster_id }, select: { id: true } });
        if (!cluster) return { missing: "CLUSTER" as const };
    }
    if (input.iti_id !== undefined && input.iti_id !== null) {
        const iti = await tx.iti.findUnique({ where: { id: input.iti_id }, select: { id: true, clusterId: true } });
        if (!iti) return { missing: "ITI" as const };
        if (input.cluster_id !== undefined && input.cluster_id !== null && iti.clusterId !== input.cluster_id) {
            return { mismatch: true as const };
        }
    }
    const item = await tx.industryOutcomeRecord.create({
        data: {
            outcomeType: input.outcome_type,
            sourceSystem: input.source_system,
            sourceRecordId: input.source_record_id ?? null,
            clusterId: input.cluster_id ?? null,
            itiId: input.iti_id ?? null,
            employerName: input.employer_name ?? null,
            participantRef: input.participant_ref ?? null,
            eventDate: input.event_date ?? null,
            evidenceRef: input.evidence_ref ?? null,
            payload: (input.payload ?? {}) as Prisma.InputJsonValue,
            createdBy,
        },
    });
    return { item };
}

export function reviewOutcome(id: number, input: ReviewOutcomeBody, reviewedBy: number, tx: Prisma.TransactionClient) {
    return tx.industryOutcomeRecord.update({
        where: { id },
        data: {
            reviewStatus: input.review_status,
            reviewNote: input.review_note ?? null,
            reviewedBy,
            reviewedAt: new Date(),
        },
    });
}
