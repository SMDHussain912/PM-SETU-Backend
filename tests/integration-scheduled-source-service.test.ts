import test from "node:test";
import assert from "node:assert/strict";
import {
  registerIntegrationAdapter,
  unregisterIntegrationAdapter,
} from "../src/modules/integrations/integration.adapters";
import { runScheduledSource } from "../src/modules/integrations/integration.service";
import * as repositoryModule from "../src/modules/integrations/integration.repository";
import type { IntegrationAdapterContext } from "../src/modules/integrations/integration.types";

const sourceCode = "SCHEDULED_RETRY_SERVICE_TEST";
const claimToken = "2f9b1b58-bb8d-4dd9-a4df-2fcb7d9f07c3";
const completedAt = new Date("2026-11-05T10:00:00.000Z");

function source() {
  return {
    id: 987654321,
    code: sourceCode,
    name: "Scheduled retry service test",
    system: "STUDENT_MIS",
    transport: "REST",
    enabled: true,
    credentialRef: null,
    syncIntervalSeconds: 300,
    nextSyncAt: new Date(),
    claimToken,
  } as unknown as NonNullable<Awaited<ReturnType<typeof repositoryModule.get>>>;
}

test("scheduled retry exhaustion persists a sanitized failure and preserves the committed checkpoint", async () => {
  const contexts: IntegrationAdapterContext[] = [];
  const checkpoint = {
    status: "PARTIAL",
    cursor: "last-committed-cursor",
    completedAt,
  };
  let savedRun: Parameters<typeof repositoryModule.createScheduledRun>[2] | undefined;
  let ingestionCalls = 0;
  let runWrites = 0;

  registerIntegrationAdapter(sourceCode, {
    system: "STUDENT_MIS",
    async fetchPage(context) {
      contexts.push({ ...context });
      throw new Error("https://provider.invalid/feed?access_token=must-not-leak");
    },
  });

  const repository = {
    async listCommittedRuns(sourceId: number, take: number) {
      assert.equal(sourceId, source().id);
      assert.equal(take, 1);
      return [checkpoint];
    },
    async createScheduledRun(
      sourceId: number,
      token: string,
      input: Parameters<typeof repositoryModule.createScheduledRun>[2],
    ) {
      assert.equal(sourceId, source().id);
      assert.equal(token, claimToken);
      savedRun = input;
      runWrites += 1;
      return { id: 1 };
    },
    async ingestBatch() {
      ingestionCalls += 1;
      throw new Error("ingestion must not run after adapter retry exhaustion");
    },
  } as unknown as Parameters<typeof runScheduledSource>[2];

  try {
    await runScheduledSource(source(), claimToken, repository);

    assert.equal(contexts.length, 4, "adapter must be called exactly four times");
    assert.ok(contexts.every((context) => context.cursor === checkpoint.cursor));
    assert.ok(contexts.every((context) => context.since === completedAt.toISOString()));
    assert.ok(contexts.every((context) => context.sourceCode === sourceCode));

    assert.equal(runWrites, 1);
    assert.equal(savedRun?.status, "FAILED");
    assert.equal(savedRun?.cursor, checkpoint.cursor, "failed run must retain the last committed cursor");
    assert.equal(savedRun?.errorCode, "ADAPTER_EXECUTION_FAILED");
    assert.equal(savedRun?.errorSummary, "Adapter request failed after four attempts");
    assert.equal(JSON.stringify(savedRun).includes("must-not-leak"), false);
    assert.equal(ingestionCalls, 0, "failed adapter fetch must not ingest records");
  } finally {
    unregisterIntegrationAdapter(sourceCode);
  }
});

test("scheduled adapter recovery ingests the page using the same committed checkpoint context", async () => {
  const contexts: IntegrationAdapterContext[] = [];
  const checkpoint = {
    status: "SUCCEEDED",
    cursor: "resume-token",
    completedAt,
  };
  let calls = 0;
  let ingestedRecords: unknown[] = [];
  let ingestionOptions: Record<string, unknown> | undefined;
  let runWrites = 0;

  registerIntegrationAdapter(sourceCode, {
    system: "STUDENT_MIS",
    async fetchPage(context) {
      contexts.push({ ...context });
      calls += 1;
      if (calls === 1) throw new Error("temporary provider outage");
      return {
        records: [{ source_record_id: "student-100", payload: { status: "ACTIVE" } }],
        hasMore: false,
      };
    },
  });

  const repository = {
    async listCommittedRuns() {
      return [checkpoint];
    },
    async createScheduledRun() {
      runWrites += 1;
      return { id: 1 };
    },
    async ingestBatch(
      _sourceId: number,
      records: Array<{ source_record_id: string; payload: Record<string, unknown> }>,
      options: Record<string, unknown>,
    ) {
      ingestedRecords = records;
      ingestionOptions = options;
      return { records_read: records.length, records_created: records.length, records_updated: 0, records_rejected: 0 };
    },
  } as unknown as Parameters<typeof runScheduledSource>[2];

  try {
    const result = await runScheduledSource(source(), claimToken, repository);

    assert.equal(calls, 2);
    assert.deepEqual(contexts, [
      { sourceCode, cursor: checkpoint.cursor, since: completedAt.toISOString() },
      { sourceCode, cursor: checkpoint.cursor, since: completedAt.toISOString() },
    ]);
    assert.equal(ingestedRecords.length, 1);
    assert.equal(ingestionOptions?.cursor, null);
    assert.equal(ingestionOptions?.status, "SUCCEEDED");
    assert.equal(ingestionOptions?.claimToken, claimToken);
    assert.equal(runWrites, 0, "non-empty pages commit through the ingestion transaction");
    assert.ok(result);
  } finally {
    unregisterIntegrationAdapter(sourceCode);
  }
});
