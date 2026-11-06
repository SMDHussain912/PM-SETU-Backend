import test from "node:test";
import assert from "node:assert/strict";
import { executeWithRetry } from "../src/modules/integrations/integration.retry";

test("recovers from transient adapter failures without real waiting", async () => {
  let calls = 0;
  const waits: number[] = [];
  const checkpointContext = { sourceCode: "STUDENT_MIS_PRIMARY", cursor: "cursor-42", since: "2026-11-05T10:00:00.000Z" };
  const contexts: typeof checkpointContext[] = [];

  const result = await executeWithRetry(async () => {
    contexts.push(checkpointContext);
    calls += 1;
    if (calls < 3) throw new Error("temporary upstream failure");
    return { records: [], hasMore: false };
  }, {
    attempts: 4,
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.equal(result.exhausted, false);
  assert.equal(result.attempts, 3);
  assert.deepEqual(result.value, { records: [], hasMore: false });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(contexts.every((context) => context === checkpointContext), true);
  assert.deepEqual(contexts[0], {
    sourceCode: "STUDENT_MIS_PRIMARY",
    cursor: "cursor-42",
    since: "2026-11-05T10:00:00.000Z",
  });
});

test("stops after the configured attempt limit and never leaks upstream errors", async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await executeWithRetry(async () => {
    calls += 1;
    throw new Error("secret-bearing provider URL https://provider.invalid/?token=secret");
  }, {
    attempts: 4,
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.deepEqual(result, { attempts: 4, exhausted: true });
  assert.equal(calls, 4);
  assert.deepEqual(waits, [1000, 2000, 4000]);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("caps exponential backoff and validates the attempt limit", async () => {
  const waits: number[] = [];
  const result = await executeWithRetry(async () => {
    throw new Error("offline");
  }, {
    attempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 3000,
    wait: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.equal(result.exhausted, true);
  assert.equal(result.attempts, 5);
  assert.deepEqual(waits, [2000, 3000, 3000, 3000]);
  await assert.rejects(() => executeWithRetry(async () => "ok", { attempts: 0 }), /positive integer/);
});
