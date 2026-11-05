import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import * as auditService from "../audit/audit.service";
import { ApiError } from "../../utils/response";
import type { AipListQuery, CreateAipBody, UpdateAipBody } from "./aip.schema";
import * as aipRepository from "./aip.repository";
import type { Aip } from "./aip.types";

/**
 * AIP module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface AipListResult {
    items: Aip[];
    meta: PaginationMeta;
}

export async function listAips(query: AipListQuery): Promise<AipListResult> {
    const filters = {
        sector: query.sector,
        cluster_id: query.cluster_id,
        status: query.status,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        aipRepository.listAips(filters),
        aipRepository.countAips(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getAipById(id: number): Promise<Aip> {
    const aip = await aipRepository.getAipById(id);
    if (!aip) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "AIP not found",
        });
    }
    return aip;
}


type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };

async function writeAipAudit(
    tx: Prisma.TransactionClient,
    userId: number,
    action: string,
    item: Aip,
    oldValue: unknown,
    newValue: unknown,
    context: AuditContext,
): Promise<void> {
    await auditService.recordAuditEntry({
        userId: String(userId),
        action,
        entity: "AIP",
        entityId: item.id,
        oldValue,
        newValue,
        approvalStatus: null,
        context: { userId: String(userId), ...context },
    }, tx);
}

function requireActor(userId: number): number {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return userId;
}

export async function createAip(
    body: CreateAipBody,
    actorId: number,
    context: AuditContext,
): Promise<Aip> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const item = await aipRepository.createAip(body, tx);
        await writeAipAudit(tx, userId, "CREATE", item, null, item, context);
        return item;
    });
}

export async function updateAip(
    id: number,
    body: UpdateAipBody,
    actorId: number,
    context: AuditContext,
): Promise<Aip> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const previous = await aipRepository.getAipByIdForTransaction(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "AIP not found" });
        }
        const updated = await aipRepository.updateAip(id, body, tx);
        if (!updated) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "AIP not found" });
        }
        await writeAipAudit(tx, userId, "UPDATE", updated, previous, updated, context);
        return updated;
    });
}

export async function deleteAip(
    id: number,
    actorId: number,
    context: AuditContext,
): Promise<void> {
    const userId = requireActor(actorId);
    await prisma.$transaction(async (tx) => {
        const previous = await aipRepository.getAipByIdForTransaction(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "AIP not found" });
        }
        const deleted = await aipRepository.deleteAipIfUnreferenced(id, tx);
        if (!deleted) {
            throw new ApiError({
                statusCode: 409,
                code: "AIP_IN_USE",
                message: "AIP cannot be deleted while SPVs, SIPs, activities, submissions or user scope assignments reference it",
            });
        }
        await writeAipAudit(tx, userId, "DELETE", previous, previous, null, context);
    });
}
