import test from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { Pool } from "pg";
import { prisma, disconnectPrisma } from "../../src/config/database";
import { requireResourceScope, type ScopedResource } from "../../src/middleware/scope.middleware";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseTest = databaseUrl ? test : test.skip;
const pool = new Pool({ connectionString: databaseUrl });

type TestUser = { id: number; roles?: string[] };

let clusterId: number;
let otherClusterId: number;
let itiId: number;
let aipId: number;
let spvId: number;
let sipId: number;
let clusterUserId: number;
let unassignedUserId: number;
let directItiUserId: number;
let directAipUserId: number;

async function createUser(username: string): Promise<number> {
    const result = await pool.query<{ id: number }>(
        `INSERT INTO users (username, password_hash, updated_at)
         VALUES ($1, 'test-hash', NOW()) RETURNING id`,
        [username],
    );
    return result.rows[0].id;
}

async function invokeScope(
    resource: ScopedResource,
    resourceId: number | string,
    user?: TestUser,
): Promise<unknown> {
    let nextError: unknown;
    let nextCalls = 0;
    const req = {
        params: { id: String(resourceId) },
        user: user ? { id: String(user.id), roles: user.roles ?? [] } : undefined,
    } as unknown as Request;
    const next = ((error?: unknown) => {
        nextCalls += 1;
        nextError = error;
    }) as NextFunction;

    await requireResourceScope(resource)(req, {} as Response, next);
    assert.equal(nextCalls, 1, "scope middleware should call next exactly once");
    return nextError;
}

test.before(async () => {
    if (!databaseUrl) return;
    await prisma.$connect();

    const cluster = await pool.query<{ id: number }>(
        "INSERT INTO clusters (name, district, sector) VALUES ('CI Scope Cluster', 'CI District', 'CI Sector') RETURNING id",
    );
    clusterId = cluster.rows[0].id;

    const otherCluster = await pool.query<{ id: number }>(
        "INSERT INTO clusters (name, district, sector) VALUES ('CI Other Cluster', 'CI District', 'CI Sector') RETURNING id",
    );
    otherClusterId = otherCluster.rows[0].id;

    const iti = await pool.query<{ id: number }>(
        "INSERT INTO itis (iti_code, iti_name, type, district, cluster_id) VALUES ('CI-ITI-001', 'CI Test ITI', 'HUB', 'CI District', $1) RETURNING id",
        [clusterId],
    );
    itiId = iti.rows[0].id;

    const aip = await pool.query<{ id: number }>(
        "INSERT INTO aips (name, sector, status, cluster_id) VALUES ('CI Test AIP', 'CI Sector', 'ACTIVE', $1) RETURNING id",
        [clusterId],
    );
    aipId = aip.rows[0].id;

    const spv = await pool.query<{ id: number }>(
        "INSERT INTO spvs (name, status, cluster_id, aip_id) VALUES ('CI Test SPV', 'PROPOSED', $1, $2) RETURNING id",
        [clusterId, aipId],
    );
    spvId = spv.rows[0].id;

    const sip = await pool.query<{ id: number }>(
        "INSERT INTO sips (status, cluster_id, aip_id) VALUES ('DRAFT', $1, $2) RETURNING id",
        [clusterId, aipId],
    );
    sipId = sip.rows[0].id;

    const suffix = `${process.pid}-${Date.now()}`;
    clusterUserId = await createUser(`ci-scope-cluster-${suffix}`);
    unassignedUserId = await createUser(`ci-scope-none-${suffix}`);
    directItiUserId = await createUser(`ci-scope-iti-${suffix}`);
    directAipUserId = await createUser(`ci-scope-aip-${suffix}`);

    await pool.query(
        "INSERT INTO user_scope_assignments (user_id, scope_type, scope_id) VALUES ($1, 'CLUSTER', $2)",
        [clusterUserId, clusterId],
    );
    await pool.query(
        "INSERT INTO user_scope_assignments (user_id, scope_type, scope_id) VALUES ($1, 'ITI', $2)",
        [directItiUserId, itiId],
    );
    await pool.query(
        "INSERT INTO user_scope_assignments (user_id, scope_type, scope_id) VALUES ($1, 'AIP', $2)",
        [directAipUserId, aipId],
    );
});

test.after(async () => {
    if (!databaseUrl) return;
    await pool.query("DELETE FROM user_scope_assignments WHERE user_id = ANY($1::int[])", [
        [clusterUserId, unassignedUserId, directItiUserId, directAipUserId].filter(Boolean),
    ]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::int[])", [
        [clusterUserId, unassignedUserId, directItiUserId, directAipUserId].filter(Boolean),
    ]);
    await pool.query("DELETE FROM sips WHERE id = $1", [sipId]);
    await pool.query("DELETE FROM spvs WHERE id = $1", [spvId]);
    await pool.query("DELETE FROM aips WHERE id = $1", [aipId]);
    await pool.query("DELETE FROM itis WHERE id = $1", [itiId]);
    await pool.query("DELETE FROM clusters WHERE id = ANY($1::int[])", [[clusterId, otherClusterId].filter(Boolean)]);
    await disconnectPrisma();
    await pool.end();
});

databaseTest("cluster assignment grants access to the assigned cluster and its child resources", async () => {
    const user = { id: clusterUserId };
    for (const [resource, id] of [
        ["CLUSTER", clusterId],
        ["ITI", itiId],
        ["AIP", aipId],
        ["SPV", spvId],
        ["SIP", sipId],
    ] as const) {
        assert.equal(await invokeScope(resource, id, user), undefined, `${resource} should inherit cluster access`);
    }
});

databaseTest("cluster assignment does not grant access to a different cluster", async () => {
    const error = await invokeScope("CLUSTER", otherClusterId, { id: clusterUserId });
    assert.equal((error as { statusCode?: number }).statusCode, 403);
});

databaseTest("direct ITI and AIP assignments grant access to their own resources", async () => {
    assert.equal(await invokeScope("ITI", itiId, { id: directItiUserId }), undefined);
    assert.equal(await invokeScope("AIP", aipId, { id: directAipUserId }), undefined);
});


databaseTest("direct AIP assignment grants access to SIPs linked to that AIP", async () => {
    assert.equal(await invokeScope("SIP", sipId, { id: directAipUserId }), undefined);
});

databaseTest("unassigned users are denied access to existing resources", async () => {
    for (const [resource, id] of [
        ["CLUSTER", clusterId],
        ["ITI", itiId],
        ["AIP", aipId],
        ["SPV", spvId],
        ["SIP", sipId],
    ] as const) {
        const error = await invokeScope(resource, id, { id: unassignedUserId });
        assert.equal((error as { statusCode?: number }).statusCode, 403, `${resource} should be forbidden`);
    }
});

databaseTest("global administrative roles bypass resource assignments", async () => {
    assert.equal(await invokeScope("CLUSTER", otherClusterId, {
        id: unassignedUserId,
        roles: ["super_admin"],
    }), undefined);
    assert.equal(await invokeScope("ITI", itiId, {
        id: unassignedUserId,
        roles: ["state_pmu_admin"],
    }), undefined);
});

databaseTest("scope middleware rejects unauthenticated and malformed resource IDs", async () => {
    const unauthenticated = await invokeScope("CLUSTER", clusterId);
    const malformed = await invokeScope("CLUSTER", "not-an-id", { id: unassignedUserId });
    assert.equal((unauthenticated as { statusCode?: number }).statusCode, 401);
    assert.equal((malformed as { statusCode?: number }).statusCode, 400);
});
