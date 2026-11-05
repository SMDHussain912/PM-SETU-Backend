import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
    ClusterDashboardAip,
    ClusterDashboardIti,
    ClusterSummary,
    FinanceByCluster,
    FinanceMetrics,
    StateMetrics,
    TrainingByCluster,
    TrainingByIti,
    TrainingCapacityByCluster,
    TrainingCapacityScope,
} from "./dashboard.types";

/**
 * Dashboard module — database access layer.
 *
 * The statements below mirror sql/dashboard/dashboard_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * The repository contains Prisma models and migrations for these tables.
 * This source review does not certify that migrations are deployed or that
 * production data has been reconciled. Registry KPIs exclude is_sample rows
 * and deliberately do not apply unapproved active/approved status filters.
 */

interface StateRow {
    clusters: number;
    hub_itis: number;
    spoke_itis: number;
    aips: number;
    spvs: number;
    sips_submitted: number;
    sips_approved: number;
    investment: number;
}

interface ClusterRow {
    id: number;
    name: string;
    district: string;
    sector: string;
    hub_itis: number;
    spoke_itis: number;
    aips: number;
    spvs: number;
    investment: number;
}

interface FinanceRow {
    total_investment: number;
    total_sip_proposed: number;
    total_sip_infrastructure: number;
    total_sip_equipment: number;
    total_sip_training: number;
    total_sip_industry: number;
    total_sip_government: number;
}

interface TrainingRow {
    total_student_capacity: number;
    hub_capacity: number;
    spoke_capacity: number;
}

interface TrainingClusterRow {
    cluster_id: number;
    cluster_name: string;
    student_capacity: number;
    iti_count: number;
}

interface FinanceClusterRow {
    cluster_id: number;
    cluster_name: string;
    investment: number;
    sip_proposed: number;
}

export async function getStateMetrics(): Promise<StateMetrics> {
    const rows = await prisma.$queryRaw<StateRow[]>(
        Prisma.sql`
            SELECT
                (SELECT COUNT(*)::int FROM clusters WHERE is_sample = FALSE) AS clusters,
                (SELECT COUNT(*)::int FROM itis WHERE is_sample = FALSE AND type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis WHERE is_sample = FALSE AND type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips WHERE is_sample = FALSE) AS aips,
                (SELECT COUNT(*)::int FROM spvs WHERE is_sample = FALSE) AS spvs,
                (SELECT COUNT(*)::int FROM sips WHERE is_sample = FALSE AND status = 'SUBMITTED') AS sips_submitted,
                (SELECT COUNT(*)::int FROM sips WHERE is_sample = FALSE AND status = 'APPROVED') AS sips_approved,
                (SELECT COALESCE(SUM(investment_amount), 0)::double precision FROM aips WHERE is_sample = FALSE) AS investment`,
    );
    return {
        ...rows[0],
        // ⚠ No source tables established for these metrics — return null
        trainees: null,
        industries_engaged: null,
    };
}

export async function getClusterSummaries(): Promise<ClusterSummary[]> {
    const rows = await prisma.$queryRaw<ClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id, c.name, c.district, c.sector,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.is_sample = FALSE AND i.type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.is_sample = FALSE AND i.type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips a WHERE a.cluster_id = c.id AND a.is_sample = FALSE) AS aips,
                (SELECT COUNT(*)::int FROM spvs s WHERE s.cluster_id = c.id AND s.is_sample = FALSE) AS spvs,
                (SELECT COALESCE(SUM(a.investment_amount), 0)::double precision FROM aips a WHERE a.cluster_id = c.id AND a.is_sample = FALSE) AS investment
            FROM clusters c
            WHERE c.is_sample = FALSE
            ORDER BY c.name`,
    );
    return rows;
}

export async function getClusterById(id: number): Promise<ClusterRow | null> {
    const rows = await prisma.$queryRaw<ClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id, c.name, c.district, c.sector,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.is_sample = FALSE AND i.type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.is_sample = FALSE AND i.type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips a WHERE a.cluster_id = c.id AND a.is_sample = FALSE) AS aips,
                (SELECT COUNT(*)::int FROM spvs s WHERE s.cluster_id = c.id AND s.is_sample = FALSE) AS spvs,
                (SELECT COALESCE(SUM(a.investment_amount), 0)::double precision FROM aips a WHERE a.cluster_id = c.id AND a.is_sample = FALSE) AS investment
            FROM clusters c
            WHERE c.id = ${id} AND c.is_sample = FALSE`,
    );
    return rows[0] ?? null;
}

