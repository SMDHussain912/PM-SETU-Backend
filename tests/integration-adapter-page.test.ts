import test from "node:test";
import assert from "node:assert/strict";
import { integrationAdapterPageSchema } from "../src/modules/integrations/integration.schema";

test("accepts a terminal page without a continuation cursor", () => {
  assert.equal(integrationAdapterPageSchema.safeParse({ records: [], hasMore: false }).success, true);
});

test("accepts and preserves opaque bounded continuation cursors", () => {
  const cursor = "provider-token+/=opaque";
  const parsed = integrationAdapterPageSchema.safeParse({ records: [], hasMore: true, nextCursor: cursor });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.nextCursor, cursor);
});

test("rejects missing, null, empty, and whitespace continuation cursors", () => {
  for (const nextCursor of [undefined, null, "", "   ", "\\t\\n"]) {
    assert.equal(integrationAdapterPageSchema.safeParse({ records: [], hasMore: true, nextCursor }).success, false);
  }
});

test("rejects cursors longer than the persisted run cursor limit", () => {
  assert.equal(integrationAdapterPageSchema.safeParse({ records: [], hasMore: false, nextCursor: "x".repeat(2001) }).success, false);
});

test("rejects malformed page envelopes and unexpected properties", () => {
  for (const page of [null, {}, { records: "not-an-array", hasMore: false }, { records: [], hasMore: "false" }, { records: [], hasMore: false, unexpected: true }]) {
    assert.equal(integrationAdapterPageSchema.safeParse(page).success, false);
  }
});

test("rejects pages larger than the ingestion batch limit", () => {
  assert.equal(integrationAdapterPageSchema.safeParse({ records: Array.from({ length: 501 }, () => ({})), hasMore: false }).success, false);
});
