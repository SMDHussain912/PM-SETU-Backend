import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import * as auditService from "../audit/audit.service";
import { buildPaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import * as repository from "./industry-outcome.repository";
import { toOutcomeAuditHistoryEntry, toOutcomeAuditSnapshot } from "./industry-outcome.audit";
import { buildOutcomeScopeWhere } from "./industry-outcome.access";
import { createOutcomeSchema, type CreateOutcomeBody, type OutcomeHistoryQuery, type OutcomeListQuery, type ReviewOutcomeBody } from "./industry-outcome.schema";

function actorId(value: number): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return value;
}

type AuditContext = { ipAddress?: string; userAgent?: string; path?: string };


async function audit(tx: Prisma.TransactionClient, userId: number, action: string, id: number, oldValue: unknown, newValue: unknown, context: AuditContext) {
    await auditService.recordAuditEntry({
        userId: String(userId), action, entity: "INDUSTRY_OUTCOME", entityId: id,
        oldValue, newValue, approvalStatus: null,
        context: { userId: String(userId), ...context },
    }, tx);
}

async function outcomeScope(userId: number, roles: string[]) {
    if (buildOutcomeScopeWhere(roles, []) === undefined) return undefined;
    const assignments = await prisma.userScopeAssignment.findMany({
        where: { userId, scopeType: { in: ["CLUSTER", "ITI"] } },
        select: { scopeType: true, scopeId: true },
    });
    return buildOutcomeScopeWhere(roles, assignments);
}

export async function listOutcomes(query: OutcomeListQuery, actor: number, roles: string[]) {
    const scopeWhere = await outcomeScope(actorId(actor), roles);
    const { items, total } = await repository.listOutcomes(query, scopeWhere);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getOutcome(id: number, actor: number, roles: string[]) {
    const scopeWhere = await outcomeScope(actorId(actor), roles);
    const item = await repository.getOutcomeById(id, scopeWhere);
    if (!item) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Industry outcome record not found" });
    return item;
}

export async function getOutcomeHistory(id: number, query: OutcomeHistoryQuery, actor: number, roles: string[]) {
    await getOutcome(id, actor, roles);
    const result = await auditService.listAuditLogs({
        entity: "INDUSTRY_OUTCOME",
        entity_id: id,
        page: query.page,
        pageSize: query.pageSize,
    });
    return {
        items: result.items.map(toOutcomeAuditHistoryEntry),
        meta: result.meta,
    };
}

export async function createOutcome(body: CreateOutcomeBody, actor: number, context: AuditContext) {
    const userId = actorId(actor);
    try {
        return await prisma.$transaction(async (tx) => {
            const result = await repository.createOutcome(body, userId, tx);
            if ("missing" in result) {
                throw new ApiError({ statusCode: 422, code: `${result.missing}_NOT_FOUND`, message: `${result.missing} does not exist` });
            }
            if ("mismatch" in result) {
                throw new ApiError({ statusCode: 422, code: "ITI_CLUSTER_MISMATCH", message: "The ITI does not belong to the supplied cluster" });
            }
            await audit(tx, userId, "CREATE", result.item.id, null, toOutcomeAuditSnapshot(result.item), context);
            return result.item;
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new ApiError({
                statusCode: 409,
                code: "DUPLICATE_SOURCE_RECORD",
                message: "An industry outcome with this source_system and source_record_id already exists",
            });
        }
        throw error;
    }
}

function isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function reviewOutcome(id: number, body: ReviewOutcomeBody, actor: number, context: AuditContext) {
    const userId = actorId(actor);
    return prisma.$transaction(async (tx) => {
        const previous = await tx.industryOutcomeRecord.findUnique({ where: { id } });
        if (!previous) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Industry outcome record not found" });
        if (previous.reviewStatus !== "PENDING") {
            throw new ApiError({ statusCode: 409, code: "OUTCOME_ALREADY_REVIEWED", message: "Only pending records can be reviewed" });
        }
        const updated = await repository.reviewOutcome(id, body, userId, tx);
        if (!updated) {
            throw new ApiError({ statusCode: 409, code: "OUTCOME_ALREADY_REVIEWED", message: "The record was reviewed by another request" });
        }
        await audit(tx, userId, "REVIEW", id, toOutcomeAuditSnapshot(previous), toOutcomeAuditSnapshot(updated!), context);
        return updated;
    });
}

export async function getOutcomeSummary(actor: number, roles: string[]) {
    const scopeWhere = await outcomeScope(actorId(actor), roles);
    return repository.getOutcomeSummary(scopeWhere);
}


type ImportRowError = { index: number; code: string; message: string; details?: unknown };

export async function importOutcomeBatch(body: { records: unknown[] }, actor: number, context: AuditContext) {
    const userId = actorId(actor);
    const created: Array<{ index: number; id: number }> = [];
    const duplicates: number[] = [];
    const errors: ImportRowError[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < body.records.length; index += 1) {
        const parsed = createOutcomeSchema.safeParse(body.records[index]);
        if (!parsed.success) {
            errors.push({ index, code: "INVALID_RECORD", message: "Record validation failed", details: parsed.error.issues });
            continue;
        }
        const record = parsed.data;
        if (!record.source_record_id) {
            errors.push({ index, code: "SOURCE_RECORD_ID_REQUIRED", message: "Bulk imports require source_record_id for reliable duplicate prevention" });
            continue;
        }
        const key = JSON.stringify([record.source_system, record.source_record_id]);
        if (seen.has(key)) {
            duplicates.push(index);
            continue;
        }

        try {
            const item = await prisma.$transaction(async (tx) => {
                const result = await repository.createOutcome(record, userId, tx);
                if ("missing" in result) {
                    throw new ApiError({ statusCode: 422, code: `${result.missing}_NOT_FOUND`, message: `${result.missing} does not exist` });
                }
                if ("mismatch" in result) {
                    throw new ApiError({ statusCode: 422, code: "ITI_CLUSTER_MISMATCH", message: "The ITI does not belong to the supplied cluster" });
                }
                await audit(tx, userId, "IMPORT_CREATE", result.item.id, null, toOutcomeAuditSnapshot(result.item), context);
                return result.item;
            });
            created.push({ index, id: item.id });
            seen.add(key);
        } catch (error) {
            if (error instanceof ApiError) {
                errors.push({ index, code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) });
                continue;
            }
            if (isUniqueConstraintError(error)) {
                duplicates.push(index);
                seen.add(key);
                continue;
            }
            throw error;
        }
    }

    return {
        total: body.records.length,
        created_count: created.length,
        duplicate_count: duplicates.length,
        error_count: errors.length,
        created,
        duplicates,
        errors,
    };
}
