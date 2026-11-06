import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { create, ingestBatch, updateEnabled } from "../src/modules/integrations/integration.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL serializes manual ingestion against source disable", {
  skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
  if (!databaseUrl) return;
  assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  const suffix = randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase();
  let sourceId: number | undefined;

  try {
    await client.$connect();
    const source = await create({
      code: `MANUAL_FENCE_${suffix}`,
      name: "Manual ingestion disable fencing test",
      system: "DET_MIS",
      transport: "REST",
      enabled: true,
      sync_interval_seconds: null,
    }, client);
    sourceId = source.id;

    const record = {
      source_record_id: `manual-${suffix}`,
      source_version: "1",
      occurred_at: null,
      payload: { fixture: "manual-ingest-disable-fence" },
    };

    const first = await ingestBatch(source.id, [record], {}, client);
    assert.equal(first.records_created, 1);
    assert.equal(await client.integrationRecord.count({ where: { sourceId: source.id } }), 1);

    await updateEnabled(source.id, false, client);
    await assert.rejects(
      () => ingestBatch(source.id, [{ ...record, source_record_id: `disabled-${suffix}` }], {}, client),
      /INTEGRATION_SOURCE_NOT_ENABLED/,
    );
    assert.equal(await client.integrationRecord.count({ where: { sourceId: source.id } }), 1);

    await updateEnabled(source.id, true, client);
    const reenabled = await ingestBatch(source.id, [{ ...record, source_record_id: `reenabled-${suffix}` }], {}, client);
    assert.equal(reenabled.records_created, 1);
    assert.equal(await client.integrationRecord.count({ where: { sourceId: source.id } }), 2);
  } finally {
    if (sourceId !== undefined) {
      await client.integrationSource.deleteMany({ where: { id: sourceId } }).catch(() => undefined);
    }
    await client.$disconnect();
  }
});
