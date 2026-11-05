import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Spv, SpvListFilters } from "./spv.types";
import type { CreateSpvBody, UpdateSpvBody } from "./spv.schema";

/**
 * SPV data access. SQL mirrors sql/spvs/spv_queries.sql. The minimal
 * registry contract is name/status/cluster_id/aip_id; detailed SPV fields
 * and exact lifecycle vocabulary are not specified in RoadMap §9.
 */
interface SpvRow {
    id: number; name: string; status: string;
    cluster_id: number | null; cluster_name: string | null;
    aip_id: number | null; aip_name: string | null;
}
const SPV_SELECT = Prisma.sql`
    SELECT spvs.id AS id, spvs.name AS name, spvs.status AS status,
        clusters.id AS cluster_id, clusters.name AS cluster_name,
        aips.id AS aip_id, aips.name AS aip_name
    FROM spvs
    LEFT JOIN clusters ON clusters.id = spvs.cluster_id
    LEFT JOIN aips ON aips.id = spvs.aip_id`;
function mapSpvRow(row: SpvRow): Spv {
    return {
        id: row.id, name: row.name, status: row.status,
        cluster: row.cluster_id === null ? null : { id: row.cluster_id, name: row.cluster_name ?? "" },
        aip: row.aip_id === null ? null : { id: row.aip_id, name: row.aip_name ?? "" },
    };
}
export async function listSpvs(filters: SpvListFilters): Promise<Spv[]> {
    const rows = await prisma.$queryRaw<SpvRow[]>`
        ${SPV_SELECT} ORDER BY spvs.name
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapSpvRow);
}
export async function countSpvs(): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM spvs`;
    return rows[0]?.total ?? 0;
}
export async function getSpvById(id: number, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<Spv | null> {
    const rows = await db.$queryRaw<SpvRow[]>(Prisma.sql`${SPV_SELECT} WHERE spvs.id = ${id}`);
    return rows[0] ? mapSpvRow(rows[0]) : null;
}
export async function getSpvByIdForTransaction(id: number, tx: Prisma.TransactionClient): Promise<Spv | null> {
    return getSpvById(id, tx);
}
export async function listClusterSpvs(clusterId: number): Promise<Spv[]> {
    const rows = await prisma.$queryRaw<SpvRow[]>`
        ${SPV_SELECT} WHERE spvs.cluster_id = ${clusterId} ORDER BY spvs.name`;
    return rows.map(mapSpvRow);
}
export async function createSpv(input: CreateSpvBody, tx: Prisma.TransactionClient): Promise<Spv> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO spvs (name, status, cluster_id, aip_id)
        VALUES (${input.name}, ${input.status}, ${input.cluster_id ?? null}, ${input.aip_id ?? null})
        RETURNING id`);
    const item = await getSpvByIdForTransaction(rows[0].id, tx);
    if (!item) throw new Error("Created SPV could not be reloaded");
    return item;
}
export async function updateSpv(id: number, input: UpdateSpvBody, tx: Prisma.TransactionClient): Promise<Spv | null> {
    const updates: Prisma.Sql[] = [];
    if (input.name !== undefined) updates.push(Prisma.sql`name = ${input.name}`);
    if (input.status !== undefined) updates.push(Prisma.sql`status = ${input.status}`);
    if (input.cluster_id !== undefined) updates.push(Prisma.sql`cluster_id = ${input.cluster_id}`);
    if (input.aip_id !== undefined) updates.push(Prisma.sql`aip_id = ${input.aip_id}`);
    if (!updates.length) return getSpvByIdForTransaction(id, tx);
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        UPDATE spvs SET ${Prisma.join(updates, ", ")} WHERE id = ${id} RETURNING id`);
    return rows[0] ? getSpvByIdForTransaction(id, tx) : null;
}
/** Delete only when operational records and explicit user scopes are absent. */
export async function deleteSpvIfUnreferenced(id: number, tx: Prisma.TransactionClient): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        DELETE FROM spvs WHERE id = ${id}
          AND NOT EXISTS (SELECT 1 FROM spv_activity_records WHERE spv_id = ${id})
          AND NOT EXISTS (SELECT 1 FROM spv_submissions WHERE spv_id = ${id})
          AND NOT EXISTS (SELECT 1 FROM user_scope_assignments WHERE scope_type = 'SPV' AND scope_id = ${id})
        RETURNING id`);
    return rows.length > 0;
}
