import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import * as auditService from "../audit/audit.service";
import type { CreateClusterBody, ClusterListQuery, UpdateClusterBody } from "./cluster.schema";
import * as clusterRepository from "./cluster.repository";
import type { Cluster } from "./cluster.types";

export interface ClusterListResult {
    items: Cluster[];
    meta: PaginationMeta;
}

type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };

async function writeAudit(
    tx: Prisma.TransactionClient,
    userId: number,
    action: string,
    cluster: Cluster,
    oldValue: unknown,
    newValue: unknown,
    context: AuditContext,
): Promise<void> {
    await auditService.recordAuditEntry({
        userId: String(userId),
        action,
        entity: "CLUSTER",
        entityId: cluster.id,
        oldValue,
        newValue,
        approvalStatus: null,
        context: { userId: String(userId), ...context },
    }, tx);
}

function requireUserId(userId: number): number {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return userId;
}

export async function listClusters(query: ClusterListQuery): Promise<ClusterListResult> {
    const filters = {
        district: query.district,
        sector: query.sector,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };
    const [items, total] = await Promise.all([
        clusterRepository.listClusters(filters),
        clusterRepository.countClusters(filters),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getClusterById(id: number): Promise<Cluster> {
    const cluster = await clusterRepository.getClusterById(id);
    if (!cluster) {
        throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Cluster not found" });
    }
    return cluster;
}

export async function createCluster(
    body: CreateClusterBody,
    actorId: number,
    context: AuditContext,
): Promise<Cluster> {
    const userId = requireUserId(actorId);
    return prisma.$transaction(async (tx) => {
        const cluster = await clusterRepository.createCluster(body, tx);
        await writeAudit(tx, userId, "CREATE", cluster, null, cluster, context);
        return cluster;
    });
}

export async function updateCluster(
    id: number,
    body: UpdateClusterBody,
    actorId: number,
    context: AuditContext,
): Promise<Cluster> {
    const userId = requireUserId(actorId);
    return prisma.$transaction(async (tx) => {
        const previous = await clusterRepository.getClusterById(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Cluster not found" });
        }
        const updated = await clusterRepository.updateCluster(id, body, tx);
        if (!updated) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Cluster not found" });
        }
        await writeAudit(tx, userId, "UPDATE", updated, previous, updated, context);
        return updated;
    });
}

export async function deleteCluster(
    id: number,
    actorId: number,
    context: AuditContext,
): Promise<void> {
    const userId = requireUserId(actorId);
    await prisma.$transaction(async (tx) => {
        const previous = await clusterRepository.getClusterById(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Cluster not found" });
        }
        const deleted = await clusterRepository.deleteClusterIfUnreferenced(id, tx);
        if (!deleted) {
            throw new ApiError({
                statusCode: 409,
                code: "CLUSTER_IN_USE",
                message: "Cluster cannot be deleted while it is linked to ITIs, AIPs, SPVs, SIPs, documents, or news",
            });
        }
        await writeAudit(tx, userId, "DELETE", previous, previous, null, context);
    });
}
