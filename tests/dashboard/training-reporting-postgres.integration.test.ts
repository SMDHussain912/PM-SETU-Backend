import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/config/database";
import { getTrainingCapacityReporting } from "../src/modules/dashboard/dashboard.service";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL training reporting reconciles real, sample, unassigned and null-capacity rows", {
    skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
    if (!databaseUrl) return;
    assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");
    assertDedicatedTestDatabaseUrl(process.env.TEST_DATABASE_URL, "TEST_DATABASE_URL");
    assert.equal(new URL(process.env.TEST_DATABASE_URL!).host, new URL(databaseUrl).host);
    assert.equal(new URL(process.env.TEST_DATABASE_URL!).pathname, new URL(databaseUrl).pathname);

    const suffix = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const createdClusterIds: number[] = [];
    const createdItiIds: number[] = [];

    try {
        const clusterA = await prisma.cluster.create({
            data: { name: `REPORT_TEST_A_${suffix}`, district: "TEST", sector: "TEST" },
        });
        createdClusterIds.push(clusterA.id);
        const clusterB = await prisma.cluster.create({
            data: { name: `REPORT_TEST_B_${suffix}`, district: "TEST", sector: "TEST" },
        });
        createdClusterIds.push(clusterB.id);
        const sampleCluster = await prisma.cluster.create({
            data: { name: `REPORT_TEST_SAMPLE_${suffix}`, district: "TEST", sector: "TEST", isSample: true },
        });
        createdClusterIds.push(sampleCluster.id);

        const baseline = await getTrainingCapacityReporting();

        const fixtures = [
            { itiCode: `RPT_A1_${suffix}`, itiName: "Report test A1", type: "HUB", district: "TEST", clusterId: clusterA.id, studentStrength: 20, isSample: false },
            { itiCode: `RPT_A2_${suffix}`, itiName: "Report test A2", type: "SPOKE", district: "TEST", clusterId: clusterA.id, studentStrength: 0, isSample: false },
            { itiCode: `RPT_B1_${suffix}`, itiName: "Report test B1", type: "HUB", district: "TEST", clusterId: clusterB.id, studentStrength: null, isSample: false },
            { itiCode: `RPT_U1_${suffix}`, itiName: "Report test unassigned", type: "SPOKE", district: "TEST", clusterId: null, studentStrength: 5, isSample: false },
            { itiCode: `RPT_S1_${suffix}`, itiName: "Report test sample parent", type: "SPOKE", district: "TEST", clusterId: sampleCluster.id, studentStrength: 7, isSample: false },
            { itiCode: `RPT_SAMPLE_${suffix}`, itiName: "Report test sample ITI", type: "HUB", district: "TEST", clusterId: clusterA.id, studentStrength: 999, isSample: true },
        ];

        for (const fixture of fixtures) {
            const created = await prisma.iti.create({ data: fixture });
            createdItiIds.push(created.id);
        }

        const report = await getTrainingCapacityReporting();
        const byId = new Map(report.by_cluster.map((cluster) => [cluster.cluster_id, cluster]));

        assert.equal(report.metric.value, (baseline.metric.value ?? 0) + 32);
        assert.equal(report.metric.availability, "AVAILABLE");
        assert.deepEqual(report.coverage, {
            total_itis: baseline.coverage.total_itis + 5,
            itis_with_capacity: baseline.coverage.itis_with_capacity + 4,
            itis_without_capacity: baseline.coverage.itis_without_capacity + 1,
            itis_without_reportable_cluster: baseline.coverage.itis_without_reportable_cluster! + 2,
        });
        assert.equal(byId.get(clusterA.id)?.student_capacity, 20);
        assert.deepEqual(byId.get(clusterA.id)?.coverage, {
            total_itis: 2,
            itis_with_capacity: 2,
            itis_without_capacity: 0,
        });
        assert.equal(byId.get(clusterB.id)?.student_capacity, null);
        assert.deepEqual(byId.get(clusterB.id)?.coverage, {
            total_itis: 1,
            itis_with_capacity: 0,
            itis_without_capacity: 1,
        });
        assert.equal(byId.has(sampleCluster.id), false);
        assert.equal(report.without_reportable_cluster.student_capacity, (baseline.without_reportable_cluster.student_capacity ?? 0) + 12);
        assert.deepEqual(report.without_reportable_cluster.coverage, {
            total_itis: baseline.without_reportable_cluster.coverage.total_itis + 2,
            itis_with_capacity: baseline.without_reportable_cluster.coverage.itis_with_capacity + 2,
            itis_without_capacity: baseline.without_reportable_cluster.coverage.itis_without_capacity,
            itis_without_reportable_cluster: baseline.without_reportable_cluster.coverage.itis_without_reportable_cluster! + 2,
        });
        assert.equal(
            report.by_cluster.reduce((sum, cluster) => sum + (cluster.student_capacity ?? 0), 0)
                + (report.without_reportable_cluster.student_capacity ?? 0),
            report.metric.value,
        );
    } finally {
        if (createdItiIds.length) {
            await prisma.iti.deleteMany({ where: { id: { in: createdItiIds } } });
        }
        if (createdClusterIds.length) {
            await prisma.cluster.deleteMany({ where: { id: { in: createdClusterIds } } });
        }
    }
});
