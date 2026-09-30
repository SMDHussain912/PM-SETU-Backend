import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { GovernanceMember } from "./governance.types";

/**
 * Governance module — database access layer.
 *
 * The statements below mirror `sql/governance/governance_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma
 * sends as bound parameters — never string-concatenate values into these
 * queries, and never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/governance/governance_queries.sql):
 *   The PM SETU tables do not exist yet — prisma/schema.prisma has no models
 *   and there are no migrations. Until the database developer creates the
 *   real schema, these queries fail at runtime and the endpoints return a
 *   500 error envelope. That is intentional: governance data must come from
 *   the database, never from hard-coded or fake records.
 */

/** Raw row shape as returned by PostgreSQL. */
interface GovernanceMemberRow {
    id: number;
    name: string;
    designation: string | null;
    organisation: string | null;
    role: string | null;
    photograph: string | null;
    email: string | null;
    contact: string | null;
    display_order: number | null;
    effective_date: string | null;
}

/** Shared SELECT … FROM for every governance query (standalone — no joins). */
const GOVERNANCE_MEMBER_SELECT = Prisma.sql`
    SELECT
        governance_members.id             AS id,
        governance_members.name           AS name,
        governance_members.designation    AS designation,
        governance_members.organisation   AS organisation,
        governance_members.role           AS role,
        governance_members.photograph     AS photograph,
        governance_members.email          AS email,
        governance_members.contact        AS contact,
        governance_members.display_order  AS display_order,
        governance_members.effective_date AS effective_date
    FROM governance_members`;

/** Maps a raw DB row onto the public GovernanceMember shape. */
function mapGovernanceMemberRow(row: GovernanceMemberRow): GovernanceMember {
    return {
        id: row.id,
        name: row.name,
        designation: row.designation,
        organisation: row.organisation,
        role: row.role,
        photograph: row.photograph,
        email: row.email,
        contact: row.contact,
        display_order: row.display_order,
        effective_date: row.effective_date,
    };
}

/**
 * Paginated member list (RoadMap §11 GET /governance/members; GET
 * /governance is served by the same handler as an alias).
 *
 * Ordering: display_order ASC NULLS LAST with id as tiebreaker — per the
 * task brief's "display order" field, which RoadMap itself does not
 * document (TO CONFIRM). If display_order is dropped from the contract,
 * reduce this to ORDER BY id.
 */
export async function listGovernanceMembers(
    page: number,
    pageSize: number,
): Promise<GovernanceMember[]> {
    const rows = await prisma.$queryRaw<GovernanceMemberRow[]>`
        ${GOVERNANCE_MEMBER_SELECT}
        ORDER BY
            governance_members.display_order ASC NULLS LAST,
            governance_members.id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    return rows.map(mapGovernanceMemberRow);
}

/** Total rows for the list endpoint's pagination meta. */
export async function countGovernanceMembers(): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM governance_members`;
    return rows[0]?.total ?? 0;
}

/** Single member by id (RoadMap §11 GET /governance/members/:id). */
export async function getGovernanceMemberById(
    id: number,
): Promise<GovernanceMember | null> {
    const rows = await prisma.$queryRaw<GovernanceMemberRow[]>`
        ${GOVERNANCE_MEMBER_SELECT}
        WHERE governance_members.id = ${id}`;
    return rows[0] ? mapGovernanceMemberRow(rows[0]) : null;
}
