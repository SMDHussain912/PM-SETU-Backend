import { ApiError } from "../../utils/response";
import * as dashboardRepository from "./dashboard.repository";
import type {
    ClusterDashboardResponse,
    ClustersDashboardResponse,
    FinanceMetrics,
    PlacementMetrics,
    StateMetrics,
    TrainingMetrics,
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
    return { ...metrics, by_cluster: byCluster };
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
