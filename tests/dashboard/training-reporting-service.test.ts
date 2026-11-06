import assert from "node:assert/strict";
import test from "node:test";
import * as dashboardRepository from "../../src/modules/dashboard/dashboard.repository";
import { getTrainingCapacityReporting } from "../../src/modules/dashboard/dashboard.service";
import type {
    TrainingCapacityByCluster,
    TrainingCapacityScope,
} from "../../src/modules/dashboard/dashboard.types";

const repository = dashboardRepository as unknown as {
    getTrainingCapacityState: () => Promise<TrainingCapacityScope>;
    getTrainingCapacityByCluster: () => Promise<TrainingCapacityByCluster[]>;
};

function state(
    studentCapacity: number | null,
    overrides: Partial<TrainingCapacityScope> = {},
): TrainingCapacityScope {
    return {
        student_capacity: studentCapacity,
        coverage: {
            total_itis: 5,
            itis_with_capacity: studentCapacity === null ? 0 : 5,
            itis_without_capacity: studentCapacity === null ? 5 : 0,
            itis_without_reportable_cluster: 1,
        },
        without_reportable_cluster: {
            student_capacity: null,
            coverage: {
                total_itis: 1,
                itis_with_capacity: 0,
                itis_without_capacity: 1,
                itis_without_reportable_cluster: 1,
            },
        },
        ...overrides,
    };
}

test("training reporting reconciles cluster totals with capacity outside reportable clusters", async () => {
    const originalState = repository.getTrainingCapacityState;
    const originalClusters = repository.getTrainingCapacityByCluster;

    repository.getTrainingCapacityState = async () => state(125, {
        coverage: {
            total_itis: 5,
            itis_with_capacity: 5,
            itis_without_capacity: 0,
            itis_without_reportable_cluster: 1,
        },
        without_reportable_cluster: {
            student_capacity: 25,
            coverage: {
                total_itis: 1,
                itis_with_capacity: 1,
                itis_without_capacity: 0,
                itis_without_reportable_cluster: 1,
            },
        },
    });
    repository.getTrainingCapacityByCluster = async () => [
        {
            cluster_id: 10,
            cluster_name: "Cluster A",
            student_capacity: 60,
            coverage: { total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 },
        },
        {
            cluster_id: 11,
            cluster_name: "Cluster B",
            student_capacity: 40,
            coverage: { total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 },
        },
    ];

    try {
        const result = await getTrainingCapacityReporting();

        assert.equal(result.scope, "STATE");
        assert.equal(result.metric.metric_id, "academic.student_capacity");
        assert.equal(result.metric.availability, "AVAILABLE");
        assert.equal(result.metric.value, 125);
        assert.equal(
            result.by_cluster.reduce((sum, cluster) => sum + (cluster.student_capacity ?? 0), 0)
                + (result.without_reportable_cluster.student_capacity ?? 0),
            result.metric.value,
            "cluster capacity plus capacity without a reportable cluster must reconcile to the state total",
        );
        assert.equal(
            result.by_cluster.reduce((sum, cluster) => sum + cluster.coverage.total_itis, 0)
                + result.without_reportable_cluster.coverage.total_itis,
            result.coverage.total_itis,
        );
    } finally {
        repository.getTrainingCapacityState = originalState;
        repository.getTrainingCapacityByCluster = originalClusters;
    }
});

test("training reporting keeps unavailable capacity distinct from a genuine zero", async () => {
    const originalState = repository.getTrainingCapacityState;
    const originalClusters = repository.getTrainingCapacityByCluster;

    try {
        repository.getTrainingCapacityState = async () => state(null);
        repository.getTrainingCapacityByCluster = async () => [
            {
                cluster_id: 10,
                cluster_name: "Cluster A",
                student_capacity: null,
                coverage: { total_itis: 2, itis_with_capacity: 0, itis_without_capacity: 2 },
            },
        ];

        const unavailable = await getTrainingCapacityReporting();
        assert.equal(unavailable.metric.value, null);
        assert.equal(unavailable.metric.availability, "NOT_AVAILABLE");

        repository.getTrainingCapacityState = async () => state(0, {
            coverage: {
                total_itis: 2,
                itis_with_capacity: 2,
                itis_without_capacity: 0,
                itis_without_reportable_cluster: 0,
            },
            without_reportable_cluster: {
                student_capacity: 0,
                coverage: {
                    total_itis: 0,
                    itis_with_capacity: 0,
                    itis_without_capacity: 0,
                    itis_without_reportable_cluster: 0,
                },
            },
        });
        repository.getTrainingCapacityByCluster = async () => [
            {
                cluster_id: 10,
                cluster_name: "Cluster A",
                student_capacity: 0,
                coverage: { total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 },
            },
        ];

        const zero = await getTrainingCapacityReporting();
        assert.equal(zero.metric.value, 0);
        assert.equal(zero.metric.availability, "AVAILABLE");
    } finally {
        repository.getTrainingCapacityState = originalState;
        repository.getTrainingCapacityByCluster = originalClusters;
    }
});

test("training reporting does not invent an as-of date or reporting-period boundary", async () => {
    const originalState = repository.getTrainingCapacityState;
    const originalClusters = repository.getTrainingCapacityByCluster;

    repository.getTrainingCapacityState = async () => state(0);
    repository.getTrainingCapacityByCluster = async () => [];

    try {
        const result = await getTrainingCapacityReporting();
        assert.deepEqual(result.reporting_context, {
            data_as_of: null,
            reporting_period: null,
            source_freshness: "NOT_TRACKED",
        });
    } finally {
        repository.getTrainingCapacityState = originalState;
        repository.getTrainingCapacityByCluster = originalClusters;
    }
});
