import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/config/database";
import {
    getTrainingCapacityByCluster,
    getTrainingCapacityState,
} from "../../src/modules/dashboard/dashboard.repository";

test("capacity aggregation preserves unavailable values and reports source coverage", async () => {
    const client = prisma as unknown as {
        $queryRaw: (query: { sql?: string }) => Promise<unknown[]>;
    };
    const original = client.$queryRaw;
    const statements: string[] = [];
    let call = 0;

    client.$queryRaw = async (query) => {
        statements.push(query.sql ?? "");
        call += 1;
        if (call === 1) {
            return [{
                student_capacity: null,
                total_itis: 3,
                itis_with_capacity: 0,
                itis_without_capacity: 3,
                unassigned_itis: 1,
            }];
        }
        return [{
            cluster_id: 7,
            cluster_name: "Cluster A",
            student_capacity: null,
            total_itis: 2,
            itis_with_capacity: 0,
            itis_without_capacity: 2,
        }];
    };

    try {
        const state = await getTrainingCapacityState();
        const clusters = await getTrainingCapacityByCluster();

        assert.equal(state.student_capacity, null);
        assert.deepEqual(state.coverage, {
            total_itis: 3,
            itis_with_capacity: 0,
            itis_without_capacity: 3,
            unassigned_itis: 1,
        });
        assert.equal(clusters[0]?.student_capacity, null);
        assert.deepEqual(clusters[0]?.coverage, {
            total_itis: 2,
            itis_with_capacity: 0,
            itis_without_capacity: 2,
        });

        assert.equal(statements.length, 2);
        for (const statement of statements) {
            assert.match(statement, /is_sample\s*=\s*FALSE/i);
            assert.match(statement, /SUM\(.*student_strength\)/i);
            assert.doesNotMatch(statement, /COALESCE\(SUM\(.*student_strength/i);
        }
        assert.match(statements[0], /COUNT\(student_strength\)/i);
        assert.match(statements[1], /LEFT JOIN itis/i);
        assert.match(statements[1], /WHERE c\.is_sample\s*=\s*FALSE/i);
    } finally {
        client.$queryRaw = original;
    }
});

test("capacity aggregation reports a real zero separately from missing capacity", async () => {
    const client = prisma as unknown as {
        $queryRaw: (query: { sql?: string }) => Promise<unknown[]>;
    };
    const original = client.$queryRaw;
    client.$queryRaw = async () => [{
        student_capacity: 0,
        total_itis: 2,
        itis_with_capacity: 2,
        itis_without_capacity: 0,
        unassigned_itis: 0,
    }];

    try {
        const state = await getTrainingCapacityState();
        assert.equal(state.student_capacity, 0);
        assert.equal(state.coverage.itis_with_capacity, 2);
        assert.equal(state.coverage.itis_without_capacity, 0);
    } finally {
        client.$queryRaw = original;
    }
});
