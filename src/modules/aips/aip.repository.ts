import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Aip, AipListFilters } from "./aip.types";
import type { CreateAipBody, UpdateAipBody } from "./aip.schema";

/**
 * AIP module — database access layer.
 *
 * Queries mirror sql/aips/aip_queries.sql. All user-supplied values are bound
 * through Prisma SQL fragments; identifiers are selected only from this
 * explicit allow-list.
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
    academic_partner: boolean;
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
        aips.investment_amount::double precision AS investment_amount,
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
        investment_amount: row.investment_amount === null ? null : Number(row.investment_amount),
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


/** Load a single AIP using the same database shape as public reads. */
export async function getAipByIdForTransaction(
    id: number,
    db: Prisma.TransactionClient,
): Promise<Aip | null> {
    const rows = await db.$queryRaw<AipRow[]>(Prisma.sql`
        ${AIP_SELECT}
        WHERE aips.id = ${id}`);
    return rows[0] ? mapAipRow(rows[0]) : null;
}

/** Create an AIP registry record within the caller's transaction. */
export async function createAip(input: CreateAipBody, tx: Prisma.TransactionClient): Promise<Aip> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO aips (
            name, logo_url, cluster_id, sector, status, investment_amount,
            academic_partner, contact, website
        ) VALUES (
            ${input.name}, ${input.logo_url ?? null}, ${input.cluster_id ?? null},
            ${input.sector}, ${input.status}, ${input.investment_amount ?? null},
            ${input.academic_partner ?? false}, ${input.contact ?? null}, ${input.website ?? null}
        )
        RETURNING id`);
    const item = await getAipByIdForTransaction(rows[0].id, tx);
    if (!item) throw new Error("Created AIP could not be reloaded");
    return item;
}

/** Update only the supplied, validated AIP master-data fields. */
export async function updateAip(
    id: number,
    input: UpdateAipBody,
    tx: Prisma.TransactionClient,
): Promise<Aip | null> {
    const updates: Prisma.Sql[] = [];
    if (input.name !== undefined) updates.push(Prisma.sql`name = ${input.name}`);
    if (input.logo_url !== undefined) updates.push(Prisma.sql`logo_url = ${input.logo_url}`);
    if (input.cluster_id !== undefined) updates.push(Prisma.sql`cluster_id = ${input.cluster_id}`);
    if (input.sector !== undefined) updates.push(Prisma.sql`sector = ${input.sector}`);
    if (input.status !== undefined) updates.push(Prisma.sql`status = ${input.status}`);
    if (input.investment_amount !== undefined) updates.push(Prisma.sql`investment_amount = ${input.investment_amount}`);
    if (input.academic_partner !== undefined) updates.push(Prisma.sql`academic_partner = ${input.academic_partner}`);
    if (input.contact !== undefined) updates.push(Prisma.sql`contact = ${input.contact}`);
    if (input.website !== undefined) updates.push(Prisma.sql`website = ${input.website}`);

    if (updates.length === 0) return getAipByIdForTransaction(id, tx);
    const changed = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        UPDATE aips SET ${Prisma.join(updates, ", ")}
        WHERE id = ${id}
        RETURNING id`);
    return changed[0] ? getAipByIdForTransaction(id, tx) : null;
}

/**
 * Delete atomically only when no SPV, SIP, AIP activity, submission or
 * explicit AIP user-scope assignment depends on this registry record.
 */
export async function deleteAipIfUnreferenced(id: number, tx: Prisma.TransactionClient): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        DELETE FROM aips
        WHERE id = ${id}
          AND NOT EXISTS (SELECT 1 FROM spvs WHERE aip_id = ${id})
          AND NOT EXISTS (SELECT 1 FROM sips WHERE aip_id = ${id})
          AND NOT EXISTS (SELECT 1 FROM aip_activity_records WHERE aip_id = ${id})
          AND NOT EXISTS (SELECT 1 FROM aip_submissions WHERE aip_id = ${id})
          AND NOT EXISTS (
              SELECT 1 FROM user_scope_assignments
              WHERE scope_type = 'AIP' AND scope_id = ${id}
          )
        RETURNING id`);
    return rows.length > 0;
}
