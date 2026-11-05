import test from "node:test";
import assert from "node:assert/strict";
import { integrationScheduleSchema } from "../src/modules/integrations/integration.schema";

test("accepts valid integration schedule intervals and explicit disable", () => {
  assert.equal(integrationScheduleSchema.safeParse({ sync_interval_seconds: 300 }).success, true);
  assert.equal(integrationScheduleSchema.safeParse({ sync_interval_seconds: null }).success, true);
});
test("rejects schedules outside the supported interval", () => {
  assert.equal(integrationScheduleSchema.safeParse({ sync_interval_seconds: 59 }).success, false);
  assert.equal(integrationScheduleSchema.safeParse({ sync_interval_seconds: 86401 }).success, false);
});
