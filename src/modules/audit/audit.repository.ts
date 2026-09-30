import type { AuditEntry, AuditListFilters } from "./audit.types";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

/**
 * Audit module — database access layer.
 *
 * The statements below mirror `sql/audit/audit_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma sends
 * as bound parameters — never string-concatenate values, never use
 * $queryRawUnsafe.
 *
 * STATUS (full details in sql/audit/audit_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real schema,
 *   these queries fail at runtime and the endpoints return a 500 error envelope.
 *   That is intentional: no fake audit records.
 *
 * Append-only: this repository only ever INSERTs audit entries (via the internal
 * hook). No public DELETE/UPDATE paths exist.
 */

interface AuditRow {
    id: number;
    user_id: string;
    action: string;
    entity: string;
    entity_id: number;
    old_value: unknown;
    new_value: unknown;
    approval_status: string | null;
    ip_address: string | null;
    user_agent: string | null;
    path: string | null;
    timestamp: string;
}

function mapAuditRow(row: AuditRow): AuditEntry {
    return {
        id: row.id,
        user_id: row.user_id,
        action: row.action,
        entity: row.entity,
        entity_id: row.entity_id,
        old_value: row.old_value,
        new_value: row.new_value,
        approval_status: row.approval_status,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        path: row.path,
        timestamp: row.timestamp,
    };
}

/**
 * Build WHERE clause fragments for list filters.
 * INFERRED filters — RoadMap §22 documents no filters; these are value-add.
 * Each supplied filter is bound as a parameter; missing filters are omitted so
 * the query stays parameterized and the plan is stable.
 */
function auditFilterClauses(
    filters: AuditListFilters,
): { sql: Prisma.Sql[]; params: Record<string, unknown> } {
    const clauses: Prisma.Sql[] = [];
    const params: Record<string, unknown> = {};

    if (filters.entity !== undefined) {
        clauses.push(Prisma.sql`entity = ${filters.entity}`);
    }
    if (filters.entity_id !== undefined) {
        clauses.push(Prisma.sql`entity_id = ${filters.entity_id}`);
    }
    if (filters.action !== undefined) {
        clauses.push(Prisma.sql`action = ${filters.action}`);
    }
    if (filters.user_id !== undefined) {
        clauses.push(Prisma.sql`user_id = ${filters.user_id}`);
    }
    if (filters.approval_status !== undefined) {
        clauses.push(Prisma.sql`approval_status = ${filters.approval_status}`);
    }
    if (filters.from !== undefined) {
        clauses.push(Prisma.sql`timestamp >= ${filters.from}`);
    }
    if (filters.to !== undefined) {
        clauses.push(Prisma.sql`timestamp < ${filters.to}`);
    }

    return { sql: clauses, params };
}

/** Paginated audit log list (INFERRED filters; RoadMap §22 documents no filters). */
export async function listAuditLogs(filters: AuditListFilters): Promise<AuditEntry[]> {
    const { sql: clauses } = auditFilterClauses(filters);

    const rows = await prisma.$queryRaw<AuditRow[]>(
        Prisma.sql`
            SELECT
                id, user_id, action, entity, entity_id,
                old_value, new_value, approval_status,
                ip_address, user_agent, path, timestamp
            FROM audit_logs
            ${clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.sql``}
            ORDER BY timestamp DESC, id DESC
            LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapAuditRow);
}

/** Total rows for the list endpoint's pagination meta. */
export async function countAuditLogs(filters: AuditListFilters): Promise<number> {
    const { sql: clauses } = auditFilterClauses(filters);

    const rows = await prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`
            SELECT COUNT(*)::int AS total
            FROM audit_logs
            ${clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.sql``}`,
    );
    return rows[0]?.total ?? 0;
}

/** Single audit entry by id (RoadMap §22 GET /admin/audit-logs/:id). */
export async function getAuditLogById(id: number): Promise<AuditEntry | null> {
    const rows = await prisma.$queryRaw<AuditRow[]>(
        Prisma.sql`
            SELECT
                id, user_id, action, entity, entity_id,
                old_value, new_value, approval_status,
                ip_address, user_agent, path, timestamp
            FROM audit_logs
            WHERE id = ${id}`,
    );
    return rows[0] ? mapAuditRow(rows[0]) : null;
}

/**
 * Internal audit-create hook. Called by trusted services (approval transitions,
 * future CMS CRUD). NOT exposed as a public endpoint.
 *
 * TO CONFIRM audit-write failure semantics (RoadMap requires audit logging but
 * does not specify fail-closed vs best-effort):
 *   - Today: the INSERT result is returned; the caller decides what to do with
 *     a failure. The audit hook itself does NOT silently swallow errors and does
 *     NOT decide the global policy.
 *   - This seam is intentionally isolated so the policy can be changed in one
 *     place after confirmation, without touching callers.
 */
export async function createAuditEntry(input: {
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
    const { userId, action, entity, entityId, oldValue, newValue, approvalStatus, context } = input;

    const rows = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`
            INSERT INTO audit_logs (
                user_id, action, entity, entity_id,
                old_value, new_value, approval_status,
                ip_address, user_agent, path, timestamp
            )
            VALUES (
                ${userId}, ${action}, ${entity}, ${entityId},
                ${oldValue}, ${newValue}, ${approvalStatus},
                ${context.ipAddress}, ${context.userAgent}, ${context.path}, ${new Date().toISOString()}
            )
            RETURNING id`,
    );

    if (rows.length === 0) {
        throw new Error("Audit entry create returned no rows");
    }
    return rows[0].id;
}

