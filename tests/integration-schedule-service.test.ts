import test from "node:test";
import assert from "node:assert/strict";
import { setSchedule } from "../src/modules/integrations/integration.service";
import type * as repositoryModule from "../src/modules/integrations/integration.repository";

function source(transport: string) {
  return {
    id: 8765432,
    code: "SCHEDULE_SERVICE_TEST",
    name: "Schedule service test",
    system: "STUDENT_MIS",
    transport,
    enabled: true,
    credentialRef: null,
    syncIntervalSeconds: null,
    nextSyncAt: null,
    claimToken: null,
    claimExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NonNullable<Awaited<ReturnType<typeof repositoryModule.get>>>;
}

test("schedule service rejects CSV upload sources before repository writes", async () => {
  let writes = 0;
  const repository = {
    async get() { return source("CSV_UPLOAD"); },
    async updateSchedule() { writes += 1; },
  } as unknown as Pick<typeof repositoryModule, "get" | "updateSchedule">;

  await assert.rejects(
    setSchedule(8765432, 300, repository),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "INTEGRATION_TRANSPORT_NOT_SCHEDULABLE",
  );
  assert.equal(writes, 0);
});

test("schedule service rejects webhook sources before repository writes", async () => {
  let writes = 0;
  const repository = {
    async get() { return source("WEBHOOK"); },
    async updateSchedule() { writes += 1; },
  } as unknown as Pick<typeof repositoryModule, "get" | "updateSchedule">;

  await assert.rejects(
    setSchedule(8765432, 300, repository),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "INTEGRATION_TRANSPORT_NOT_SCHEDULABLE",
  );
  assert.equal(writes, 0);
});

test("schedule service permits REST polling intervals", async () => {
  let saved: number | null | undefined;
  const repository = {
    async get() { return source("REST"); },
    async updateSchedule(_id: number, seconds: number | null) { saved = seconds; return { id: 1 }; },
  } as unknown as Pick<typeof repositoryModule, "get" | "updateSchedule">;

  const result = await setSchedule(8765432, 300, repository);
  assert.deepEqual(result, { id: 1 });
  assert.equal(saved, 300);
});

test("schedule service permits explicit unscheduling for pull transports", async () => {
  let saved: number | null | undefined = 300;
  const repository = {
    async get() { return source("SFTP"); },
    async updateSchedule(_id: number, seconds: number | null) { saved = seconds; return { id: 1 }; },
  } as unknown as Pick<typeof repositoryModule, "get" | "updateSchedule">;

  await setSchedule(8765432, null, repository);
  assert.equal(saved, null);
});

test("schedule service returns not found without attempting an update", async () => {
  let writes = 0;
  const repository = {
    async get() { return null; },
    async updateSchedule() { writes += 1; },
  } as unknown as Pick<typeof repositoryModule, "get" | "updateSchedule">;

  await assert.rejects(
    setSchedule(8765432, 300, repository),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "INTEGRATION_NOT_FOUND",
  );
  assert.equal(writes, 0);
});
