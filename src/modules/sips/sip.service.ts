import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { prisma } from "../../config/database";
import type { Prisma } from "../../generated/prisma/client";
import * as auditService from "../audit/audit.service";
import { ApiError } from "../../utils/response";
import type { CreateSipInput, SipListQuery, UpdateSipInput } from "./sip.schema";
import * as sipRepository from "./sip.repository";
import type { Sip } from "./sip.types";

/**
 * SIP service layer. Registry edits are audited transactionally.
 * Workflow transitions remain separate from master-data administration.
 */
export interface SipListResult {
    items: Sip[];
    meta: PaginationMeta;
}

type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };

export async function listSips(query: SipListQuery): Promise<SipListResult> {
    const [items, total] = await Promise.all([
        sipRepository.listSips({ page: query.page, pageSize: query.pageSize }),
        sipRepository.countSips(),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getSipById(id: number): Promise<Sip> {
    const item = await sipRepository.getSipById(id);
    if (!item) {
        throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SIP not found" });
    }
    return item;
}

export async function listClusterSips(clusterId: number): Promise<Sip[]> {
    return sipRepository.listClusterSips(clusterId);
}

function requireActor(id: number): number {
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return id;
}

async function writeSipAudit(
    tx: Prisma.TransactionClient,
    userId: number,
    action: string,
    item: Sip,
    oldValue: unknown,
    newValue: unknown,
    context: AuditContext,
): Promise<void> {
    await auditService.recordAuditEntry({
        userId: String(userId),
        action,
        entity: "SIP",
        entityId: item.id,
        oldValue,
        newValue,
        approvalStatus: null,
        context: { userId: String(userId), ...context },
    }, tx);
}

export async function createSip(
    body: CreateSipInput,
    actorId: number,
    context: AuditContext,
): Promise<Sip> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const item = await sipRepository.createSip(body, tx);
        await writeSipAudit(tx, userId, "CREATE", item, null, item, context);
        return item;
    });
}

export async function updateSip(
    id: number,
    body: UpdateSipInput,
    actorId: number,
    context: AuditContext,
): Promise<Sip> {
    const userId = requireActor(actorId);
    return prisma.$transaction(async (tx) => {
        const previous = await sipRepository.getSipByIdForTransaction(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SIP not found" });
        }
        const updated = await sipRepository.updateSip(id, body, tx);
        if (!updated) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SIP not found" });
        }
        await writeSipAudit(tx, userId, "UPDATE", updated, previous, updated, context);
        return updated;
    });
}

export async function deleteSip(
    id: number,
    actorId: number,
    context: AuditContext,
): Promise<void> {
    const userId = requireActor(actorId);
    await prisma.$transaction(async (tx) => {
        const previous = await sipRepository.getSipByIdForTransaction(id, tx);
        if (!previous) {
            throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "SIP not found" });
        }
        if (previous.status !== "DRAFT") {
            throw new ApiError({
                statusCode: 409,
                code: "SIP_WORKFLOW_RECORD_PROTECTED",
                message: "Only SIPs in DRAFT status can be deleted through registry administration",
            });
        }
        const deleted = await sipRepository.deleteDraftSip(id, tx);
        if (!deleted) {
            throw new ApiError({
                statusCode: 409,
                code: "SIP_WORKFLOW_RECORD_PROTECTED",
                message: "SIP status changed or the record is no longer eligible for deletion",
            });
        }
        await writeSipAudit(tx, userId, "DELETE", previous, previous, null, context);
    });
}
