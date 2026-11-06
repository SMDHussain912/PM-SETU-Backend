import test from "node:test";
import assert from "node:assert/strict";
import { integrationSourceSchema } from "../src/modules/integrations/integration.schema";

const source = (transport: "REST" | "SFTP" | "CSV_UPLOAD" | "WEBHOOK", sync_interval_seconds: number | null) => ({
  code: "TRANSPORT_SCHEDULE_TEST",
  name: "Transport schedule test",
  system: "STUDENT_MIS",
  transport,
  enabled: true,
  sync_interval_seconds,
});

test("REST and SFTP sources may be configured for scheduled polling", () => {
  for (const transport of ["REST", "SFTP"] as const) {
    const result = integrationSourceSchema.safeParse(source(transport, 300));
    assert.equal(result.success, true, `${transport} should support scheduled polling`);
  }
});

test("CSV upload and webhook sources cannot be configured for scheduled polling", () => {
  for (const transport of ["CSV_UPLOAD", "WEBHOOK"] as const) {
    const result = integrationSourceSchema.safeParse(source(transport, 300));
    assert.equal(result.success, false, `${transport} must not support scheduled polling`);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "sync_interval_seconds"));
    }
  }
});

test("push-based sources may remain unscheduled", () => {
  for (const transport of ["CSV_UPLOAD", "WEBHOOK"] as const) {
    const result = integrationSourceSchema.safeParse(source(transport, null));
    assert.equal(result.success, true, `${transport} should remain valid without a schedule`);
  }
});
