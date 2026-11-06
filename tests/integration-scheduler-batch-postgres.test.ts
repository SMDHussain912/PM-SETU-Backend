import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";
import { claimDueSources } from "../src/modules/integrations/integration.repository";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL scheduler workers claim bounded, disjoint batches and drain remaining due sources", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const prefix = `BATCH_TEST_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
  const sourceIds: number[] = [];

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const created = await Promise.all(
      Array.from({ length: 23 }, (_, index) =>
        firstClient.integrationSource.create({
          data: {
            code: `${prefix}_${String(index).padStart(2, "0")}`,
            name: "Scheduler bounded batch test",
            system: "DET_MIS",
            transport: "REST",
            enabled: true,
            syncIntervalSeconds: 300,
            nextSyncAt: new Date(Date.now() - 60_000),
          },
          select: { id: true },
        }),
      ),
    );
    sourceIds.push(...created.map((source) => source.id));

    const [firstBatch, secondBatch] = await Promise.all([
      claimDueSources(firstClient, sourceIds),
      claimDueSources(secondClient, sourceIds),
    ]);

    assert.ok(firstBatch.length <= 10, `first worker claimed ${firstBatch.length} rows`);
    assert.ok(secondBatch.length <= 10, `second worker claimed ${secondBatch.length} rows`);
    assert.equal(firstBatch.length, 10);
    assert.equal(secondBatch.length, 10);

    const firstIds = firstBatch.map((source) => source.id);
    const secondIds = secondBatch.map((source) => source.id);
    assert.equal(new Set([...firstIds, ...secondIds]).size, 20, "workers must not claim the same source");
    assert.ok(firstBatch.every((source) => source.claimToken));
    assert.ok(secondBatch.every((source) => source.claimToken));

    const remainingBatch = await claimDueSources(secondClient);
    assert.equal(remainingBatch.length, 3, "the next batch should claim the three sources left due");

    const allClaimedIds = [...firstIds, ...secondIds, ...remainingBatch.map((source) => source.id)];
    assert.equal(new Set(allClaimedIds).size, 23);
    assert.deepEqual([...allClaimedIds].sort((a, b) => a - b), [...sourceIds].sort((a, b) => a - b));
  } finally {
    if (sourceIds.length) {
      await firstClient.integrationSource.deleteMany({ where: { id: { in: sourceIds } } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
