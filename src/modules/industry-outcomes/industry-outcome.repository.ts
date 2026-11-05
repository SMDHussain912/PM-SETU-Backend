import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateOutcomeBody, OutcomeListQuery, ReviewOutcomeBody } from "./industry-outcome.schema";

export async function listOutcomes(query: OutcomeListQuery, scopeWhere?: Prisma.IndustryOutcomeRecordWhereInput) {
    const where: Prisma.IndustryOutcomeRecordWhereInput = {
        ...(query.outcome_type ? { outcomeType: query.outcome_type } : {}),
        ...(query.review_status ? { reviewStatus: query.review_status } : {}),
        ...(query.cluster_id ? { clusterId: query.cluster_id } : {}),
        ...(query.iti_id ? { itiId: query.iti_id } : {}),
        ...(query.source_system ? { sourceSystem: query.source_system } : {}),
        ...(query.event_date_from || query.event_date_to ? {
            eventDate: {
                ...(query.event_date_from ? { gte: new Date(query.event_date_from + "T00:00:00.000Z") } : {}),
                ...(query.event_date_to ? { lt: new Date(new Date(query.event_date_to + "T00:00:00.000Z").getTime() + 86_400_000) } : {}),
            },
        } : {}),
    };
    const scopedWhere: Prisma.IndustryOutcomeRecordWhereInput = scopeWhere ? { AND: [where, scopeWhere] } : where;
    const [items, total] = await Promise.all([
        prisma.industryOutcomeRecord.findMany({
            where: scopedWhere,
            orderBy: [{ eventDate: "desc" }, { id: "desc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
        }),
        prisma.industryOutcomeRecord.count({ where: scopedWhere }),
    ]);
    return { items, total };
}

export function getOutcomeById(id: number, scopeWhere?: Prisma.IndustryOutcomeRecordWhereInput) {
    return prisma.industryOutcomeRecord.findFirst({ where: { AND: [{ id }, ...(scopeWhere ? [scopeWhere] : [])] } });
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

export async function reviewOutcome(id: number, input: ReviewOutcomeBody, reviewedBy: number, tx: Prisma.TransactionClient) {
    const changed = await tx.industryOutcomeRecord.updateMany({
        where: { id, reviewStatus: "PENDING" },
        data: {
            reviewStatus: input.review_status,
            reviewNote: input.review_note ?? null,
            reviewedBy,
            reviewedAt: new Date(),
        },
    });
    if (changed.count === 0) return null;
    return tx.industryOutcomeRecord.findUnique({ where: { id } });
}

export async function getOutcomeSummary(scopeWhere?: Prisma.IndustryOutcomeRecordWhereInput) {
    const [byTypeAndStatus, total] = await Promise.all([
        prisma.industryOutcomeRecord.groupBy({
            by: ["outcomeType", "reviewStatus"],
            where: scopeWhere,
            _count: { _all: true },
            orderBy: [{ outcomeType: "asc" }, { reviewStatus: "asc" }],
        }),
        prisma.industryOutcomeRecord.count({ where: scopeWhere }),
    ]);
    const summary = {
        total,
        pending: 0,
        verified: 0,
        rejected: 0,
        by_type: [] as Array<{ outcome_type: string; pending: number; verified: number; rejected: number; total: number }>,
    };
    const grouped = new Map<string, { pending: number; verified: number; rejected: number; total: number }>();
    for (const row of byTypeAndStatus) {
        const key = row.outcomeType;
        const current = grouped.get(key) ?? { pending: 0, verified: 0, rejected: 0, total: 0 };
        const count = row._count._all;
        current.total += count;
        if (row.reviewStatus === "PENDING") { current.pending += count; summary.pending += count; }
        if (row.reviewStatus === "VERIFIED") { current.verified += count; summary.verified += count; }
        if (row.reviewStatus === "REJECTED") { current.rejected += count; summary.rejected += count; }
        grouped.set(key, current);
    }
    summary.by_type = [...grouped.entries()].map(([outcome_type, counts]) => ({ outcome_type, ...counts }));
    return summary;
}
