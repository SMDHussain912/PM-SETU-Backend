import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/config/database";
import {
    getClusterSipCounts,
    getFinanceByCluster,
    getFundingMetrics,
    getStateMetrics,
    getTrainingByCluster,
    getTrainingMetrics,
} from "../../src/modules/dashboard/dashboard.repository";

test("all dashboard aggregates exclude sample rows", async () => {
    const client = prisma as unknown as {
        $queryRaw: (query: { sql?: string }) => Promise<unknown[]>;
    };
    const original = client.$queryRaw;
    const statements: string[] = [];

    client.$queryRaw = async (query) => {
        statements.push(query.sql ?? "");
        return [{
            clusters: 0, hub_itis: 0, spoke_itis: 0, aips: 0, spvs: 0,
            sips_submitted: 0, sips_approved: 0, investment: 0,
            total_investment: 0, total_sip_proposed: 0,
            total_sip_infrastructure: 0, total_sip_equipment: 0,
            total_sip_training: 0, total_sip_industry: 0,
            total_sip_government: 0, total_student_capacity: 0,
            hub_capacity: 0, spoke_capacity: 0,
        }];
    };

    try {
        await getStateMetrics();
        await getClusterSipCounts(1);
        await getFundingMetrics();
        await getFinanceByCluster();
        await getTrainingMetrics();
        await getTrainingByCluster();

        assert.equal(statements.length, 6);
        for (const statement of statements) {
            assert.match(statement, /is_sample\s*=\s*FALSE/i, "each dashboard aggregate must filter sample rows");
        }

        const state = statements[0];
        assert.match(state, /FROM sips WHERE is_sample\s*=\s*FALSE AND status = 'SUBMITTED'/i);
        assert.match(state, /FROM sips WHERE is_sample\s*=\s*FALSE AND status = 'APPROVED'/i);

        const finance = statements[2];
        assert.equal((finance.match(/is_sample\s*=\s*FALSE/gi) ?? []).length, 8);

        const financeByCluster = statements[3];
        assert.match(financeByCluster, /FROM clusters c[\s\S]*WHERE c\.is_sample\s*=\s*FALSE/i);
        assert.match(financeByCluster, /FROM aips WHERE is_sample\s*=\s*FALSE/i);
        assert.match(financeByCluster, /FROM sips WHERE is_sample\s*=\s*FALSE/i);

        const training = statements[4];
        assert.equal((training.match(/is_sample\s*=\s*FALSE/gi) ?? []).length, 3);

        const trainingByCluster = statements[5];
        assert.match(trainingByCluster, /LEFT JOIN itis i ON i\.cluster_id = c\.id AND i\.is_sample\s*=\s*FALSE/i);
        assert.match(trainingByCluster, /WHERE c\.is_sample\s*=\s*FALSE/i);
    } finally {
        client.$queryRaw = original;
    }
});
