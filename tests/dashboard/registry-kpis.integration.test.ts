import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { env } from "../../src/config/env";
import { prisma, disconnectPrisma } from "../../src/config/database";
import {
    getClusterAips,
    getClusterById,
    getClusterItis,
    getClusterSummaries,
} from "../../src/modules/dashboard/dashboard.repository";

const databaseTest = env.databaseUrl ? test : test.skip;
const pool = new Pool({ connectionString: env.databaseUrl });
let setupComplete = false;

function assertDedicatedTestDatabase(): void {
    assert.equal(env.nodeEnv, "test", "integration tests must run with NODE_ENV=test");
    assert.ok(env.databaseUrl, "TEST_DATABASE_URL must be configured for integration tests");

    let databaseName: string;
    try {
        databaseName = decodeURIComponent(new URL(env.databaseUrl).pathname.slice(1));
    } catch {
        throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL");
    }

    assert.match(
        databaseName,
        /(?:^|[-_])test$/i,
        "refusing to run destructive fixtures: database name must end in -test or _test",
    );
}

let clusterId: number;
let sampleClusterId: number;
let itiId: number;
let inactiveItiId: number;
let sampleItiId: number;
let aipId: number;
let sampleAipId: number;
let spvId: number;
let sampleSpvId: number;

test.before(async () => {
    await prisma.$connect();
    const suffix = `${process.pid}-${Date.now()}`;

    const cluster = await pool.query<{ id: number }>(
        "INSERT INTO clusters (name, district, sector, is_sample) VALUES ($1, 'CI District', 'CI Sector', FALSE) RETURNING id",
        [`CI Registry Cluster ${suffix}`],
    );
    clusterId = cluster.rows[0].id;

    const sampleCluster = await pool.query<{ id: number }>(
        "INSERT INTO clusters (name, district, sector, is_sample) VALUES ($1, 'CI District', 'CI Sector', TRUE) RETURNING id",
        [`CI Sample Registry Cluster ${suffix}`],
    );
    sampleClusterId = sampleCluster.rows[0].id;

    const iti = await pool.query<{ id: number }>(
        "INSERT INTO itis (iti_code, iti_name, type, district, cluster_id, is_sample) VALUES ($1, 'CI Registry Hub', 'HUB', 'CI District', $2, FALSE) RETURNING id",
        [`CI-REG-H-${suffix}`, clusterId],
    );
    itiId = iti.rows[0].id;

    const inactiveIti = await pool.query<{ id: number }>(
        "INSERT INTO itis (iti_code, iti_name, type, district, cluster_id, status, is_sample) VALUES ($1, 'CI Inactive Registry Hub', 'HUB', 'CI District', $2, 'INACTIVE', FALSE) RETURNING id",
        [`CI-REG-IH-${suffix}`, clusterId],
    );
    inactiveItiId = inactiveIti.rows[0].id;

    const sampleIti = await pool.query<{ id: number }>(
        "INSERT INTO itis (iti_code, iti_name, type, district, cluster_id, is_sample) VALUES ($1, 'CI Sample Registry Hub', 'HUB', 'CI District', $2, TRUE) RETURNING id",
        [`CI-REG-SH-${suffix}`, clusterId],
    );
    sampleItiId = sampleIti.rows[0].id;

    const aip = await pool.query<{ id: number }>(
        "INSERT INTO aips (name, sector, status, cluster_id, is_sample) VALUES ('CI Registry AIP', 'CI Sector', 'ACTIVE', $1, FALSE) RETURNING id",
        [clusterId],
    );
    aipId = aip.rows[0].id;

    const sampleAip = await pool.query<{ id: number }>(
        "INSERT INTO aips (name, sector, status, cluster_id, is_sample) VALUES ('CI Sample Registry AIP', 'CI Sector', 'ACTIVE', $1, TRUE) RETURNING id",
        [clusterId],
    );
    sampleAipId = sampleAip.rows[0].id;

    const spv = await pool.query<{ id: number }>(
        "INSERT INTO spvs (name, status, cluster_id, is_sample) VALUES ('CI Registry SPV', 'PROPOSED', $1, FALSE) RETURNING id",
        [clusterId],
    );
    spvId = spv.rows[0].id;

    const sampleSpv = await pool.query<{ id: number }>(
        "INSERT INTO spvs (name, status, cluster_id, is_sample) VALUES ('CI Sample Registry SPV', 'PROPOSED', $1, TRUE) RETURNING id",
        [clusterId],
    );
    sampleSpvId = sampleSpv.rows[0].id;
});

test.after(async () => {
    try {
        if (setupComplete) {
            const ids = (values: Array<number | undefined>) => values.filter((value): value is number => value !== undefined);
            await pool.query("DELETE FROM spvs WHERE id = ANY($1::int[])", [ids([spvId, sampleSpvId])]);
            await pool.query("DELETE FROM aips WHERE id = ANY($1::int[])", [ids([aipId, sampleAipId])]);
            await pool.query("DELETE FROM itis WHERE id = ANY($1::int[])", [ids([itiId, inactiveItiId, sampleItiId])]);
            await pool.query("DELETE FROM clusters WHERE id = ANY($1::int[])", [ids([clusterId, sampleClusterId])]);
        }
    } finally {
        await disconnectPrisma();
        await pool.end();
    }
});

databaseTest("REG-01 to REG-05 cluster aggregation excludes sample rows and does not invent an active filter", async () => {
    const summaries = await getClusterSummaries();
    const summary = summaries.find((item) => item.id === clusterId);

    assert.ok(summary, "non-sample cluster should be included");
    assert.equal(summary.hub_itis, 2, "registered inactive ITIs remain included until an active-only rule is approved");
    assert.equal(summary.spoke_itis, 0);
    assert.equal(summary.aips, 1);
    assert.equal(summary.spvs, 1);
    assert.equal(summaries.some((item) => item.id === sampleClusterId), false);

    const sampleCluster = await getClusterById(sampleClusterId);
    assert.equal(sampleCluster, null);
});

databaseTest("cluster drill-down excludes sample ITI and AIP records", async () => {
    const itis = await getClusterItis(clusterId);
    const aips = await getClusterAips(clusterId);

    assert.deepEqual(itis.map((item) => item.id).sort((a, b) => a - b), [itiId, inactiveItiId].sort((a, b) => a - b));
    assert.deepEqual(aips.map((item) => item.id), [aipId]);
    assert.equal(itis.some((item) => item.id === sampleItiId), false);
    assert.equal(aips.some((item) => item.id === sampleAipId), false);
});
