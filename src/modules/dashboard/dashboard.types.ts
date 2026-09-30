/**
 * Dashboard module — public types.
 *
 * All response shapes are INFERRED from the existing PM SETU data contracts
 * and are NOT verifiable in RoadMap.md §16 (which defines no response fields).
 * They are marked TO CONFIRM pending NIC-document verification.
 *
 * CRITICAL DATA GAPS:
 *   · trainees: No source table established — returns null
 *   · industries_engaged: No source table established — returns null
 *   · placements: No source table established — returns informative message
 *   · training: Only student_strength (capacity) available, NOT training metrics
 */

export interface StateMetrics {
    clusters: number;
    hub_itis: number;
    spoke_itis: number;
    aips: number;
    spvs: number;
    sips_submitted: number;
    sips_approved: number;
    investment: number;
    trainees: number | null;
    industries_engaged: number | null;
}

export interface ClusterSummary {
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

export interface ClustersDashboardResponse {
    clusters: ClusterSummary[];
    total: number;
}

export interface ClusterDashboardIti {
    id: number;
    iti_code: string;
    iti_name: string;
    type: string;
    district: string;
}

export interface ClusterDashboardAip {
    id: number;
    name: string;
    sector: string;
    status: string;
    investment_amount: number | null;
}

export interface ClusterDashboardResponse {
    cluster: {
        id: number;
        name: string;
        district: string;
        sector: string;
    };
    metrics: {
        hub_itis: number;
        spoke_itis: number;
        total_itis: number;
        aips: number;
        spvs: number;
        sips_submitted: number;
        sips_approved: number;
        investment: number;
    };
    itis: ClusterDashboardIti[];
    aips: ClusterDashboardAip[];
}

export interface FinanceByCluster {
    cluster_id: number;
    cluster_name: string;
    investment: number;
    sip_proposed: number;
}

export interface FinanceMetrics {
    total_investment: number;
    total_sip_proposed: number;
    total_sip_infrastructure: number;
    total_sip_equipment: number;
    total_sip_training: number;
    total_sip_industry: number;
    total_sip_government: number;
    by_cluster: FinanceByCluster[];
}

export interface TrainingByCluster {
    cluster_id: number;
    cluster_name: string;
    student_capacity: number;
    iti_count: number;
}

export interface TrainingMetrics {
    total_student_capacity: number;
    by_cluster: TrainingByCluster[];
    by_iti_type: {
        hub_capacity: number;
        spoke_capacity: number;
    };
}

export interface PlacementMetrics {
    message: string;
}
