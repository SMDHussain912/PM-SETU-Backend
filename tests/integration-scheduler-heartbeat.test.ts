import test from "node:test";
import assert from "node:assert/strict";
import { createLeaseHeartbeat } from "../src/modules/integrations/integration.scheduler.heartbeat";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("heartbeat serializes renewals and stop waits before the lease can be released", async () => {
  const gate = deferred<boolean>();
  let renewals = 0;
  let lost = 0;
  let errors = 0;
  const heartbeat = createLeaseHeartbeat({
    intervalMs: 60_000,
    renew: async () => {
      renewals += 1;
      return gate.promise;
    },
    onLost: () => { lost += 1; },
    onError: () => { errors += 1; },
  });

  heartbeat.start();
  const activePulse = heartbeat.pulse();
  await Promise.resolve();
  const overlappingPulse = heartbeat.pulse();
  await overlappingPulse;
  assert.equal(renewals, 1, "overlapping heartbeat attempts must be coalesced");

  let stopped = false;
  const stopping = heartbeat.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false, "stop must wait for the in-flight renewal");

  gate.resolve(true);
  await activePulse;
  await stopping;
  assert.equal(stopped, true);
  assert.equal(heartbeat.leaseLost, false);
  assert.equal(lost, 0);
  assert.equal(errors, 0);
});

test("heartbeat marks a lost lease and stops issuing further renewals", async () => {
  let renewals = 0;
  let lost = 0;
  const heartbeat = createLeaseHeartbeat({
    intervalMs: 60_000,
    renew: async () => {
      renewals += 1;
      return false;
    },
    onLost: () => { lost += 1; },
    onError: () => undefined,
  });

  heartbeat.start();
  await heartbeat.pulse();
  await heartbeat.pulse();
  assert.equal(renewals, 1);
  assert.equal(lost, 1);
  assert.equal(heartbeat.leaseLost, true);
  await heartbeat.stop();
});

test("heartbeat records renewal errors as lease loss without rejecting stop", async () => {
  let errors = 0;
  const heartbeat = createLeaseHeartbeat({
    intervalMs: 60_000,
    renew: async () => { throw new Error("database unavailable"); },
    onLost: () => undefined,
    onError: () => { errors += 1; },
  });

  heartbeat.start();
  await heartbeat.pulse();
  assert.equal(heartbeat.leaseLost, true);
  assert.equal(errors, 1);
  await assert.doesNotReject(() => heartbeat.stop());
});
