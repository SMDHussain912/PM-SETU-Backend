import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { create } from "../src/modules/integrations/integration.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL creates scheduled integration sources using database time", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const suffix = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const createdIds: number[] = [];

  try {
    await client.$connect();
    const scheduled = await create({
      code: `CREATE_CLOCK_${suffix}`,
      name: "Scheduler create clock test",
      system: "DET_MIS",
      transport: "REST",
      enabled: true,
      sync_interval_seconds: 300,
    }, client);
    createdIds.push(scheduled.id);

    const scheduledClock = await client.$queryRaw<Array<{ seconds_until_due: number }>>`
      SELECT EXTRACT(EPOCH FROM ("next_sync_at" - NOW()))::float8 AS seconds_until_due
      FROM "integration_sources"
      WHERE "id" = ${scheduled.id}
    `;
    assert.ok(Math.abs(scheduledClock[0].seconds_until_due) < 2, "new schedule should use PostgreSQL time");

    const disabled = await create({
      code: `CREATE_DISABLED_${suffix}`,
      name: "Disabled scheduler create clock test",
      system: "DET_MIS",
      transport: "REST",
      enabled: false,
      sync_interval_seconds: 300,
    }, client);
    createdIds.push(disabled.id);
    assert.equal(disabled.nextSyncAt, null, "disabled source must not become due");

    const unscheduled = await create({
      code: `CREATE_UNSCHEDULED_${suffix}`,
      name: "Unscheduled create clock test",
      system: "DET_MIS",
      transport: "REST",
      enabled: true,
      sync_interval_seconds: null,
    }, client);
    createdIds.push(unscheduled.id);
    assert.equal(unscheduled.nextSyncAt, null, "source without an interval must not become due");
  } finally {
    if (createdIds.length) {
      await client.integrationSource.deleteMany({ where: { id: { in: createdIds } } }).catch(() => undefined);
    }
    await client.$disconnect();
  }
});
