import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/config/database";
import { getTrainingCapacityReporting } from "../../src/modules/dashboard/dashboard.service";

type Query = { sql?: string };
type StateRow = {
    student_capacity: number | null;
    total_itis: number;
    itis_with_capacity: number;
    itis_without_capacity: number;
    itis_without_reportable_cluster: number;
    student_capacity_without_reportable_cluster: number | null;
    unassigned_itis_with_capacity: number;
    unassigned_itis_without_capacity: number;
};
type ClusterRow = {
    cluster_id: number;
    cluster_name: string;
    student_capacity: number | null;
    total_itis: number;
    itis_with_capacity: number;
    itis_without_capacity: number;
};

const client = prisma as unknown as {
    $queryRaw: (query: Query) => Promise<unknown[]>;
};

function stateRow(studentCapacity: number | null, overrides: Partial<StateRow> = {}): StateRow {
    return {
        student_capacity: studentCapacity,
        total_itis: 5,
        itis_with_capacity: studentCapacity === null ? 0 : 5,
        itis_without_capacity: studentCapacity === null ? 5 : 0,
        itis_without_reportable_cluster: 1,
        student_capacity_without_reportable_cluster: null,
        unassigned_itis_with_capacity: 0,
        unassigned_itis_without_capacity: 1,
        ...overrides,
    };
}

function installQueryMock(state: StateRow, clusters: ClusterRow[]): () => void {
    const original = client.$queryRaw;
    client.$queryRaw = async (query) => {
        const sql = query.sql ?? "";
        if (/student_capacity_without_reportable_cluster/i.test(sql)) return [state];
        if (/cluster_id/i.test(sql) && /LEFT JOIN itis/i.test(sql)) return clusters;
        throw new Error(`Unexpected dashboard reporting SQL: ${sql}`);
    };
    return () => { client.$queryRaw = original; };
}

test("training reporting reconciles cluster totals with capacity outside reportable clusters", async () => {
    const restore = installQueryMock(
        stateRow(125, {
            total_itis: 5,
            itis_with_capacity: 5,
            itis_without_capacity: 0,
            itis_without_reportable_cluster: 1,
            student_capacity_without_reportable_cluster: 25,
            unassigned_itis_with_capacity: 1,
            unassigned_itis_without_capacity: 0,
        }),
        [
            { cluster_id: 10, cluster_name: "Cluster A", student_capacity: 60, total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 },
            { cluster_id: 11, cluster_name: "Cluster B", student_capacity: 40, total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 },
        ],
    );
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
    } finally { restore(); }
});

test("training reporting keeps unavailable capacity distinct from a genuine zero", async () => {
    const restoreUnavailable = installQueryMock(
        stateRow(null),
        [{ cluster_id: 10, cluster_name: "Cluster A", student_capacity: null, total_itis: 2, itis_with_capacity: 0, itis_without_capacity: 2 }],
    );
    try {
        const unavailable = await getTrainingCapacityReporting();
        assert.equal(unavailable.metric.value, null);
        assert.equal(unavailable.metric.availability, "NOT_AVAILABLE");
    } finally { restoreUnavailable(); }

    const restoreZero = installQueryMock(
        stateRow(0, {
            total_itis: 2,
            itis_with_capacity: 2,
            itis_without_capacity: 0,
            itis_without_reportable_cluster: 0,
            student_capacity_without_reportable_cluster: 0,
            unassigned_itis_with_capacity: 0,
            unassigned_itis_without_capacity: 0,
        }),
        [{ cluster_id: 10, cluster_name: "Cluster A", student_capacity: 0, total_itis: 2, itis_with_capacity: 2, itis_without_capacity: 0 }],
    );
    try {
        const zero = await getTrainingCapacityReporting();
        assert.equal(zero.metric.value, 0);
        assert.equal(zero.metric.availability, "AVAILABLE");
    } finally { restoreZero(); }
});

test("training reporting does not invent an as-of date or reporting-period boundary", async () => {
    const restore = installQueryMock(stateRow(0), []);
    try {
        const result = await getTrainingCapacityReporting();
        assert.deepEqual(result.reporting_context, {
            data_as_of: null,
            reporting_period: null,
            source_freshness: "NOT_TRACKED",
        });
    } finally { restore(); }
});
