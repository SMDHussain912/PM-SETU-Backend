import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Cluster, ClusterListFilters } from "./cluster.types";

/**
 * Cluster module — database access layer.
 *
 * The statements below mirror `sql/clusters/cluster_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma
 * sends as bound parameters — never string-concatenate values into these
 * queries, and never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/clusters/cluster_queries.sql):
 *   The PM SETU tables do not exist yet — prisma/schema.prisma has no models
 *   and there are no migrations. Until the database developer creates the
 *   real schema, these queries fail at runtime and the endpoints return a
 *   500 error envelope. That is intentional: cluster data must come from the
 *   database, never from hard-coded or fake records.
 */

/** Raw row shape as returned by PostgreSQL. */
interface ClusterRow {
    id: number;
    name: string;
    district: string;
    sector: string;
}

/** Shared SELECT … FROM for every cluster query. */
const CLUSTER_SELECT = Prisma.sql`
    SELECT
        clusters.id         AS id,
        clusters.name       AS name,
        clusters.district   AS district,
        clusters.sector     AS sector
    FROM clusters`;

/** Maps a raw DB row onto the public Cluster shape. */
function mapClusterRow(row: ClusterRow): Cluster {
    return {
        id: row.id,
        name: row.name,
        district: row.district,
        sector: row.sector,
    };
}

/** Builds the parameterized WHERE clause for the RoadMap §6 filters. */
function buildFilters(filters: ClusterListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.district !== undefined) {
        conditions.push(Prisma.sql`clusters.district = ${filters.district}`);
    }
    if (filters.sector !== undefined) {
        conditions.push(Prisma.sql`clusters.sector = ${filters.sector}`);
    }
    if (filters.search !== undefined) {
        const pattern = `%${filters.search}%`;
        conditions.push(Prisma.sql`clusters.name ILIKE ${pattern}`);
    }
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
}

/** Paginated, filterable cluster list (RoadMap §6 GET /clusters). */
export async function listClusters(filters: ClusterListFilters): Promise<Cluster[]> {
    const rows = await prisma.$queryRaw<ClusterRow[]>`
        ${CLUSTER_SELECT}
        ${buildFilters(filters)}
        ORDER BY clusters.name
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapClusterRow);
}

/** Total matching rows for the list endpoint's pagination meta. */
export async function countClusters(filters: ClusterListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM clusters
        ${buildFilters(filters)}`;
    return rows[0]?.total ?? 0;
}

/** Single cluster by id (RoadMap §6 GET /clusters/:id). */
export async function getClusterById(id: number): Promise<Cluster | null> {
    const rows = await prisma.$queryRaw<ClusterRow[]>`
        ${CLUSTER_SELECT}
        WHERE clusters.id = ${id}`;
    return rows[0] ? mapClusterRow(rows[0]) : null;
}
