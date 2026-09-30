import { ApiError } from "../../utils/response";
import { buildPaginationMeta } from "../../utils/pagination";
import * as auditRepository from "./audit.repository";
import type { AuditEntry, AuditListFilters } from "./audit.types";
import type { AuditLogListQuery } from "./audit.schema";

/**
 * Audit module — service layer (RoadMap.md §22 "AUDIT APIs").
 *
 * Owns business rules (not-found handling, pagination composition) and exposes
 * the internal audit-create hook used by approvals and future CMS CRUD. The
 * public HTTP surface is read-only (list + detail).
 *
 * Audit-write-failure semantics are deliberately NOT finalized here. The RoadMap
 * requires audit logging but does not specify whether an audit failure should
 * block the business transaction or be best-effort. See the TO CONFIRM note on
 * recordAuditEntry(). The hook is isolated so the policy can be set in one place
 * later without touching callers. Failures are never silently swallowed.
 */
export interface AuditListResult {
    items: AuditEntry[];
    meta: ReturnType<typeof buildPaginationMeta>;
}

export async function listAuditLogs(query: AuditLogListQuery): Promise<AuditListResult> {
    const filters: AuditListFilters = {
        entity: query.entity,
        entity_id: query.entity_id,
        action: query.action,
        user_id: query.user_id,
        approval_status: query.approval_status,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        auditRepository.listAuditLogs(filters),
        auditRepository.countAuditLogs(filters),
    ]);

    return {
        items,
        meta: buildPaginationMeta(total, query.page, query.pageSize),
    };
}

export async function getAuditLogById(id: number): Promise<AuditEntry> {
    const entry = await auditRepository.getAuditLogById(id);
    if (!entry) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Audit log entry not found",
        });
    }
    return entry;
}

/**
 * Internal audit-create hook (not a public endpoint).
 *
 * TO CONFIRM — audit-write failure semantics:
 *   - RoadMap §27 requires audit logging; §21/§22 require audit metadata on
 *     transactions, but neither specifies fail-closed vs best-effort.
 *   - Current behavior: the repository INSERT is executed and its result
 *     returned. A thrown error propagates to the caller.
 *   - The caller (approval service, future CMS CRUD) decides what to do with a
 *     failure. This service does NOT silently swallow the error, and does NOT
 *     enforce a permanent fail-open/fail-closed policy.
 *   - This hook is intentionally isolated so the global policy can be set later
 *     in one place once DBA/NIC confirm the requirement.
 */
export async function recordAuditEntry(input: {
    userId: string;
    action: string;
    entity: string;
    entityId: number;
    oldValue: unknown;
    newValue: unknown;
    approvalStatus: string | null;
    context: {
        userId?: string | undefined;
        ipAddress?: string | undefined;
        userAgent?: string | undefined;
        path?: string | undefined;
    };
}): Promise<number> {
    return auditRepository.createAuditEntry(input);
}

