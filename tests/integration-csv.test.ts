import test from "node:test";
import assert from "node:assert/strict";
import { parseIntegrationCsv } from "../src/modules/integrations/integration.csv";

const header = "source_record_id,source_version,occurred_at,payload_json";

test("parses CSV payload JSON and quoted commas", () => {
  const records = parseIntegrationCsv(`${header}\nEXT-1,v1,2026-11-05T10:00:00.000Z,"{""event_code"":""ENROLLED"",""note"":""A, B""}"`);
  assert.equal(records[0].source_record_id, "EXT-1");
  assert.equal(records[0].payload.note, "A, B");
});

test("parses quoted fields containing line breaks", () => {
  const records = parseIntegrationCsv(`${header}\nEXT-1,v1,,"{\n""note"":""two lines""\n}"`);
  assert.equal(records[0].payload.note, "two lines");
});

test("rejects invalid CSV headers and unterminated quotes", () => {
  assert.throws(() => parseIntegrationCsv("id,payload\n1,{}"));
  assert.throws(() => parseIntegrationCsv(`${header}\n1,v1,,"{""a"":1}`));
});

test("rejects quotes inside unquoted fields and characters after closing quotes", () => {
  assert.throws(() => parseIntegrationCsv(`${header}\nEXT-"1,v1,,"{}"`), /CSV contains a quote inside an unquoted field/);
  assert.throws(() => parseIntegrationCsv(`${header}\nEXT-1,v1,,"{}"tail`), /CSV contains unexpected characters after a closing quote/);
});

test("rejects CSV input above the 1 MB limit", () => {
  assert.throws(() => parseIntegrationCsv("x".repeat(1024 * 1024 + 1)), /CSV must not exceed 1 MB/);
});
