import type { Approval, ApprovalListFilters } from "./approval.types";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

/**
 * Approvals module — database access layer.
 *
 * The statements below mirror `sql/approvals/approval_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma sends
 * as bound parameters — never string-concatenate values, never use
 * $queryRawUnsafe.
 *
 * STATUS (full details in sql/approvals/approval_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real schema,
 *   these queries fail at runtime and the endpoints return a 500 error envelope.
 *   That is intentional: no fake approval records.
 *
 * The approval status/entity vocabularies are INFERRED / TO CONFIRM (see
 * approval.types.ts). The repository is written against the proposed schema in
 * sql/approvals/approval_queries.sql and is tolerant of missing inferred columns
 * via COALESCE in the transition queries — but the DBA must confirm the final
 * column set.
 */

interface ApprovalRow {
    id: number;
    entity_type: string;
    entity_id: number;
    status: string;
    stage: string | null;
    assigned_to: string | null;
    submitted_by: string;
    reviewed_by: string | null;
    approved_by: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    decision_at: string | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
}

function mapApprovalRow(row: ApprovalRow): Approval {
    return {
        id: row.id,
        entity_type: row.entity_type as Approval["entity_type"],
        entity_id: row.entity_id,
        status: row.status as Approval["status"],
        stage: row.stage,
        assigned_to: row.assigned_to,
        submitted_by: { id: row.submitted_by, name: null },
        reviewed_by: row.reviewed_by ? { id: row.reviewed_by, name: null } : null,
        approved_by: row.approved_by ? { id: row.approved_by, name: null } : null,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        decision_at: row.decision_at,
        remarks: row.remarks,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

/**
 * Build WHERE clause fragments for list filters.
 * INFERRED filters — RoadMap §21 documents no filters; these are value-add.
 * Each supplied filter is bound as a parameter; missing filters are omitted so
 * the query stays parameterized and the plan is stable.
 */
function buildApprovalFilterClauses(
    filters: ApprovalListFilters,
): { sql: Prisma.Sql[] } {
    const clauses: Prisma.Sql[] = [];

    if (filters.entity_type !== undefined) {
        clauses.push(Prisma.sql`a.entity_type = ${filters.entity_type}`);
    }
    if (filters.entity_id !== undefined) {
        clauses.push(Prisma.sql`a.entity_id = ${filters.entity_id}`);
    }
    if (filters.status !== undefined) {
        clauses.push(Prisma.sql`a.status = ${filters.status}`);
    }
    if (filters.submitted_by !== undefined) {
        clauses.push(Prisma.sql`a.submitted_by = ${filters.submitted_by}`);
    }
    if (filters.reviewed_by !== undefined) {
        clauses.push(Prisma.sql`a.reviewed_by = ${filters.reviewed_by}`);
    }
    if (filters.approved_by !== undefined) {
        clauses.push(Prisma.sql`a.approved_by = ${filters.approved_by}`);
    }
    if (filters.from !== undefined) {
        clauses.push(Prisma.sql`a.created_at >= ${filters.from}`);
    }
    if (filters.to !== undefined) {
        clauses.push(Prisma.sql`a.created_at < ${filters.to}`);
    }

    return { sql: clauses };
}

/** Paginated approval list (INFERRED filters; RoadMap §21 documents no filters). */
export async function listApprovals(filters: ApprovalListFilters): Promise<Approval[]> {
    const { sql: clauses } = buildApprovalFilterClauses(filters);

    const rows = await prisma.$queryRaw<ApprovalRow[]>(
        Prisma.sql`
            SELECT
                a.id, a.entity_type, a.entity_id, a.status, a.stage, a.assigned_to,
                a.submitted_by, a.reviewed_by, a.approved_by, a.submitted_at,
                a.reviewed_at, a.decision_at, a.remarks, a.created_at, a.updated_at
            FROM approvals a
            ${clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.sql``}
            ORDER BY a.updated_at DESC, a.id DESC
            LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapApprovalRow);
}

/** Total rows for the list endpoint's pagination meta. */
export async function countApprovals(filters: ApprovalListFilters): Promise<number> {
    const { sql: clauses } = buildApprovalFilterClauses(filters);

    const rows = await prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`
            SELECT COUNT(*)::int AS total
            FROM approvals
            ${clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.sql``}`,
    );
    return rows[0]?.total ?? 0;
}

/** Single approval by id (RoadMap §21 GET /admin/approvals/:id). */
export async function getApprovalById(id: number): Promise<Approval | null> {
    const rows = await prisma.$queryRaw<ApprovalRow[]>(
        Prisma.sql`
            SELECT
                a.id, a.entity_type, a.entity_id, a.status, a.stage, a.assigned_to,
                a.submitted_by, a.reviewed_by, a.approved_by, a.submitted_at,
                a.reviewed_at, a.decision_at, a.remarks, a.created_at, a.updated_at
            FROM approvals a
            WHERE a.id = ${id}`,
    );
    return rows[0] ? mapApprovalRow(rows[0]) : null;
}

/**
 * Persist the approval transition and audit record in one PostgreSQL transaction.
 * An audit failure rolls back the status change (fail-closed).
 */
export async function transitionApprovalWithAudit(input: {
    id: number;
    expectedStatus: string;
    newStatus: string;
    remarks?: string;
    action: string;
    actingUserId: string;
    auditAction: string;
    ipAddress?: string;
    userAgent?: string;
    path?: string;
}): Promise<Approval | null> {
    return prisma.$transaction(async (tx) => {
        const stage: string | null = null;
        const assignedTo: string | null = null;
        const fragments: Prisma.Sql[] = [
            Prisma.sql`UPDATE approvals SET`,
            Prisma.sql`status = ${input.newStatus},`,
            Prisma.sql`stage = COALESCE(${stage}, stage),`,
            Prisma.sql`assigned_to = COALESCE(${assignedTo}, assigned_to),`,
        ];
        if (input.action === "SUBMIT") {
            fragments.push(Prisma.sql`submitted_by = ${input.actingUserId}, submitted_at = NOW(),`);
        } else if (input.action === "REVIEW" || input.action === "REQUEST_REVISION") {
            fragments.push(Prisma.sql`reviewed_by = ${input.actingUserId}, reviewed_at = NOW(),`);
        } else if (input.action === "APPROVE" || input.action === "REJECT") {
            fragments.push(Prisma.sql`approved_by = ${input.actingUserId}, decision_at = NOW(),`);
        }
        fragments.push(Prisma.sql`updated_at = NOW()`);
        if (input.remarks !== undefined) fragments.push(Prisma.sql`, remarks = ${input.remarks}`);
        fragments.push(Prisma.sql`WHERE id = ${input.id} AND status = ${input.expectedStatus}`, Prisma.sql`RETURNING id`);
        const updated = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`${Prisma.join(fragments, " ")}`);
        if (updated.length === 0) return null;
        const auditRows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
            INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, approval_status, ip_address, user_agent, path, timestamp)
            VALUES (${input.actingUserId}, ${input.auditAction}, 'APPROVAL', ${input.id},
                ${JSON.stringify({ status: input.expectedStatus })}::jsonb,
                ${JSON.stringify({ status: input.newStatus })}::jsonb, ${input.newStatus},
                ${input.ipAddress ?? null}, ${input.userAgent ?? null}, ${input.path ?? null}, NOW())
            RETURNING id`);
        if (auditRows.length === 0) throw new Error("Approval audit entry create returned no rows");
        const rows = await tx.$queryRaw<ApprovalRow[]>(Prisma.sql`
            SELECT id, entity_type, entity_id, status, stage, assigned_to, submitted_by, reviewed_by, approved_by,
                   submitted_at, reviewed_at, decision_at, remarks, created_at, updated_at
            FROM approvals WHERE id = ${input.id}`);
        return rows[0] ? mapApprovalRow(rows[0]) : null;
    });
}
