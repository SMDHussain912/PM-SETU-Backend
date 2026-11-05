import test from "node:test";
import assert from "node:assert/strict";
import { integrationIngestSchema } from "../src/modules/integrations/integration.schema";

const record = { source_record_id: "EXT-001", source_version: "v1", occurred_at: "2026-11-05T10:00:00.000Z", payload: { event_code: "ENROLLED", academic_year: "2026-27" } };
test("accepts bounded source-neutral integration batches", () => {
  assert.equal(integrationIngestSchema.safeParse({ records: [record] }).success, true);
});
test("enforces stable external IDs and batch bounds", () => {
  assert.equal(integrationIngestSchema.safeParse({ records: [{ ...record, source_record_id: "" }] }).success, false);
  assert.equal(integrationIngestSchema.safeParse({ records: Array.from({ length: 501 }, (_, i) => ({ ...record, source_record_id: String(i) })) }).success, false);
});
test("rejects direct personal identifiers and secrets in integration payloads", () => {
  assert.equal(integrationIngestSchema.safeParse({ records: [{ ...record, payload: { student_name: "Example" } }] }).success, false);
  assert.equal(integrationIngestSchema.safeParse({ records: [{ ...record, payload: { api_key: "secret" } }] }).success, false);
});
test("rejects malformed timestamps and oversized payloads", () => {
  assert.equal(integrationIngestSchema.safeParse({ records: [{ ...record, occurred_at: "yesterday" }] }).success, false);
  assert.equal(integrationIngestSchema.safeParse({ records: [{ ...record, payload: { blob: "x".repeat(17000) } }] }).success, false);
});
