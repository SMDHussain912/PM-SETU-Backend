import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import * as auditService from "../audit/audit.service";
import { ApiError } from "../../utils/response";
import type { CreateItiBody, ItiListQuery, UpdateItiBody } from "./iti.schema";
import * as itiRepository from "./iti.repository";
import type { Iti } from "./iti.types";

/**
 * ITI module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface ItiListResult {
    items: Iti[];
    meta: PaginationMeta;
}

export async function listItis(query: ItiListQuery): Promise<ItiListResult> {
    const filters = {
        district: query.district,
        type: query.type,
        cluster_id: query.cluster_id,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        itiRepository.listItis(filters),
        itiRepository.countItis(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getItiById(id: number): Promise<Iti> {
    const iti = await itiRepository.getItiById(id);
    if (!iti) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "ITI not found",
        });
    }
    return iti;
}

export async function listClusterItis(clusterId: number): Promise<Iti[]> {
    return itiRepository.listClusterItis(clusterId);
}


type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };

async function writeItiAudit(
    tx: Prisma.TransactionClient,
    userId: number,
    action: string,
    item: Iti,
    oldValue: unknown,
    newValue: unknown,
    context: AuditContext,
): Promise<void> {
    await auditService.recordAuditEntry({
        userId: String(userId),
        action,
        entity: "ITI",
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

export async function createIti(
    body: CreateItiBody,
    actorId: number,
    context: AuditContext,
): Promise<Iti> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const item = await itiRepository.createIti(body, tx);
        await writeItiAudit(tx, userId, "CREATE", item, null, item, context);
        return item;
    });
}

export async function updateIti(
    id: number,
    body: UpdateItiBody,
    actorId: number,
    context: AuditContext,
): Promise<Iti> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const previous = await itiRepository.getItiById(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "ITI not found" });
        }
        const updated = await itiRepository.updateIti(id, body, tx);
        if (!updated) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "ITI not found" });
        }
        await writeItiAudit(tx, userId, "UPDATE", updated, previous, updated, context);
        return updated;
    });
}

export async function deleteIti(
    id: number,
    actorId: number,
    context: AuditContext,
): Promise<void> {
    const userId = requireActor(actorId);
    await prisma.$transaction(async (tx) => {
        const previous = await itiRepository.getItiById(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "ITI not found" });
        }
        const deleted = await itiRepository.deleteItiIfUnreferenced(id, tx);
        if (!deleted) {
            throw new ApiError({
                statusCode: 409,
                code: "ITI_IN_USE",
                message: "ITI cannot be deleted while it has submissions or explicit user scope assignments",
            });
        }
        await writeItiAudit(tx, userId, "DELETE", previous, previous, null, context);
    });
}
