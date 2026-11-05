import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import type { AcademicListQuery, AcademicRecordInput } from "./academic.schema";

export async function create(input: AcademicRecordInput, actor: number) {
    const cluster = input.cluster_id ? await prisma.cluster.findUnique({ where: { id: input.cluster_id }, select: { id: true } }) : null;
    if (input.cluster_id && !cluster) return { missing: "CLUSTER" as const };
    if (input.iti_id) {
        const iti = await prisma.iti.findUnique({ where: { id: input.iti_id }, select: { id: true, clusterId: true } });
        if (!iti) return { missing: "ITI" as const };
        if (iti.clusterId !== input.cluster_id) return { mismatch: true as const };
    }
    const item = await prisma.academicSourceRecord.create({ data: {
        kpiCode: input.kpi_code, sourceSystem: input.source_system, sourceRecordId: input.source_record_id,
        sourceVersion: input.source_version ?? null, clusterId: input.cluster_id ?? null, itiId: input.iti_id ?? null,
        eventDate: input.event_date ? new Date(input.event_date + "T00:00:00.000Z") : null,
        subjectToken: input.subject_token ?? null, payload: input.payload as Prisma.InputJsonValue, createdBy: actor,
    }});
    return { item };
}

export async function list(query: AcademicListQuery, scope?: Prisma.AcademicSourceRecordWhereInput) {
    const filters: Prisma.AcademicSourceRecordWhereInput = {
        ...(query.kpi_code ? { kpiCode: query.kpi_code } : {}),
        ...(query.review_status ? { reviewStatus: query.review_status } : {}),
        ...(query.cluster_id ? { clusterId: query.cluster_id } : {}),
        ...(query.iti_id ? { itiId: query.iti_id } : {}),
        ...(query.source_system ? { sourceSystem: query.source_system } : {}),
    };
    const where = scope ? { AND: [filters, scope] } : filters;
    const [items, total] = await Promise.all([
        prisma.academicSourceRecord.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        prisma.academicSourceRecord.count({ where }),
    ]);
    return { items, total };
}
export function get(id: number, scope?: Prisma.AcademicSourceRecordWhereInput) {
    return prisma.academicSourceRecord.findFirst({ where: { AND: [{ id }, ...(scope ? [scope] : [])] } });
}
export async function summary(scope?: Prisma.AcademicSourceRecordWhereInput) {
    const grouped = await prisma.academicSourceRecord.groupBy({ by: ["kpiCode", "reviewStatus"], where: scope, _count: { _all: true } });
    const result = Object.fromEntries(["ACD-01","ACD-02","ACD-03","ACD-04","ACD-05"].map((code) => [code, { pending: 0, accepted_source_records: 0, rejected: 0, total: 0 }]));
    for (const row of grouped) {
        const item = result[row.kpiCode] as { pending: number; accepted_source_records: number; rejected: number; total: number };
        const count = row._count._all; item.total += count;
        if (row.reviewStatus === "PENDING") item.pending += count;
        if (row.reviewStatus === "ACCEPTED") item.accepted_source_records += count;
        if (row.reviewStatus === "REJECTED") item.rejected += count;
    }
    return { record_counts_only: true, note: "These are intake workflow counts, not official academic KPI totals.", by_kpi: result };
}
export async function review(id: number, status: "ACCEPTED" | "REJECTED", note: string | null, actor: number, scope?: Prisma.AcademicSourceRecordWhereInput) {
    const where = { AND: [{ id, reviewStatus: "PENDING" }, ...(scope ? [scope] : [])] };
    const changed = await prisma.academicSourceRecord.updateMany({ where, data: { reviewStatus: status, reviewNote: note, reviewedBy: actor, reviewedAt: new Date() } });
    if (!changed.count) return null;
    return get(id, scope);
}
