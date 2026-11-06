import test from "node:test";
import assert from "node:assert/strict";
import { integrationIngestSchema } from "../src/modules/integrations/integration.schema";

const record = (source_record_id: string) => ({
  source_record_id,
  source_version: "1",
  occurred_at: null,
  payload: { fixture: true },
});

test("accepts a batch with distinct source record identities", () => {
  const result = integrationIngestSchema.safeParse({
    records: [record("record-a"), record("record-b")],
  });
  assert.equal(result.success, true);
});

test("rejects duplicate source record identities in one batch", () => {
  const result = integrationIngestSchema.safeParse({
    records: [record("record-a"), record("record-b"), record("record-a")],
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) =>
      issue.path[0] === "records" &&
      issue.path[1] === 2 &&
      issue.path[2] === "source_record_id",
    ));
  }
});

test("rejects identities that become duplicates after schema trimming", () => {
  const result = integrationIngestSchema.safeParse({
    records: [record("record-a"), record(" record-a ")],
  });
  assert.equal(result.success, false);
});

test("rejects a batch whose aggregate serialized size exceeds 1 MB", () => {
  const largeRecord = (source_record_id: string) => ({
    source_record_id,
    payload: { data: "x".repeat(15_000) },
  });
  const result = integrationIngestSchema.safeParse({
    records: Array.from({ length: 70 }, (_, index) => largeRecord(`large-${index}`)),
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) =>
      issue.message.includes("must not exceed 1 MB"),
    ));
  }
});

test("rejects non-serializable payload objects without throwing from validation", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.doesNotThrow(() => integrationIngestSchema.safeParse({
    records: [{ source_record_id: "circular-record", payload: circular }],
  }));
  assert.equal(integrationIngestSchema.safeParse({
    records: [{ source_record_id: "circular-record", payload: circular }],
  }).success, false);
});

test("rejects payloads with excessive node counts before serializing the object", () => {
  const result = integrationIngestSchema.safeParse({
    records: [{
      source_record_id: "wide-payload",
      payload: { values: Array.from({ length: 10_001 }, (_, index) => index) },
    }],
  });
  assert.equal(result.success, false);
});

test("rejects a single oversized payload string", () => {
  const result = integrationIngestSchema.safeParse({
    records: [{ source_record_id: "large-string", payload: { value: "x".repeat(16_385) } }],
  });
  assert.equal(result.success, false);
});
