import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL scheduler leases prevent concurrent claims and recover expired claims", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `LEASE_TEST_${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
  let sourceId: number | undefined;

  const claim = (client: PrismaClient) => client.$queryRaw<Array<{ id: number; claim_token: string }>>`
    UPDATE "integration_sources"
    SET
      "claim_token" = gen_random_uuid(),
      "claim_expires_at" = NOW() + INTERVAL '15 minutes',
      "next_sync_at" = NOW() + ("sync_interval_seconds" * INTERVAL '1 second')
    WHERE "enabled" = TRUE
      AND "sync_interval_seconds" IS NOT NULL
      AND (
        ("claim_token" IS NULL AND ("next_sync_at" IS NULL OR "next_sync_at" <= NOW()))
        OR ("claim_token" IS NOT NULL AND ("claim_expires_at" IS NULL OR "claim_expires_at" <= NOW()))
      )
      AND "code" = ${code}
    RETURNING "id", "claim_token"
  `;

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const source = await firstClient.integrationSource.create({
      data: {
        code,
        name: "Scheduler lease concurrency test",
        system: "DET_MIS",
        transport: "REST",
        enabled: true,
        syncIntervalSeconds: 300,
        nextSyncAt: new Date(Date.now() - 1_000),
      },
    });
    sourceId = source.id;

    const [firstClaim, competingClaim] = await Promise.all([
      claim(firstClient),
      claim(secondClient),
    ]);
    assert.equal(firstClaim.length + competingClaim.length, 1);

    await firstClient.integrationSource.update({
      where: { id: source.id },
      data: { claimExpiresAt: new Date(Date.now() - 1_000) },
    });

    const recovered = await claim(secondClient);
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].id, source.id);
    assert.notEqual(recovered[0].claim_token, firstClaim[0]?.claim_token ?? competingClaim[0]?.claim_token);
  } finally {
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
