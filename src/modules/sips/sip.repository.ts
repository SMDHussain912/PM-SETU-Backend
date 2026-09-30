import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Sip, SipListFilters } from "./sip.types";

/**
 * SIP module — database access layer.
 *
 * The statements below mirror `sql/sips/sip_queries.sql`, the DBA-maintained
 * copy of the queries. If a query changes, update BOTH files (the .sql file
 * is the canonical reference for the database developer). All user input is
 * passed through tagged-template interpolation, which Prisma sends as bound
 * parameters — never string-concatenate values into these queries, and never
 * use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/sips/sip_queries.sql):
 *   The PM SETU tables do not exist yet — prisma/schema.prisma has no models
 *   and there are no migrations. Until the database developer creates the
 *   real schema, these queries fail at runtime and the endpoints return a
 *   500 error envelope. That is intentional: SIP data must come from the
 *   database, never from hard-coded or fake records.
 */

/**
 * Raw row shape as returned by PostgreSQL. Flat (cluster and AIP joined in —
 * both target tables are established by existing contracts).
 */
interface SipRow {
    id: number;
    status: string;
    cluster_id: number | null;
    cluster_name: string | null;
    aip_id: number | null;
    aip_name: string | null;
    submission_date: string | null;
    version: number | null;
    proposed_investment: number | null;
    infrastructure_contribution: number | null;
    equipment_contribution: number | null;
    training_contribution: number | null;
    industry_contribution: number | null;
    government_contribution: number | null;
    approval_date: string | null;
    remarks: string | null;
}

/** Shared SELECT … FROM (embedded summaries via LEFT JOINs). */
const SIP_SELECT = Prisma.sql`
    SELECT
        sips.id                               AS id,
        sips.status                           AS status,
        clusters.id                           AS cluster_id,
        clusters.name                         AS cluster_name,
        aips.id                               AS aip_id,
        aips.name                             AS aip_name,
        sips.submission_date                  AS submission_date,
        sips.version                          AS version,
        sips.proposed_investment              AS proposed_investment,
        sips.infrastructure_contribution      AS infrastructure_contribution,
        sips.equipment_contribution           AS equipment_contribution,
        sips.training_contribution            AS training_contribution,
        sips.industry_contribution            AS industry_contribution,
        sips.government_contribution          AS government_contribution,
        sips.approval_date                    AS approval_date,
        sips.remarks                          AS remarks
    FROM sips
    LEFT JOIN clusters ON clusters.id = sips.cluster_id
    LEFT JOIN aips ON aips.id = sips.aip_id`;

/** Maps a raw DB row onto the public Sip shape. */
function mapSipRow(row: SipRow): Sip {
    return {
        id: row.id,
        status: row.status,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        aip:
            row.aip_id === null
                ? null
                : { id: row.aip_id, name: row.aip_name ?? "" },
        submission_date: row.submission_date,
        version: row.version,
        proposed_investment: row.proposed_investment,
        infrastructure_contribution: row.infrastructure_contribution,
        equipment_contribution: row.equipment_contribution,
        training_contribution: row.training_contribution,
        industry_contribution: row.industry_contribution,
        government_contribution: row.government_contribution,
        approval_date: row.approval_date,
        remarks: row.remarks,
    };
}

/** Paginated SIP list (RoadMap §10 GET /sips — no spec'd filters). */
export async function listSips(filters: SipListFilters): Promise<Sip[]> {
    const rows = await prisma.$queryRaw<SipRow[]>`
        ${SIP_SELECT}
        ORDER BY sips.id
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapSipRow);
}

/** Total rows for the list endpoint's pagination meta. */
export async function countSips(): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM sips`;
    return rows[0]?.total ?? 0;
}

/** Single SIP by id (RoadMap §10 GET /sips/:id). */
export async function getSipById(id: number): Promise<Sip | null> {
    const rows = await prisma.$queryRaw<SipRow[]>`
        ${SIP_SELECT}
        WHERE sips.id = ${id}`;
    return rows[0] ? mapSipRow(rows[0]) : null;
}

/** All SIPs of one cluster (RoadMap §10 GET /clusters/:clusterId/sip). */
export async function listClusterSips(clusterId: number): Promise<Sip[]> {
    const rows = await prisma.$queryRaw<SipRow[]>`
        ${SIP_SELECT}
        WHERE sips.cluster_id = ${clusterId}
        ORDER BY sips.id`;
    return rows.map(mapSipRow);
}
