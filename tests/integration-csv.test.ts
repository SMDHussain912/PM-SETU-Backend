import test from "node:test";
import assert from "node:assert/strict";
import { parseIntegrationCsv } from "../src/modules/integrations/integration.csv";

test("parses CSV payload JSON and quoted commas", () => {
  const records = parseIntegrationCsv('source_record_id,source_version,occurred_at,payload_json\nEXT-1,v1,2026-11-05T10:00:00.000Z,"{""event_code"":""ENROLLED"",""note"":""A, B""}"');
  assert.equal(records[0].source_record_id, "EXT-1");
  assert.equal(records[0].payload.note, "A, B");
});
test("rejects invalid CSV headers and unterminated quotes", () => {
  assert.throws(() => parseIntegrationCsv("id,payload\n1,{}"));
  assert.throws(() => parseIntegrationCsv('source_record_id,source_version,occurred_at,payload_json\n1,v1,,"{""a"":1}'));
});
