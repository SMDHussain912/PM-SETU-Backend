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
    /**
     * Official finance-progress measures are unavailable until an approved
     * Finance/FMS source is connected. Never substitute SIP proposals for them.
     */
    official_financial_progress: {
        status: "SOURCE_NOT_CONNECTED";
        approved_outlay: null;
        funds_released: null;
        expenditure: null;
        utilisation_percentage: null;
        balance: null;
    };
    total_investment: number;
    total_sip_proposed: number;
    total_sip_infrastructure: number;
    total_sip_equipment: number;
    total_sip_training: number;
    total_sip_industry: number;
    total_sip_government: number;
    by_cluster: FinanceByCluster[];
}

export interface TrainingByIti {
    iti_id: number;
    iti_code: string;
    iti_name: string;
    type: string;
    district: string;
    cluster_id: number | null;
    cluster_name: string | null;
    student_capacity: number | null;
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


export type DashboardMetricAvailability =
    | "AVAILABLE"
    | "PARTIAL"
    | "NOT_AVAILABLE"
    | "SOURCE_NOT_CONNECTED"
    | "DEFINITION_PENDING";

export interface DashboardMetricContract {
    metric_id: string;
    label: string;
    classification: string;
    unit: "COUNT" | "CURRENCY_AMOUNT" | "PERCENTAGE";
    source: string | null;
    availability: DashboardMetricAvailability;
    aggregation_levels: Array<"STATE" | "CLUSTER" | "ITI" | "PROJECT">;
    notes: string;
    official_kpi_code: "FIN-01" | "FIN-02" | "FIN-03" | "FIN-04" | "FIN-05" | null;
}

export interface DashboardContractResponse {
    contract_version: "1.0.0";
    generated_at: string;
    reporting_context: {
        /** Null means source data does not currently publish an as-of timestamp. */
        data_as_of: string | null;
        /** Null means a reporting period has not been configured for this catalogue. */
        reporting_period: null;
        source_freshness: "NOT_TRACKED";
    };
    metrics: DashboardMetricContract[];
}
