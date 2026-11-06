import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  claimDueSources,
  createScheduledRun,
  updateEnabled,
} from "../src/modules/integrations/integration.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL disabling an integration source revokes its lease and blocks stale commits", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `DISABLE_FENCE_${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
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
        name: "Scheduler disable fencing test",
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
    assert.ok(claim, "enabled due source should be claimed");

    await updateEnabled(source.id, false, secondClient);
    const disabled = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { enabled: true, claimToken: true, claimExpiresAt: true, nextSyncAt: true },
    });
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.claimToken, null);
    assert.equal(disabled.claimExpiresAt, null);
    assert.equal(disabled.nextSyncAt, null);

    await assert.rejects(
      () => createScheduledRun(source.id, claim.claimToken, runInput, firstClient),
      /SCHEDULER_LEASE_LOST/,
      "a worker holding the old token cannot commit after disable",
    );
    assert.equal(await firstClient.integrationSyncRun.count({ where: { sourceId: source.id } }), 0);

    await updateEnabled(source.id, true, secondClient);
    const enabledClock = await secondClient.$queryRaw<Array<{ seconds_until_due: number }>>`
      SELECT EXTRACT(EPOCH FROM ("next_sync_at" - NOW()))::float8 AS seconds_until_due
      FROM "integration_sources"
      WHERE "id" = ${source.id}
    `;
    assert.ok(Math.abs(enabledClock[0].seconds_until_due) < 2, "re-enabled schedule should use PostgreSQL time");
    const [reclaimed] = await claimDueSources(secondClient, [source.id]);
    assert.ok(reclaimed, "re-enabled source should be immediately claimable");
    assert.notEqual(reclaimed.claimToken, claim.claimToken);
  } finally {
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
