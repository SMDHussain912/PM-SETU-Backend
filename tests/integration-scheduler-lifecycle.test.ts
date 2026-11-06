import test from "node:test";
import assert from "node:assert/strict";
import { createSchedulerLifecycle } from "../src/modules/integrations/integration.scheduler.lifecycle";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("scheduler stop waits for the active tick and blocks later ticks", async () => {
  const gate = deferred();
  let executions = 0;
  const lifecycle = createSchedulerLifecycle(async () => {
    executions += 1;
    await gate.promise;
  });

  lifecycle.start();
  lifecycle.trigger();
  lifecycle.trigger();
  await Promise.resolve();
  assert.equal(executions, 1, "overlapping triggers must share one active tick");

  let stopped = false;
  const stopping = lifecycle.stop().then(() => {
    stopped = true;
  });

  lifecycle.trigger();
  await Promise.resolve();
  assert.equal(executions, 1, "stop must prevent a queued future tick");
  assert.equal(stopped, false, "stop must wait while the active tick is running");

  gate.resolve();
  await stopping;
  assert.equal(stopped, true);
  lifecycle.trigger();
  await Promise.resolve();
  assert.equal(executions, 1, "ticks must remain blocked after shutdown");
});

test("scheduler lifecycle can start again after a completed stop", async () => {
  let executions = 0;
  const lifecycle = createSchedulerLifecycle(async () => {
    executions += 1;
  });

  lifecycle.start();
  lifecycle.trigger();
  await lifecycle.stop();
  assert.equal(executions, 1);

  lifecycle.start();
  lifecycle.trigger();
  await lifecycle.stop();
  assert.equal(executions, 2);
});
