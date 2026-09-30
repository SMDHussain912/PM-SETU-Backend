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
} from "./dashboard.types";

/**
 * Dashboard module — database access layer.
 *
 * The statements below mirror sql/dashboard/dashboard_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/dashboard/dashboard_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake dashboard records.
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
                (SELECT COUNT(*)::int FROM clusters) AS clusters,
                (SELECT COUNT(*)::int FROM itis WHERE type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis WHERE type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips) AS aips,
                (SELECT COUNT(*)::int FROM spvs) AS spvs,
                (SELECT COUNT(*)::int FROM sips WHERE status = 'SUBMITTED') AS sips_submitted,
                (SELECT COUNT(*)::int FROM sips WHERE status = 'APPROVED') AS sips_approved,
                (SELECT COALESCE(SUM(investment_amount), 0)::double precision FROM aips) AS investment`,
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
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips a WHERE a.cluster_id = c.id) AS aips,
                (SELECT COUNT(*)::int FROM spvs s WHERE s.cluster_id = c.id) AS spvs,
                (SELECT COALESCE(SUM(a.investment_amount), 0)::double precision FROM aips a WHERE a.cluster_id = c.id) AS investment
            FROM clusters c
            ORDER BY c.name`,
    );
    return rows;
}

export async function getClusterById(id: number): Promise<ClusterRow | null> {
    const rows = await prisma.$queryRaw<ClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id, c.name, c.district, c.sector,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.type = 'HUB') AS hub_itis,
                (SELECT COUNT(*)::int FROM itis i WHERE i.cluster_id = c.id AND i.type = 'SPOKE') AS spoke_itis,
                (SELECT COUNT(*)::int FROM aips a WHERE a.cluster_id = c.id) AS aips,
                (SELECT COUNT(*)::int FROM spvs s WHERE s.cluster_id = c.id) AS spvs,
                (SELECT COALESCE(SUM(a.investment_amount), 0)::double precision FROM aips a WHERE a.cluster_id = c.id) AS investment
            FROM clusters c
            WHERE c.id = ${id}`,
    );
    return rows[0] ?? null;
}

export async function getClusterItis(clusterId: number): Promise<ClusterDashboardIti[]> {
    const rows = await prisma.$queryRaw<ClusterDashboardIti[]>(
        Prisma.sql`
            SELECT
                id, iti_code, iti_name, type, district
            FROM itis
            WHERE cluster_id = ${clusterId}
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
            WHERE cluster_id = ${clusterId}
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
                (SELECT COUNT(*)::int FROM sips WHERE cluster_id = ${clusterId} AND status = 'SUBMITTED') AS sips_submitted,
                (SELECT COUNT(*)::int FROM sips WHERE cluster_id = ${clusterId} AND status = 'APPROVED') AS sips_approved`,
    );
    return rows[0] ?? { sips_submitted: 0, sips_approved: 0 };
}

export async function getFundingMetrics(): Promise<FinanceMetrics> {
    const rows = await prisma.$queryRaw<FinanceRow[]>(
        Prisma.sql`
            SELECT
                (SELECT COALESCE(SUM(investment_amount), 0)::double precision FROM aips) AS total_investment,
                (SELECT COALESCE(SUM(proposed_investment), 0)::double precision FROM sips) AS total_sip_proposed,
                (SELECT COALESCE(SUM(infrastructure_contribution), 0)::double precision FROM sips) AS total_sip_infrastructure,
                (SELECT COALESCE(SUM(equipment_contribution), 0)::double precision FROM sips) AS total_sip_equipment,
                (SELECT COALESCE(SUM(training_contribution), 0)::double precision FROM sips) AS total_sip_training,
                (SELECT COALESCE(SUM(industry_contribution), 0)::double precision FROM sips) AS total_sip_industry,
                (SELECT COALESCE(SUM(government_contribution), 0)::double precision FROM sips) AS total_sip_government`,
    );
    return { ...rows[0], by_cluster: [] };
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
                FROM aips GROUP BY cluster_id
            ) a ON a.cluster_id = c.id
            LEFT JOIN (
                SELECT cluster_id, SUM(proposed_investment) AS sip_proposed
                FROM sips GROUP BY cluster_id
            ) s ON s.cluster_id = c.id
            ORDER BY c.name`,
    );
    return rows;
}

export async function getTrainingMetrics(): Promise<TrainingRow> {
    const rows = await prisma.$queryRaw<TrainingRow[]>(
        Prisma.sql`
            SELECT
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis) AS total_student_capacity,
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis WHERE type = 'HUB') AS hub_capacity,
                (SELECT COALESCE(SUM(student_strength), 0)::int FROM itis WHERE type = 'SPOKE') AS spoke_capacity`,
    );
    return rows[0];
}

export async function getTrainingByCluster(): Promise<TrainingByCluster[]> {
    const rows = await prisma.$queryRaw<TrainingClusterRow[]>(
        Prisma.sql`
            SELECT
                c.id AS cluster_id, c.name AS cluster_name,
                COALESCE(SUM(i.student_strength), 0)::int AS student_capacity,
                COUNT(i.id)::int AS iti_count
            FROM clusters c
            LEFT JOIN itis i ON i.cluster_id = c.id
            GROUP BY c.id, c.name
            ORDER BY c.name`,
    );
    return rows;
}
