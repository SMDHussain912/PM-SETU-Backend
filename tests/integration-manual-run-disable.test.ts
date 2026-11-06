import test from "node:test";
import assert from "node:assert/strict";
import { recordRun } from "../src/modules/integrations/integration.service";
import type * as repositoryModule from "../src/modules/integrations/integration.repository";

const enabledSource = {
  id: 7654321,
  code: "MANUAL_RUN_DISABLE_RACE_TEST",
  name: "Manual run disable race test",
  system: "STUDENT_MIS",
  transport: "REST",
  enabled: true,
  credentialRef: null,
  syncIntervalSeconds: null,
  nextSyncAt: null,
  claimToken: null,
  claimExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as NonNullable<Awaited<ReturnType<typeof repositoryModule.get>>>;

const input = {
  status: "SUCCEEDED" as const,
  records_read: 3,
  records_created: 2,
  records_updated: 1,
  records_rejected: 0,
};

test("manual run maps a source-disable race to INTEGRATION_DISABLED without persisting a run", async () => {
  let writes = 0;
  const repository = {
    async get(id: number) {
      assert.equal(id, enabledSource.id);
      return enabledSource;
    },
    async createManualRun() {
      writes += 1;
      throw new Error("INTEGRATION_SOURCE_NOT_ENABLED");
    },
  } as unknown as Pick<typeof repositoryModule, "get" | "createManualRun">;

  await assert.rejects(
    recordRun(enabledSource.id, input, repository),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "INTEGRATION_DISABLED",
  );
  assert.equal(writes, 1);
});

test("manual run persists normalized counters when the source remains enabled", async () => {
  let saved: Record<string, unknown> | undefined;
  const repository = {
    async get() {
      return enabledSource;
    },
    async createManualRun(_id: number, data: Record<string, unknown>) {
      saved = data;
      return { id: 44 };
    },
  } as unknown as Pick<typeof repositoryModule, "get" | "createManualRun">;

  const result = await recordRun(enabledSource.id, input, repository);

  assert.deepEqual(result, { id: 44 });
  assert.equal(saved?.status, "SUCCEEDED");
  assert.equal(saved?.recordsRead, 3);
  assert.equal(saved?.recordsCreated, 2);
  assert.equal(saved?.recordsUpdated, 1);
  assert.equal(saved?.recordsRejected, 0);
  assert.equal(saved?.cursor, null);
});

