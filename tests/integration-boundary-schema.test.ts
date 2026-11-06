import test from "node:test";
import assert from "node:assert/strict";
import {
  integrationAdapterPageSchema,
  integrationIngestSchema,
} from "../src/modules/integrations/integration.schema";

const validRecord = {
  source_record_id: "record-001",
  source_version: "v1",
  occurred_at: "2026-11-06T08:00:00.000Z",
  payload: { status: "ACTIVE", score: 42 },
};

test("adapter page envelope rejects unknown fields and invalid continuation state", () => {
  assert.equal(integrationAdapterPageSchema.safeParse({
    records: [validRecord],
    hasMore: true,
    nextCursor: "cursor-1",
  }).success, true);

  assert.equal(integrationAdapterPageSchema.safeParse({
    records: [],
    hasMore: true,
  }).success, false);

  assert.equal(integrationAdapterPageSchema.safeParse({
    records: [],
    hasMore: false,
    unexpected: true,
  }).success, false);

  assert.equal(integrationAdapterPageSchema.safeParse({
    records: Array.from({ length: 501 }, () => validRecord),
    hasMore: false,
  }).success, false);
});

test("ingestion boundary rejects duplicate source IDs in one batch", () => {
  const parsed = integrationIngestSchema.safeParse({
    records: [validRecord, { ...validRecord, source_version: "v2" }],
  });

  assert.equal(parsed.success, false);
});

test("ingestion boundary rejects direct personal identifiers and secret-like payload keys", () => {
  for (const key of ["student_name", "phone", "aadhaar", "email", "password", "api_key", "authorization"]) {
    const parsed = integrationIngestSchema.safeParse({
      records: [{ ...validRecord, payload: { [key]: "not-allowed" } }],
    });
    assert.equal(parsed.success, false, `expected payload key ${key} to be rejected`);
  }
});

test("ingestion boundary rejects excessive payload depth and payload size", () => {
  let nested: Record<string, unknown> = { leaf: "value" };
  for (let i = 0; i < 9; i++) nested = { child: nested };

  assert.equal(integrationIngestSchema.safeParse({
    records: [{ ...validRecord, payload: nested }],
  }).success, false);

  assert.equal(integrationIngestSchema.safeParse({
    records: [{ ...validRecord, payload: { description: "x".repeat(17 * 1024) } }],
  }).success, false);
});

test("ingestion boundary rejects invalid timestamps and extra record properties", () => {
  assert.equal(integrationIngestSchema.safeParse({
    records: [{ ...validRecord, occurred_at: "not-a-date" }],
  }).success, false);

  assert.equal(integrationIngestSchema.safeParse({
    records: [{ ...validRecord, unexpected: true }],
  }).success, false);
});
