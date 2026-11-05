import { getDashboardContract } from "./dashboard.contract";
import { ApiError } from "../../utils/response";
import * as dashboardRepository from "./dashboard.repository";
import type {
    ClusterDashboardResponse,
    ClustersDashboardResponse,
    FinanceMetrics,
    PlacementMetrics,
    StateMetrics,
    TrainingMetrics,
    TrainingCapacityReporting,
} from "./dashboard.types";

/**
 * Dashboard module — service layer.
 *
 * Owns aggregation orchestration and delegates all data access to the
 * repository. No SQL, no business logic.
 */

export async function getStateMetrics(): Promise<StateMetrics> {
    return dashboardRepository.getStateMetrics();
}

export async function getClustersDashboard(): Promise<ClustersDashboardResponse> {
    const clusters = await dashboardRepository.getClusterSummaries();
    return { clusters, total: clusters.length };
}

export async function getClusterDashboard(id: number): Promise<ClusterDashboardResponse> {
    const cluster = await dashboardRepository.getClusterById(id);
    if (!cluster) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Cluster not found",
        });
    }

    const [itis, aips] = await Promise.all([
        dashboardRepository.getClusterItis(id),
        dashboardRepository.getClusterAips(id),
    ]);

    const sipsSubmission = await dashboardRepository.getClusterSipCounts(id);

    return {
        cluster: {
            id: cluster.id,
            name: cluster.name,
            district: cluster.district,
            sector: cluster.sector,
        },
        metrics: {
            hub_itis: cluster.hub_itis,
            spoke_itis: cluster.spoke_itis,
            total_itis: cluster.hub_itis + cluster.spoke_itis,
            aips: cluster.aips,
            spvs: cluster.spvs,
            sips_submitted: sipsSubmission.sips_submitted,
            sips_approved: sipsSubmission.sips_approved,
            investment: cluster.investment,
        },
        itis,
        aips,
    };
}

export async function getFinanceMetrics(): Promise<FinanceMetrics> {
    const metrics = await dashboardRepository.getFundingMetrics();
    const byCluster = await dashboardRepository.getFinanceByCluster();
    return {
        ...metrics,
        by_cluster: byCluster,
        // SIP proposals and AIP registry investment are not authoritative
        // outlay/release/expenditure records. Keep official KPIs unavailable
        // until the approved Finance/FMS source and formulas are connected.
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

export async function getTrainingCapacityReporting(): Promise<TrainingCapacityReporting> {
    const [state, byCluster] = await Promise.all([
        dashboardRepository.getTrainingCapacityState(),
        dashboardRepository.getTrainingCapacityByCluster(),
    ]);

    return {
        scope: "STATE",
        metric: {
            metric_id: "academic.student_capacity",
            classification: "CAPACITY",
            unit: "COUNT",
            availability: state.student_capacity === null ? "NOT_AVAILABLE" : "AVAILABLE",
            value: state.student_capacity,
        },
        coverage: state.coverage,
        by_cluster: byCluster,
        reporting_context: {
            data_as_of: null,
            reporting_period: null,
            source_freshness: "NOT_TRACKED",
        },
    };
}

export async function getTrainingByIti(id: number) {
    const iti = await dashboardRepository.getTrainingByIti(id);
    if (!iti) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "ITI not found",
        });
    }
    return {
        scope: "ITI" as const,
        metric: {
            metric_id: "academic.student_capacity",
            classification: "CAPACITY",
            unit: "COUNT" as const,
            availability: iti.student_capacity === null ? "NOT_AVAILABLE" as const : "AVAILABLE" as const,
            value: iti.student_capacity,
        },
        reporting_context: {
            data_as_of: null,
            reporting_period: null,
            source_freshness: "NOT_TRACKED" as const,
        },
        iti,
    };
}

export async function getTrainingMetrics(): Promise<TrainingMetrics> {
    const training = await dashboardRepository.getTrainingMetrics();
    const byCluster = await dashboardRepository.getTrainingByCluster();
    return {
        total_student_capacity: training.total_student_capacity,
        by_cluster: byCluster,
        by_iti_type: {
            hub_capacity: training.hub_capacity,
            spoke_capacity: training.spoke_capacity,
        },
    };
}

export async function getPlacementMetrics(): Promise<PlacementMetrics> {
    // ⚠ No source table established for placements — return informative message
    return {
        message: "Placement data source not yet established",
    };
}


export function getDashboardReportingContract() {
    return getDashboardContract();
}
