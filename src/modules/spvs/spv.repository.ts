import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Spv, SpvListFilters } from "./spv.types";

/**
 * SPV module — database access layer.
 *
 * The statements below mirror `sql/spvs/spv_queries.sql`, the DBA-maintained
 * copy of the queries. If a query changes, update BOTH files (the .sql file
 * is the canonical reference for the database developer). All user input is
 * passed through tagged-template interpolation, which Prisma sends as bound
 * parameters — never string-concatenate values into these queries, and never
 * use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/spvs/spv_queries.sql):
 *   The PM SETU tables do not exist yet — prisma/schema.prisma has no models
 *   and there are no migrations. Until the database developer creates the
 *   real schema, these queries fail at runtime and the endpoints return a
 *   500 error envelope. That is intentional: SPV data must come from the
 *   database, never from hard-coded or fake records.
 */

/**
 * Raw row shape as returned by PostgreSQL. Flat (cluster and AIP joined in —
 * both target tables are established by existing contracts).
 */
interface SpvRow {
    id: number;
    name: string;
    status: string;
    cluster_id: number | null;
    cluster_name: string | null;
    aip_id: number | null;
    aip_name: string | null;
}

/** Shared SELECT … FROM (embedded summaries via LEFT JOINs). */
const SPV_SELECT = Prisma.sql`
    SELECT
        spvs.id           AS id,
        spvs.name         AS name,
        spvs.status       AS status,
        clusters.id       AS cluster_id,
        clusters.name     AS cluster_name,
        aips.id           AS aip_id,
        aips.name         AS aip_name
    FROM spvs
    LEFT JOIN clusters ON clusters.id = spvs.cluster_id
    LEFT JOIN aips ON aips.id = spvs.aip_id`;

/** Maps a raw DB row onto the public Spv shape. */
function mapSpvRow(row: SpvRow): Spv {
    return {
        id: row.id,
        name: row.name,
        status: row.status,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        aip:
            row.aip_id === null
                ? null
                : { id: row.aip_id, name: row.aip_name ?? "" },
    };
}

/** Paginated SPV list (RoadMap §9 GET /spvs — no spec'd filters). */
export async function listSpvs(filters: SpvListFilters): Promise<Spv[]> {
    const rows = await prisma.$queryRaw<SpvRow[]>`
        ${SPV_SELECT}
        ORDER BY spvs.name
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapSpvRow);
}

/** Total rows for the list endpoint's pagination meta. */
export async function countSpvs(): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM spvs`;
    return rows[0]?.total ?? 0;
}

/** Single SPV by id (RoadMap §9 GET /spvs/:id). */
export async function getSpvById(id: number): Promise<Spv | null> {
    const rows = await prisma.$queryRaw<SpvRow[]>`
        ${SPV_SELECT}
        WHERE spvs.id = ${id}`;
    return rows[0] ? mapSpvRow(rows[0]) : null;
}

/** All SPVs of one cluster (RoadMap §9 GET /clusters/:clusterId/spv). */
export async function listClusterSpvs(clusterId: number): Promise<Spv[]> {
    const rows = await prisma.$queryRaw<SpvRow[]>`
        ${SPV_SELECT}
        WHERE spvs.cluster_id = ${clusterId}
        ORDER BY spvs.name`;
    return rows.map(mapSpvRow);
}
