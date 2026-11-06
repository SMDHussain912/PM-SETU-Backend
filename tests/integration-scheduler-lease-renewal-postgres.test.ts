import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";
import { claimDueSources, renewSourceClaim, releaseSourceClaim } from "../src/modules/integrations/integration.repository";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL scheduler lease renewal is owner- and expiry-guarded; release is token-fenced", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `LEASE_RENEW_${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
  let sourceId: number | undefined;

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const source = await firstClient.integrationSource.create({
      data: {
        code,
        name: "Scheduler lease renewal test",
        system: "DET_MIS",
        transport: "REST",
        enabled: true,
        syncIntervalSeconds: 300,
        nextSyncAt: new Date(Date.now() - 1_000),
      },
      select: { id: true },
    });
    sourceId = source.id;

    const [initialClaim] = await claimDueSources(firstClient, [source.id]);
    assert.ok(initialClaim, "fixture source should be claimed");
    const originalToken = initialClaim.claimToken;
    assert.ok(originalToken);

    const wrongToken = randomUUID();
    assert.equal(await renewSourceClaim(source.id, wrongToken, firstClient), false);

    // Shorten the still-valid fixture lease so renewal must move its expiry forward.
    await firstClient.integrationSource.update({
      where: { id: source.id },
      data: { claimExpiresAt: new Date(Date.now() + 60_000) },
    });
    const beforeRenewal = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { claimExpiresAt: true },
    });
    assert.ok(beforeRenewal.claimExpiresAt);

    assert.equal(await renewSourceClaim(source.id, originalToken, firstClient), true);
    const afterRenewal = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { claimExpiresAt: true },
    });
    assert.ok(afterRenewal.claimExpiresAt);
    assert.ok(afterRenewal.claimExpiresAt.getTime() > beforeRenewal.claimExpiresAt.getTime());

    const databaseExpiry = await secondClient.$queryRaw<Array<{ remaining_seconds: number }>>`
      SELECT EXTRACT(EPOCH FROM ("claim_expires_at" - NOW()))::double precision AS remaining_seconds
      FROM "integration_sources"
      WHERE "id" = ${source.id}
    `;
    assert.equal(databaseExpiry.length, 1);
    assert.ok(
      databaseExpiry[0].remaining_seconds > 890 && databaseExpiry[0].remaining_seconds <= 900,
      `renewal should set expiry to approximately 15 minutes from PostgreSQL NOW(); got ${databaseExpiry[0].remaining_seconds}s`,
    );

    await firstClient.integrationSource.update({
      where: { id: source.id },
      data: { claimExpiresAt: new Date(Date.now() - 1_000) },
    });
    assert.equal(await renewSourceClaim(source.id, originalToken, firstClient), false, "expired leases cannot be renewed");

    const [reclaimed] = await claimDueSources(secondClient, [source.id]);
    assert.ok(reclaimed, "another worker should reclaim the expired lease");
    assert.notEqual(reclaimed.claimToken, originalToken);

    await releaseSourceClaim(source.id, originalToken, firstClient);
    const afterStaleRelease = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { claimToken: true, claimExpiresAt: true },
    });
    assert.equal(afterStaleRelease.claimToken, reclaimed.claimToken, "stale release must not clear the new owner's token");
    assert.ok(afterStaleRelease.claimExpiresAt);

    await releaseSourceClaim(source.id, reclaimed.claimToken, secondClient);
    const afterOwnerRelease = await firstClient.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: { claimToken: true, claimExpiresAt: true },
    });
    assert.equal(afterOwnerRelease.claimToken, null);
    assert.equal(afterOwnerRelease.claimExpiresAt, null);
  } finally {
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
