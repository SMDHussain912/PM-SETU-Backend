import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { CreateSipInput, UpdateSipInput } from "./sip.schema";
import type { Sip, SipListFilters } from "./sip.types";

/**
 * SIP database access.
 *
 * The established write contract is limited to status, cluster_id and aip_id.
 * Additional fields in the public read model remain marked TO CONFIRM in
 * sql/sips/sip_queries.sql and are deliberately not writable here.
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

const SIP_SELECT = Prisma.sql`
    SELECT
        sips.id AS id,
        sips.status AS status,
        clusters.id AS cluster_id,
        clusters.name AS cluster_name,
        aips.id AS aip_id,
        aips.name AS aip_name,
        sips.submission_date AS submission_date,
        sips.version AS version,
        sips.proposed_investment AS proposed_investment,
        sips.infrastructure_contribution AS infrastructure_contribution,
        sips.equipment_contribution AS equipment_contribution,
        sips.training_contribution AS training_contribution,
        sips.industry_contribution AS industry_contribution,
        sips.government_contribution AS government_contribution,
        sips.approval_date AS approval_date,
        sips.remarks AS remarks
    FROM sips
    LEFT JOIN clusters ON clusters.id = sips.cluster_id
    LEFT JOIN aips ON aips.id = sips.aip_id`;

function mapSipRow(row: SipRow): Sip {
    return {
        id: row.id,
        status: row.status,
        cluster: row.cluster_id === null ? null : { id: row.cluster_id, name: row.cluster_name ?? "" },
        aip: row.aip_id === null ? null : { id: row.aip_id, name: row.aip_name ?? "" },
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

export async function listSips(filters: SipListFilters): Promise<Sip[]> {
    const rows = await prisma.$queryRaw<SipRow[]>`
        ${SIP_SELECT}
        ORDER BY sips.id
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`;
    return rows.map(mapSipRow);
}

export async function countSips(): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM sips`;
    return rows[0]?.total ?? 0;
}

export async function getSipById(
    id: number,
    db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Sip | null> {
    const rows = await db.$queryRaw<SipRow[]>(Prisma.sql`${SIP_SELECT} WHERE sips.id = ${id}`);
    return rows[0] ? mapSipRow(rows[0]) : null;
}

export async function getSipByIdForTransaction(id: number, tx: Prisma.TransactionClient): Promise<Sip | null> {
    return getSipById(id, tx);
}

export async function listClusterSips(clusterId: number): Promise<Sip[]> {
    const rows = await prisma.$queryRaw<SipRow[]>`
        ${SIP_SELECT}
        WHERE sips.cluster_id = ${clusterId}
        ORDER BY sips.id`;
    return rows.map(mapSipRow);
}

export async function createSip(input: CreateSipInput, tx: Prisma.TransactionClient): Promise<Sip> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO sips (status, cluster_id, aip_id)
        VALUES (${input.status}, ${input.cluster_id ?? null}, ${input.aip_id ?? null})
        RETURNING id`);
    const item = await getSipByIdForTransaction(rows[0].id, tx);
    if (!item) throw new Error("Created SIP could not be reloaded");
    return item;
}

export async function updateSip(
    id: number,
    input: UpdateSipInput,
    tx: Prisma.TransactionClient,
): Promise<Sip | null> {
    const updates: Prisma.Sql[] = [];
    if (input.status !== undefined) updates.push(Prisma.sql`status = ${input.status}`);
    if (input.cluster_id !== undefined) updates.push(Prisma.sql`cluster_id = ${input.cluster_id}`);
    if (input.aip_id !== undefined) updates.push(Prisma.sql`aip_id = ${input.aip_id}`);
    if (updates.length === 0) return getSipByIdForTransaction(id, tx);

    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        UPDATE sips SET ${Prisma.join(updates, ", ")}
        WHERE id = ${id}
        RETURNING id`);
    return rows[0] ? getSipByIdForTransaction(id, tx) : null;
}

/** Registry deletion is limited to DRAFT records; workflow records are retained. */
export async function deleteDraftSip(id: number, tx: Prisma.TransactionClient): Promise<boolean> {
    const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
        DELETE FROM sips
        WHERE id = ${id} AND status = 'DRAFT'
        RETURNING id`);
    return rows.length > 0;
}
