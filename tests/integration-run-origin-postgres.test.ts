import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";
import * as integrationRepository from "../src/modules/integrations/integration.repository";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("scheduler checkpoint lookup excludes manual runs but retains scheduled and legacy checkpoints", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `ORIGIN_TEST_${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
  let sourceId: number | undefined;

  try {
    await client.$connect();
    const source = await client.integrationSource.create({
      data: { code, name: "Integration run origin test", system: "DET_MIS", transport: "REST", enabled: true },
    });
    sourceId = source.id;

    const base = {
      sourceId,
      status: "SUCCEEDED",
      recordsRead: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsRejected: 0,
      errorCode: null,
      errorSummary: null,
      startedAt: new Date("2026-11-06T10:00:00.000Z"),
      completedAt: new Date("2026-11-06T10:00:00.000Z"),
    };
    const legacy = await client.integrationSyncRun.create({ data: { ...base, runOrigin: "LEGACY", cursor: "legacy-cursor" } });
    const scheduled = await client.integrationSyncRun.create({ data: { ...base, runOrigin: "SCHEDULED", cursor: "scheduled-cursor", startedAt: new Date("2026-11-06T11:00:00.000Z"), completedAt: new Date("2026-11-06T11:00:00.000Z") } });
    await client.integrationSyncRun.create({ data: { ...base, runOrigin: "MANUAL", cursor: "manual-cursor" } });

    const checkpoints = await integrationRepository.listCommittedRuns(source.id, 10, client);
    assert.deepEqual(checkpoints.map((run) => run.id), [scheduled.id, legacy.id]);
    assert.equal(checkpoints.some((run) => run.cursor === "manual-cursor"), false);
  } finally {
    if (sourceId !== undefined) {
      await client.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await client.$disconnect();
  }
});
