import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Iti, ItiListFilters, ItiType } from "./iti.types";

/**
 * ITI module — database access layer.
 *
 * The statements below mirror `sql/itis/iti_queries.sql`, the DBA-maintained
 * copy of the queries. If a query changes, update BOTH files (the .sql file
 * is the canonical reference for the database developer). All user input is
 * passed through tagged-template interpolation, which Prisma sends as bound
 * parameters — never string-concatenate values into these queries.
 *
 * ⚠ STATUS (full details in sql/itis/iti_queries.sql):
 *   The PM SETU tables (itis, clusters) do not exist yet —
 *   prisma/schema.prisma has no models and there are no migrations. Until
 *   the database developer creates the real schema, these queries fail at
 *   runtime and the endpoints return a 500 error envelope. That is
 *   intentional: ITI data must come from the database, never from hard-coded
 *   or fake records.
 */

/**
 * Raw row shape as returned by PostgreSQL. Flat (cluster joined in); array
 * columns may be NULL depending on the final storage decision.
 */
interface ItiRow {
    id: number;
    iti_code: string;
    iti_name: string;
    type: string;
    cluster_id: number | null;
    cluster_name: string | null;
    district: string;
    address: string | null;
    principal: string | null;
    contact: string | null;
    email: string | null;
    existing_trades: string[] | null;
    proposed_trades: string[] | null;
    student_strength: number | null;
    infrastructure: string | null;
    lab_details: string | null;
    latitude: number | null;
    longitude: number | null;
    photos: string[] | null;
    status: string;
}

/** Shared SELECT … FROM (cluster summary embedded via LEFT JOIN). */
const ITI_SELECT = Prisma.sql`
    SELECT
        itis.id                 AS id,
        itis.iti_code           AS iti_code,
        itis.iti_name           AS iti_name,
        itis.type               AS type,
        clusters.id             AS cluster_id,
        clusters.name           AS cluster_name,
        itis.district           AS district,
        itis.address            AS address,
        itis.principal          AS principal,
        itis.contact            AS contact,
        itis.email              AS email,
        itis.existing_trades    AS existing_trades,
        itis.proposed_trades    AS proposed_trades,
        itis.student_strength   AS student_strength,
        itis.infrastructure     AS infrastructure,
        itis.lab_details        AS lab_details,
        itis.latitude           AS latitude,
        itis.longitude          AS longitude,
        itis.photos             AS photos,
        itis.status             AS status
    FROM itis
    LEFT JOIN clusters ON clusters.id = itis.cluster_id`;

/** Maps a raw DB row onto the public Iti shape. */
function mapItiRow(row: ItiRow): Iti {
    return {
        id: row.id,
        iti_code: row.iti_code,
        iti_name: row.iti_name,
        type: row.type as ItiType,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        district: row.district,
        address: row.address,
        principal: row.principal,
        contact: row.contact,
        email: row.email,
        // No trades/photos recorded yet is represented as an empty list —
        // this is a default for missing data, never a fake value.
        existing_trades: row.existing_trades ?? [],
        proposed_trades: row.proposed_trades ?? [],
        student_strength: row.student_strength,
        infrastructure: row.infrastructure,
        lab_details: row.lab_details,
        latitude: row.latitude,
        longitude: row.longitude,
        photos: row.photos ?? [],
        status: row.status,
    };
}

/** Builds the parameterized WHERE clause for the RoadMap §7 filters. */
function buildFilters(filters: ItiListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.district !== undefined) {
        conditions.push(Prisma.sql`itis.district = ${filters.district}`);
    }
    if (filters.type !== undefined) {
        conditions.push(Prisma.sql`itis.type = ${filters.type}`);
    }
    if (filters.cluster_id !== undefined) {
        conditions.push(Prisma.sql`itis.cluster_id = ${filters.cluster_id}`);
    }
    if (filters.search !== undefined) {
        const pattern = `%${filters.search}%`;
        conditions.push(
            Prisma.sql`(itis.iti_name ILIKE ${pattern} OR itis.iti_code ILIKE ${pattern})`,
        );
    }
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
}

/** Paginated, filterable ITI list (RoadMap §7 GET /itis). */
export async function listItis(filters: ItiListFilters): Promise<Iti[]> {
    const rows = await prisma.$queryRaw<ItiRow[]>`
        ${ITI_SELECT}
        ${buildFilters(filters)}
        ORDER BY itis.iti_name
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapItiRow);
}

/** Total matching rows for the list endpoint's pagination meta. */
export async function countItis(filters: ItiListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM itis
        ${buildFilters(filters)}`;
    return rows[0]?.total ?? 0;
}

/** Single ITI by id (RoadMap §7 GET /itis/:id). */
export async function getItiById(id: number): Promise<Iti | null> {
    const rows = await prisma.$queryRaw<ItiRow[]>`
        ${ITI_SELECT}
        WHERE itis.id = ${id}`;
    return rows[0] ? mapItiRow(rows[0]) : null;
}

/** All ITIs of one cluster (RoadMap §7 GET /clusters/:clusterId/itis). */
export async function listClusterItis(clusterId: number): Promise<Iti[]> {
    const rows = await prisma.$queryRaw<ItiRow[]>`
        ${ITI_SELECT}
        WHERE itis.cluster_id = ${clusterId}
        ORDER BY itis.iti_name`;
    return rows.map(mapItiRow);
}
