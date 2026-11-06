import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/config/database";
import * as dashboardRepository from "../../src/modules/dashboard/dashboard.repository";

test("public dashboard repository queries use explicit aggregate and field projections", async () => {
    const client = prisma as unknown as {
        $queryRaw: (query: { sql?: string }) => Promise<unknown[]>;
    };
    const original = client.$queryRaw;
    const statements: string[] = [];

    client.$queryRaw = async (query) => {
        statements.push(query.sql ?? "");
        return [];
    };

    try {
        await dashboardRepository.getStateMetrics();
        await dashboardRepository.getClusterSummaries();
        await dashboardRepository.getClusterById(1);
        await dashboardRepository.getClusterItis(1);
        await dashboardRepository.getClusterAips(1);
        await dashboardRepository.getTrainingByIti(1);
    } finally {
        client.$queryRaw = original;
    }

    assert.equal(statements.length, 6);
    assert.match(statements[3], /SELECT\s+id,\s*iti_code,\s*iti_name,\s*type,\s*district/i);
    assert.match(statements[4], /SELECT\s+id,\s*name,\s*sector,\s*status,\s*investment_amount/i);
    assert.match(statements[5], /i\.id AS iti_id,\s*i\.iti_code,\s*i\.iti_name,\s*i\.type,\s*i\.district,\s*i\.cluster_id,\s*c\.name AS cluster_name,\s*i\.student_strength AS student_capacity/i);

    for (const statement of statements) {
        assert.doesNotMatch(
            statement,
            /\b(password_hash|failed_login_attempts|email|phone|contact_person|bank_account|file_path|created_by|personal_address)\b/i,
            "public dashboard SQL must not select private account, contact, financial-account or storage metadata",
        );
    }
});
