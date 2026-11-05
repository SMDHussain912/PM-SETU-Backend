import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import * as auditService from "../audit/audit.service";
import type { SpvListQuery, CreateSpvBody, UpdateSpvBody } from "./spv.schema";
import * as spvRepository from "./spv.repository";
import type { Spv } from "./spv.types";

export interface SpvListResult { items: Spv[]; meta: PaginationMeta }
type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };

export async function listSpvs(query: SpvListQuery): Promise<SpvListResult> {
    const [items, total] = await Promise.all([
        spvRepository.listSpvs({ page: query.page, pageSize: query.pageSize }),
        spvRepository.countSpvs(),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}
export async function getSpvById(id: number): Promise<Spv> {
    const item = await spvRepository.getSpvById(id);
    if (!item) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SPV not found" });
    return item;
}
export async function listClusterSpvs(clusterId: number): Promise<Spv[]> {
    return spvRepository.listClusterSpvs(clusterId);
}
function requireActor(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    return id;
}
async function writeAudit(tx: Prisma.TransactionClient, userId: number, action: string, item: Spv, oldValue: unknown, newValue: unknown, context: AuditContext): Promise<void> {
    await auditService.recordAuditEntry({
        userId: String(userId), action, entity: "SPV", entityId: item.id,
        oldValue, newValue, approvalStatus: null,
        context: { userId: String(userId), ...context },
    }, tx);
}
export async function createSpv(body: CreateSpvBody, actorId: number, context: AuditContext): Promise<Spv> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async tx => {
        const item = await spvRepository.createSpv(body, tx);
        await writeAudit(tx, userId, "CREATE", item, null, item, context);
        return item;
    });
}
export async function updateSpv(id: number, body: UpdateSpvBody, actorId: number, context: AuditContext): Promise<Spv> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async tx => {
        const previous = await spvRepository.getSpvByIdForTransaction(id, tx);
        if (!previous) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SPV not found" });
        const updated = await spvRepository.updateSpv(id, body, tx);
        if (!updated) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SPV not found" });
        await writeAudit(tx, userId, "UPDATE", updated, previous, updated, context);
        return updated;
    });
}
export async function deleteSpv(id: number, actorId: number, context: AuditContext): Promise<void> {
    const userId = requireActor(actorId);
    await prisma.$transaction(async tx => {
        const previous = await spvRepository.getSpvByIdForTransaction(id, tx);
        if (!previous) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SPV not found" });
        const deleted = await spvRepository.deleteSpvIfUnreferenced(id, tx);
        if (!deleted) throw new ApiError({
            statusCode: 409, code: "SPV_IN_USE",
            message: "SPV cannot be deleted while activity records, submissions or user scope assignments reference it",
        });
        await writeAudit(tx, userId, "DELETE", previous, previous, null, context);
    });
}