export async function getClusterItis(clusterId: number): Promise<ClusterDashboardIti[]> {
    const rows = await prisma.$queryRaw<ClusterDashboardIti[]>(
        Prisma.sql`
            SELECT
                id, iti_code, iti_name, type, district
            FROM itis
            WHERE cluster_id = ${clusterId} AND is_sample = FALSE
            ORDER BY iti_name`,
    );
    return rows;
}

export async function getClusterAips(clusterId: number): Promise<ClusterDashboardAip[]> {
    const rows = await prisma.$queryRaw<ClusterDashboardAip[]>(
        Prisma.sql`
            SELECT
                id, name, sector, status, investment_amount
            FROM aips
            WHERE cluster_id = ${clusterId} AND is_sample = FALSE
            ORDER BY name`,
    );
    return rows;
}

export interface ClusterSipCounts {
    sips_submitted: number;
    sips_approved: number;
}

export async function getClusterSipCounts(clusterId: number): Promise<ClusterSipCounts> {
    const rows = await prisma.$queryRaw<ClusterSipCounts[]>(
        Prisma.sql`
            SELECT
                (SELECT COUNT(*)::int FROM sips WHERE cluster_id = ${clusterId} AND is_sample = FALSE AND status = 'SUBMITTED') AS sips_submitted,
                (SELECT COUNT(*)::int FROM sips WHERE cluster_id = ${clusterId} AND is_sample = FALSE AND status = 'APPROVED') AS sips_approved`,
    );
    return rows[0] ?? { sips_submitted: 0, sips_approved: 0 };
}

export async function getFundingMetrics(): Promise<FinanceMetrics> {
    const rows = await prisma.$queryRaw<FinanceRow[]>(
        Prisma.sql`
            SELECT
                (SELECT COALESCE(SUM(investment_amount), 0)::double precision FROM aips WHERE is_sample = FALSE) AS total_investment,
                (SELECT COALESCE(SUM(proposed_investment), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_proposed,
                (SELECT COALESCE(SUM(infrastructure_contribution), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_infrastructure,
                (SELECT COALESCE(SUM(equipment_contribution), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_equipment,
                (SELECT COALESCE(SUM(training_contribution), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_training,
                (SELECT COALESCE(SUM(industry_contribution), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_industry,
                (SELECT COALESCE(SUM(government_contribution), 0)::double precision FROM sips WHERE is_sample = FALSE) AS total_sip_government`,
    );
    return {
        ...rows[0],
        by_cluster: [],
        // Official financial KPIs remain unavailable until an approved Finance/FMS source is connected.
        // Do not substitute AIP/SIP planning indicators for approved outlay, releases, or expenditure.
        official_financial_progress: {
            status: "SOURCE_NOT_CONNECTED",
            approved_outlay: null,
            funds_released: null,
            expenditure: null,
            utilisation_percentage: null,
            balance: null,
        },
    };
}

