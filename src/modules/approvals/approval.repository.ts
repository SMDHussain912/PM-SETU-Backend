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
 * Optimistic-guarded status transition (defense-in-depth for the state machine).
 *
 * Updates the approval status (and, where the proposed schema has them, the
 * relevant actor/timestamp columns) only if the current status matches
 * `expectedStatus`. Returns true if a row was updated, false if the status had
 * already changed (concurrent modification) — the service turns a false result
 * into an INVALID_APPROVAL_TRANSITION error.
 *
 * The actor/timestamp column updates are INFERRED / TO CONFIRM with the DBA.
 * Each action uses its own UPDATE template matching sql/approvals/approval_queries.sql
 * sections 4-8. The optional stage/assigned_to columns are bound as null so that
 * COALESCE(null, stage) = stage (no-op) when those columns exist; if a proposed
 * column does not exist in the DBA's schema, Prisma surfaces a runtime error when
 * the query runs — that is expected until the DBA creates the schema and confirms
 * the columns.
 */
export async function updateApprovalStatus(
    id: number,
    expectedStatus: string,
    newStatus: string,
    remarks: string | undefined,
    action: string,
    actingUserId: string,
): Promise<boolean> {
    const stage = null as string | null;
    const assignedTo = null as string | null;

    if (action === "SUBMIT") {
        return updateApprovalRow(
            id,
            expectedStatus,
            newStatus,
            stage,
            assignedTo,
            actingUserId,
            /*setSubmitted*/ true,
            /*setReviewed*/ false,
            /*setDecision*/ false,
            remarks,
        );
    } else if (action === "REVIEW" || action === "REQUEST_REVISION") {
        return updateApprovalRow(
            id,
            expectedStatus,
            newStatus,
            stage,
            assignedTo,
            actingUserId,
            /*setSubmitted*/ false,
            /*setReviewed*/ true,
            /*setDecision*/ action === "REQUEST_REVISION" ? false : false,
            remarks,
        );
    } else if (action === "APPROVE" || action === "REJECT") {
        return updateApprovalRow(
            id,
            expectedStatus,
            newStatus,
            stage,
            assignedTo,
            actingUserId,
            /*setSubmitted*/ false,
            /*setReviewed*/ false,
            /*setDecision*/ true,
            remarks,
        );
    } else {
        // Fallback for any unrecognized action: update status only.
        const updated = await prisma.$queryRaw<{ id: number }[]>(
            Prisma.sql`
                UPDATE approvals
                SET status = ${newStatus}, updated_at = NOW()
                    ${remarks !== undefined ? Prisma.sql`, remarks = ${remarks}` : Prisma.sql``}
                WHERE id = ${id} AND status = ${expectedStatus}
                RETURNING id`,
        );
        return updated.length > 0;
    }
}

/**
 * Shared UPDATE template for approval status transitions that set actor columns.
 * Matches sql/approvals/approval_queries.sql sections 4-8 (one per action shape).
 *
 * The REVIEW and REQUEST_REVISION actions set reviewed_by + reviewed_at.
 * The APPROVE and REJECT actions set approved_by + decision_at.
 * The SUBMIT action sets submitted_by + submitted_at.
 */
async function updateApprovalRow(
    id: number,
    expectedStatus: string,
    newStatus: string,
    stage: string | null,
    assignedTo: string | null,
    actingUserId: string,
    setSubmitted: boolean,
    setReviewed: boolean,
    setDecision: boolean,
    remarks: string | undefined,
): Promise<boolean> {
    const fragments: Prisma.Sql[] = [
        Prisma.sql`UPDATE approvals SET`,
        Prisma.sql`status = ${newStatus},`,
        Prisma.sql`stage = COALESCE(${stage}, stage),`,
        Prisma.sql`assigned_to = COALESCE(${assignedTo}, assigned_to),`,
    ];

    if (setSubmitted) {
        fragments.push(Prisma.sql`submitted_by = ${actingUserId}, submitted_at = NOW(),`);
    }
    if (setReviewed) {
        fragments.push(Prisma.sql`reviewed_by = ${actingUserId}, reviewed_at = NOW(),`);
    }
    if (setDecision) {
        fragments.push(Prisma.sql`approved_by = ${actingUserId}, decision_at = NOW(),`);
    }

    fragments.push(Prisma.sql`updated_at = NOW()`);
    if (remarks !== undefined) {
        fragments.push(Prisma.sql`, remarks = ${remarks}`);
    }

    fragments.push(
        Prisma.sql` WHERE id = ${id} AND status = ${expectedStatus}`,
        Prisma.sql` RETURNING id`,
    );

    const updated = await prisma.$queryRaw<{ id: number }[]>(
        Prisma.sql`${Prisma.join(fragments, " ")}`,
    );
    return updated.length > 0;
}



