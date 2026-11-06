import test from "node:test";
import assert from "node:assert/strict";
import { persistScheduledFailureIfOwned } from "../src/modules/integrations/integration.scheduler.failure";
import * as repositoryModule from "../src/modules/integrations/integration.repository";

test("scheduler skips failure persistence when lease ownership is unverified", async () => {
  let reads = 0;
  let writes = 0;
  const repository = {
    async listCommittedRuns() {
      reads += 1;
      return [{ cursor: "committed-cursor" }];
    },
    async createScheduledRun() {
      writes += 1;
      return { id: 1 };
    },
  } as unknown as Pick<typeof repositoryModule, "listCommittedRuns" | "createScheduledRun">;

  const persisted = await persistScheduledFailureIfOwned(41, "claim-token", true, repository);

  assert.equal(persisted, false);
  assert.equal(reads, 0, "an unverified worker must not even read checkpoint state for a failure write");
  assert.equal(writes, 0, "an unverified worker must not create a stale FAILED run");
});

test("scheduler persists a sanitized failure with the last committed cursor while ownership is verified", async () => {
  let reads = 0;
  let writes = 0;
  let saved: Parameters<typeof repositoryModule.createScheduledRun>[2] | undefined;
  const repository = {
    async listCommittedRuns(sourceId: number, take: number) {
      reads += 1;
      assert.equal(sourceId, 41);
      assert.equal(take, 1);
      return [{ cursor: "last-committed-cursor" }];
    },
    async createScheduledRun(
      sourceId: number,
      token: string,
      input: Parameters<typeof repositoryModule.createScheduledRun>[2],
    ) {
      writes += 1;
      assert.equal(sourceId, 41);
      assert.equal(token, "claim-token");
      saved = input;
      return { id: 2 };
    },
  } as unknown as Pick<typeof repositoryModule, "listCommittedRuns" | "createScheduledRun">;

  const persisted = await persistScheduledFailureIfOwned(41, "claim-token", false, repository);

  assert.equal(persisted, true);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.equal(saved?.status, "FAILED");
  assert.equal(saved?.cursor, "last-committed-cursor");
  assert.equal(saved?.errorCode, "ADAPTER_EXECUTION_FAILED");
  assert.equal(saved?.errorSummary, "Scheduled adapter execution failed; inspect protected application logs");
});
