import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Cluster, ClusterListFilters } from "./cluster.types";

interface ClusterRow {
    id: number;
    name: string;
    district: string;
    sector: string;
}

const CLUSTER_SELECT = Prisma.sql`
    SELECT clusters.id AS id, clusters.name AS name,
        clusters.district AS district, clusters.sector AS sector
    FROM clusters`;

function mapClusterRow(row: ClusterRow): Cluster {
    return { id: row.id, name: row.name, district: row.district, sector: row.sector };
}

function buildFilters(filters: ClusterListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.district !== undefined) conditions.push(Prisma.sql`clusters.district = ${filters.district}`);
    if (filters.sector !== undefined) conditions.push(Prisma.sql`clusters.sector = ${filters.sector}`);
    if (filters.search !== undefined) conditions.push(Prisma.sql`clusters.name ILIKE ${`%${filters.search}%`}`);
    return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

export async function listClusters(filters: ClusterListFilters): Promise<Cluster[]> {
    const rows = await prisma.$queryRaw<ClusterRow[]>`
        ${CLUSTER_SELECT} ${buildFilters(filters)}
        ORDER BY clusters.name LIMIT ${filters.pageSize}
        OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapClusterRow);
}

export async function countClusters(filters: ClusterListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM clusters ${buildFilters(filters)}`;
    return rows[0]?.total ?? 0;
}

export async function getClusterById(
    id: number,
    db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Cluster | null> {
    const rows = await db.$queryRaw<ClusterRow[]>(Prisma.sql`${CLUSTER_SELECT} WHERE clusters.id = ${id}`);
    return rows[0] ? mapClusterRow(rows[0]) : null;
}

export async function createCluster(
    input: { name: string; district: string; sector: string },
    tx: Prisma.TransactionClient,
): Promise<Cluster> {
    const rows = await tx.$queryRaw<ClusterRow[]>(Prisma.sql`
        INSERT INTO clusters (name, district, sector)
        VALUES (${input.name}, ${input.district}, ${input.sector})
        RETURNING id, name, district, sector`);
    return mapClusterRow(rows[0]);
}

export async function updateCluster(
    id: number,
    input: { name?: string; district?: string; sector?: string },
    tx: Prisma.TransactionClient,
): Promise<Cluster | null> {
    const updates: Prisma.Sql[] = [];
    if (input.name !== undefined) updates.push(Prisma.sql`name = ${input.name}`);
    if (input.district !== undefined) updates.push(Prisma.sql`district = ${input.district}`);
    if (input.sector !== undefined) updates.push(Prisma.sql`sector = ${input.sector}`);
    if (!updates.length) return getClusterById(id, tx);
    const rows = await tx.$queryRaw<ClusterRow[]>(Prisma.sql`
        UPDATE clusters SET ${Prisma.join(updates, ", ")}
        WHERE id = ${id} RETURNING id, name, district, sector`);
    return rows[0] ? mapClusterRow(rows[0]) : null;
}

export async function deleteClusterIfUnreferenced(
    id: number,
    tx: Prisma.TransactionClient,
): Promise<boolean> {
    const references = await tx.$queryRaw<{ referenced: boolean }[]>(Prisma.sql`
        SELECT (
            EXISTS (SELECT 1 FROM itis WHERE cluster_id = ${id}) OR
            EXISTS (SELECT 1 FROM aips WHERE cluster_id = ${id}) OR
            EXISTS (SELECT 1 FROM spvs WHERE cluster_id = ${id}) OR
            EXISTS (SELECT 1 FROM sips WHERE cluster_id = ${id}) OR
            EXISTS (SELECT 1 FROM documents WHERE cluster_id = ${id}) OR
            EXISTS (SELECT 1 FROM news WHERE cluster_id = ${id})
        ) AS referenced`);
    if (references[0]?.referenced) return false;
    const deleted = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        DELETE FROM clusters WHERE id = ${id} RETURNING id`);
    return deleted.length > 0;
}
