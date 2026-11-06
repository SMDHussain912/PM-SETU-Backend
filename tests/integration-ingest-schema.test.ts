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
