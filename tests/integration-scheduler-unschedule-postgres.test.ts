import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  claimDueSources,
  createScheduledRun,
  updateSchedule,
} from "../src/modules/integrations/integration.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL removing a source schedule revokes its lease without disabling manual ingestion", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `UNSCHEDULE_FENCE_${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
  let sourceId: number | undefined;
  const runInput = {
    status: "SUCCEEDED",
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsRejected: 0,
    cursor: null,
    errorCode: null,
    errorSummary: null,
    startedAt: new Date(),
    completedAt: new Date(),
  };

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const source = await firstClient.integrationSource.create({
      data: {
        code,
        name: "Scheduler unschedule fencing test",
        system: "DET_MIS",
        transport: "REST",
        enabled: true,
        syncIntervalSeconds: 300,
        nextSyncAt: new Date(Date.now() - 1_000),
      },
      select: { id: true },
    });
    sourceId = source.id;

    const [claim] = await claimDueSources(firstClient, [source.id]);
    assert.ok(claim, "scheduled enabled source should be claimed");

    await updateSchedule(source.id, null, secondClient);
    const unscheduled = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { enabled: true, syncIntervalSeconds: true, nextSyncAt: true, claimToken: true, claimExpiresAt: true },
    });
    assert.equal(unscheduled.enabled, true, "removing a schedule must not disable manual ingestion");
    assert.equal(unscheduled.syncIntervalSeconds, null);
    assert.equal(unscheduled.nextSyncAt, null);
    assert.equal(unscheduled.claimToken, null);
    assert.equal(unscheduled.claimExpiresAt, null);

    await assert.rejects(
      () => createScheduledRun(source.id, claim.claimToken, runInput, firstClient),
      /SCHEDULER_LEASE_LOST/,
      "a worker holding the old token cannot commit after schedule removal",
    );
    assert.equal(await firstClient.integrationSyncRun.count({ where: { sourceId: source.id } }), 0);

    await updateSchedule(source.id, 300, secondClient);
    const [reclaimed] = await claimDueSources(secondClient, [source.id]);
    assert.ok(reclaimed, "restoring a schedule should make the source immediately claimable");
    assert.notEqual(reclaimed.claimToken, claim.claimToken);
  } finally {
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