export async function getFinanceByCluster(): Promise<FinanceByCluster[]> {
    const rows = await prisma.$queryRaw<FinanceClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id AS cluster_id, c.name AS cluster_name,
                COALESCE(a.investment, 0)::double precision AS investment,
                COALESCE(s.sip_proposed, 0)::double precision AS sip_proposed
            FROM clusters c
            LEFT JOIN (
                SELECT cluster_id, SUM(investment_amount) AS investment
                FROM aips WHERE is_sample = FALSE GROUP BY cluster_id
            ) a ON a.cluster_id = c.id
            LEFT JOIN (
                SELECT cluster_id, SUM(proposed_investment) AS sip_proposed
                FROM sips WHERE is_sample = FALSE GROUP BY cluster_id
            ) s ON s.cluster_id = c.id
            WHERE c.is_sample = FALSE
            ORDER BY c.name`,
    );
    return rows;
}

export async function getTrainingMetrics(): Promise<TrainingRow> {
    const rows = await prisma.$queryRaw<TrainingRow[]>(
        Prisma.sql`
            SELECT
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis WHERE is_sample = FALSE) AS total_student_capacity,
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis WHERE is_sample = FALSE AND type = 'HUB') AS hub_capacity,
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis WHERE is_sample = FALSE AND type = 'SPOKE') AS spoke_capacity`,
    );
    return rows[0];
}

export async function getTrainingCapacityState(): Promise<TrainingCapacityScope> {
    const rows = await prisma.$queryRaw<Array<{
        student_capacity: number | null;
        total_itis: number;
        itis_with_capacity: number;
        itis_without_capacity: number;
        unassigned_itis: number;
    }>>(
        Prisma.sql`
            SELECT
                SUM(student_strength)::int AS student_capacity,
                COUNT(*)::int AS total_itis,
                COUNT(student_strength)::int AS itis_with_capacity,
                COUNT(*) FILTER (WHERE student_strength IS NULL)::int AS itis_without_capacity,
                COUNT(*) FILTER (WHERE cluster_id IS NULL)::int AS unassigned_itis
            FROM itis
            WHERE is_sample = FALSE`,
    );
    const row = rows[0];
    return {
        student_capacity: row?.student_capacity ?? null,
        coverage: {
            total_itis: row?.total_itis ?? 0,
            itis_with_capacity: row?.itis_with_capacity ?? 0,
            itis_without_capacity: row?.itis_without_capacity ?? 0,
            unassigned_itis: row?.unassigned_itis ?? 0,
        },
    };
}

export async function getTrainingCapacityByCluster(): Promise<TrainingCapacityByCluster[]> {
    return prisma.$queryRaw<TrainingCapacityByCluster[]>(
        Prisma.sql`
            SELECT
                c.id AS cluster_id,
                c.name AS cluster_name,
                SUM(i.student_strength)::int AS student_capacity,
                COUNT(i.id)::int AS total_itis,
                COUNT(i.student_strength)::int AS itis_with_capacity,
                COUNT(i.id) FILTER (WHERE i.student_strength IS NULL)::int AS itis_without_capacity
            FROM clusters c
            LEFT JOIN itis i ON i.cluster_id = c.id AND i.is_sample = FALSE
            WHERE c.is_sample = FALSE
            GROUP BY c.id, c.name
            ORDER BY c.name`,
    );
}

export async function getTrainingByIti(id: number): Promise<TrainingByIti | null> {
    const rows = await prisma.$queryRaw<TrainingByIti[]>(
        Prisma.sql`
            SELECT
                i.id AS iti_id, i.iti_code, i.iti_name, i.type, i.district,
                i.cluster_id,
                c.name AS cluster_name,
                i.student_strength AS student_capacity
            FROM itis i
            LEFT JOIN clusters c ON c.id = i.cluster_id AND c.is_sample = FALSE
            WHERE i.id = ${id} AND i.is_sample = FALSE
            LIMIT 1`,
    );
    return rows[0] ?? null;
}

export async function getTrainingByCluster(): Promise<TrainingByCluster[]> {
    const rows = await prisma.$queryRaw<TrainingClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id AS cluster_id, c.name AS cluster_name,
                COALESCE(SUM(i.student_strength), 0)::int AS student_capacity,
                COUNT(i.id)::int AS iti_count
            FROM clusters c
            LEFT JOIN itis i ON i.cluster_id = c.id AND i.is_sample = FALSE
            WHERE c.is_sample = FALSE
            GROUP BY c.id, c.name
            ORDER BY c.name`,
    );
    return rows;
}
