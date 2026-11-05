import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import * as auditService from "../audit/audit.service";
import { buildPaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import * as repository from "./industry-outcome.repository";
import type { CreateOutcomeBody, OutcomeListQuery, ReviewOutcomeBody } from "./industry-outcome.schema";

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

export async function listOutcomes(query: OutcomeListQuery) {
    const { items, total } = await repository.listOutcomes(query);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getOutcome(id: number) {
    const item = await repository.getOutcomeById(id);
    if (!item) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Industry outcome record not found" });
    return item;
}

export async function createOutcome(body: CreateOutcomeBody, actor: number, context: AuditContext) {
    const userId = actorId(actor);
    return prisma.$transaction(async (tx) => {
        const result = await repository.createOutcome(body, userId, tx);
        if ("missing" in result) {
            throw new ApiError({ statusCode: 422, code: `${result.missing}_NOT_FOUND`, message: `${result.missing} does not exist` });
        }
        if ("mismatch" in result) {
            throw new ApiError({ statusCode: 422, code: "ITI_CLUSTER_MISMATCH", message: "The ITI does not belong to the supplied cluster" });
        }
        await audit(tx, userId, "CREATE", result.item.id, null, result.item, context);
        return result.item;
    });
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
        await audit(tx, userId, "REVIEW", id, previous, updated, context);
        return updated;
    });
}
