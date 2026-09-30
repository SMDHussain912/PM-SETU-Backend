import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Aip, AipListFilters } from "./aip.types";

/**
 * AIP module — database access layer.
 *
 * The statements below mirror `sql/aips/aip_queries.sql`, the DBA-maintained
 * copy of the queries. If a query changes, update BOTH files (the .sql file
 * is the canonical reference for the database developer). All user input is
 * passed through tagged-template interpolation, which Prisma sends as bound
 * parameters — never string-concatenate values into these queries, and never
 * use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/aips/aip_queries.sql):
 *   The PM SETU tables do not exist yet — prisma/schema.prisma has no models
 *   and there are no migrations. Until the database developer creates the
 *   real schema, these queries fail at runtime and the endpoints return a
 *   500 error envelope. That is intentional: AIP data must come from the
 *   database, never from hard-coded or fake records.
 */

/**
 * Raw row shape as returned by PostgreSQL. Flat (cluster joined in); the
 * aips.investment_amount column name is established by the Home KPI
 * contract (sql/home/home_kpis.sql).
 */
interface AipRow {
    id: number;
    name: string;
    logo_url: string | null;
    cluster_id: number | null;
    cluster_name: string | null;
    sector: string;
    status: string;
    investment_amount: number | null;
    academic_partner: string | null;
    contact: string | null;
    website: string | null;
}

/** Shared SELECT … FROM (cluster summary embedded via LEFT JOIN). */
const AIP_SELECT = Prisma.sql`
    SELECT
        aips.id                  AS id,
        aips.name                AS name,
        aips.logo_url            AS logo_url,
        clusters.id              AS cluster_id,
        clusters.name            AS cluster_name,
        aips.sector              AS sector,
        aips.status              AS status,
        aips.investment_amount   AS investment_amount,
        aips.academic_partner    AS academic_partner,
        aips.contact             AS contact,
        aips.website             AS website
    FROM aips
    LEFT JOIN clusters ON clusters.id = aips.cluster_id`;

/** Maps a raw DB row onto the public Aip shape. */
function mapAipRow(row: AipRow): Aip {
    return {
        id: row.id,
        name: row.name,
        logo_url: row.logo_url,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        sector: row.sector,
        status: row.status,
        investment_amount: row.investment_amount,
        academic_partner: row.academic_partner,
        contact: row.contact,
        website: row.website,
    };
}

/** Builds the parameterized WHERE clause for the RoadMap §8 filters. */
function buildFilters(filters: AipListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.sector !== undefined) {
        conditions.push(Prisma.sql`aips.sector = ${filters.sector}`);
    }
    if (filters.cluster_id !== undefined) {
        conditions.push(Prisma.sql`aips.cluster_id = ${filters.cluster_id}`);
    }
    if (filters.status !== undefined) {
        conditions.push(Prisma.sql`aips.status = ${filters.status}`);
    }
    if (filters.search !== undefined) {
        const pattern = `%${filters.search}%`;
        conditions.push(Prisma.sql`aips.name ILIKE ${pattern}`);
    }
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
}

/** Paginated, filterable AIP list (RoadMap §8 GET /aips). */
export async function listAips(filters: AipListFilters): Promise<Aip[]> {
    const rows = await prisma.$queryRaw<AipRow[]>`
        ${AIP_SELECT}
        ${buildFilters(filters)}
        ORDER BY aips.name
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapAipRow);
}

/** Total matching rows for the list endpoint's pagination meta. */
export async function countAips(filters: AipListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM aips
        ${buildFilters(filters)}`;
    return rows[0]?.total ?? 0;
}

/** Single AIP by id (RoadMap §8 GET /aips/:id). */
export async function getAipById(id: number): Promise<Aip | null> {
    const rows = await prisma.$queryRaw<AipRow[]>`
        ${AIP_SELECT}
        WHERE aips.id = ${id}`;
    return rows[0] ? mapAipRow(rows[0]) : null;
}
