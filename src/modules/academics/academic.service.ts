import { prisma } from "../../config/database";
import { ApiError } from "../../utils/response";
import { buildPaginationMeta } from "../../utils/pagination";
import * as repo from "./academic.repository";
import { academicRecordSchema, type AcademicListQuery, type AcademicRecordInput } from "./academic.schema";
import { buildAcademicScopeWhere } from "./academic.access";

function actorId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    return id;
}
const GLOBAL_ACADEMIC_READ_ROLES = ["super_admin", "state_pmu_admin", "det_content_admin", "approving_authority"];
function canReadSensitiveAcademicFields(roles: string[]) { return roles.some((role) => GLOBAL_ACADEMIC_READ_ROLES.includes(role)); }
function publicScopedRecord<T extends { payload: unknown; subjectToken: string | null; reviewNote: string | null }>(item: T) {
    const { payload: _payload, subjectToken: _subjectToken, reviewNote: _reviewNote, ...safe } = item;
    return safe;
}
async function scope(actor: number, roles: string[]) {
    if (buildAcademicScopeWhere(roles, []) === undefined) return undefined;
    const assignments = await prisma.userScopeAssignment.findMany({ where: { userId: actor, scopeType: { in: ["CLUSTER", "ITI"] } }, select: { scopeType: true, scopeId: true } });
    return buildAcademicScopeWhere(roles, assignments);
}
function auditSnapshot(item: { id: number; kpiCode: string; sourceSystem: string; sourceRecordId: string; clusterId: number | null; itiId: number | null; reviewStatus: string }) {
    return { id: item.id, kpiCode: item.kpiCode, sourceSystem: item.sourceSystem, sourceRecordId: item.sourceRecordId, clusterId: item.clusterId, itiId: item.itiId, reviewStatus: item.reviewStatus };
}
async function writeAudit(actor: number, action: string, item: Parameters<typeof auditSnapshot>[0], oldValue: unknown, newValue: unknown, context: { ipAddress?: string; userAgent?: string; path?: string }) {
    const audit = await import("../audit/audit.service.js");
    await audit.recordAuditEntry({ userId: String(actor), action, entity: "ACADEMIC_SOURCE_RECORD", entityId: item.id, oldValue, newValue, approvalStatus: item.reviewStatus, context: { userId: String(actor), ...context } });
}
export async function create(input: AcademicRecordInput, actor: number, context: { ipAddress?: string; userAgent?: string; path?: string }) {
    const user = actorId(actor);
    try {
        const result = await repo.create(input, user);
        if ("missing" in result) throw new ApiError({ statusCode: 422, code: result.missing + "_NOT_FOUND", message: result.missing + " does not exist" });
        if ("mismatch" in result) throw new ApiError({ statusCode: 422, code: "ITI_CLUSTER_MISMATCH", message: "The ITI does not belong to the supplied cluster" });
        await writeAudit(user, "CREATE", auditSnapshot(result.item), null, auditSnapshot(result.item), context);
        return result.item;
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new ApiError({ statusCode: 409, code: "DUPLICATE_SOURCE_RECORD", message: "This source_system and source_record_id already exists" });
        throw error;
    }
}
export async function list(query: AcademicListQuery, actor: number, roles: string[]) {
    const result = await repo.list(query, await scope(actorId(actor), roles));
    const items = canReadSensitiveAcademicFields(roles) ? result.items : result.items.map(publicScopedRecord);
    return { items, meta: buildPaginationMeta(result.total, query.page, query.pageSize) };
}
export async function get(id: number, actor: number, roles: string[]) {
    const item = await repo.get(id, await scope(actorId(actor), roles));
    if (!item) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Academic source record not found" });
    return canReadSensitiveAcademicFields(roles) ? item : publicScopedRecord(item);
}
export async function summary(actor: number, roles: string[]) {
    return repo.summary(await scope(actorId(actor), roles));
}
export async function review(id: number, status: "ACCEPTED" | "REJECTED", note: string | null, actor: number, roles: string[], context: { ipAddress?: string; userAgent?: string; path?: string }) {
    const user = actorId(actor); const scopeWhere = await scope(user, roles);
    const previous = await repo.get(id, scopeWhere);
    if (!previous) throw new ApiError({ statusCode: 404, code: "RECORD_NOT_FOUND", message: "Academic source record not found" });
    if (previous.reviewStatus !== "PENDING") throw new ApiError({ statusCode: 409, code: "RECORD_ALREADY_REVIEWED", message: "Only pending records can be reviewed" });
    const updated = await repo.review(id, status, note, user, scopeWhere);
    if (!updated) throw new ApiError({ statusCode: 409, code: "RECORD_ALREADY_REVIEWED", message: "The record was changed by another request" });
    await writeAudit(user, "REVIEW", auditSnapshot(updated), auditSnapshot(previous), auditSnapshot(updated), context);
    return updated;
}
export async function importBatch(records: unknown[], actor: number, context: { ipAddress?: string; userAgent?: string; path?: string }) {
    const created: Array<{ index: number; id: number }> = []; const duplicates: number[] = []; const errors: Array<{ index: number; code: string; message: string }> = [];
    for (let index = 0; index < records.length; index += 1) {
        const parsed = academicRecordSchema.safeParse(records[index]);
        if (!parsed.success) { errors.push({ index, code: "INVALID_RECORD", message: "Record validation failed" }); continue; }
        try { const item = await create(parsed.data, actor, context); created.push({ index, id: item.id }); }
        catch (error) {
            if (error instanceof ApiError && error.statusCode === 409) duplicates.push(index);
            else if (error instanceof ApiError && error.statusCode === 422) errors.push({ index, code: error.code, message: error.message });
            else throw error;
        }
    }
    return { total: records.length, created_count: created.length, duplicate_count: duplicates.length, error_count: errors.length, created, duplicates, errors };
}
