import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  claimDueSources,
  createScheduledRun,
  ingestBatch,
} from "../src/modules/integrations/integration.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL scheduler output rejects stale tokens after another worker reclaims the lease", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `WRITE_FENCE_${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
  let sourceId: number | undefined;

  const scheduledRun = {
    status: "FAILED",
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsRejected: 0,
    cursor: "previous-cursor",
    errorCode: "TEST_FAILURE",
    errorSummary: "Fencing test fixture",
    startedAt: new Date(),
    completedAt: new Date(),
  } as const;

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const source = await firstClient.integrationSource.create({
      data: {
        code,
        name: "Scheduler write fencing test",
        system: "DET_MIS",
        transport: "REST",
        enabled: true,
        syncIntervalSeconds: 300,
        nextSyncAt: new Date(Date.now() - 1_000),
      },
      select: { id: true },
    });
    sourceId = source.id;

    const [firstClaim] = await claimDueSources(firstClient, [source.id]);
    assert.ok(firstClaim);
    const staleToken = firstClaim.claimToken;

    await firstClient.integrationSource.update({
      where: { id: source.id },
      data: { claimExpiresAt: new Date(Date.now() - 1_000) },
    });
    const [secondClaim] = await claimDueSources(secondClient, [source.id]);
    assert.ok(secondClaim);
    assert.notEqual(secondClaim.claimToken, staleToken);

    await assert.rejects(
      () => createScheduledRun(source.id, staleToken, scheduledRun, firstClient),
      /SCHEDULER_LEASE_LOST/,
      "stale workers cannot persist FAILED or successful scheduler run history",
    );

    await assert.rejects(
      () => ingestBatch(
        source.id,
        [{ source_record_id: "stale-record", payload: { status: "STALE" } }],
        { claimToken: staleToken },
        firstClient,
      ),
      /SCHEDULER_LEASE_LOST/,
      "stale workers cannot ingest records or advance checkpoints",
    );

    assert.equal(await firstClient.integrationSyncRun.count({ where: { sourceId: source.id } }), 0);
    assert.equal(await firstClient.integrationRecord.count({ where: { sourceId: source.id } }), 0);

    await createScheduledRun(source.id, secondClaim.claimToken, scheduledRun, secondClient);
    await ingestBatch(
      source.id,
      [{ source_record_id: "current-record", payload: { status: "CURRENT" } }],
      { claimToken: secondClaim.claimToken, cursor: "current-cursor" },
      secondClient,
    );

    assert.equal(await firstClient.integrationSyncRun.count({ where: { sourceId: source.id } }), 2);
    assert.equal(await firstClient.integrationRecord.count({ where: { sourceId: source.id } }), 1);
  } finally {
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
