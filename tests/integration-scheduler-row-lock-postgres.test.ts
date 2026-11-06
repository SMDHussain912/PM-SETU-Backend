import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";
import { claimDueSources } from "../src/modules/integrations/integration.repository";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL scheduler skips an expired source while another transaction holds its row lock", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const firstClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const secondClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const code = `LOCK_FENCE_${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
  let sourceId: number | undefined;
  let releaseLock: (() => void) | undefined;
  let signalLockHeld: (() => void) | undefined;
  let lockingTransaction: Promise<void> | undefined;
  const lockHeld = new Promise<void>((resolve) => { signalLockHeld = resolve; });
  const holdTransaction = new Promise<void>((resolve) => { releaseLock = resolve; });

  try {
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    const source = await firstClient.integrationSource.create({
      data: {
        code,
        name: "Scheduler row-lock fencing test",
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
    assert.ok(initialClaim);

    // Make the lease reclaimable before taking the row lock. The competing
    // scheduler must now rely on SKIP LOCKED rather than the expiry predicate.
    await firstClient.integrationSource.update({
      where: { id: source.id },
      data: { claimExpiresAt: new Date(Date.now() - 1_000) },
    });

    lockingTransaction = firstClient.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "integration_sources" WHERE "id" = ${source.id} FOR UPDATE
      `;
      signalLockHeld?.();
      await holdTransaction;
    });

    await lockHeld;
    const whileLocked = await claimDueSources(secondClient, [source.id]);
    assert.equal(whileLocked.length, 0, "a competing scheduler must skip the locked expired source");

    releaseLock();
    await lockingTransaction;
    lockingTransaction = undefined;

    const afterCommit = await claimDueSources(secondClient, [source.id]);
    assert.equal(afterCommit.length, 1, "the source should become claimable after the lock is released");
    assert.equal(afterCommit[0].id, source.id);
    assert.notEqual(afterCommit[0].claimToken, initialClaim.claimToken);
  } finally {
    releaseLock?.();
    await lockingTransaction?.catch(() => undefined);
    if (sourceId !== undefined) {
      await firstClient.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  }
});
