import test from "node:test";
import assert from "node:assert/strict";
import { integrationSourceSchema, integrationRunSchema } from "../src/modules/integrations/integration.schema";
import { INTEGRATION_SYSTEMS } from "../src/modules/integrations/integration.types";

test("supports every architecture-listed integration system", () => {
  for (const system of INTEGRATION_SYSTEMS) assert.equal(integrationSourceSchema.safeParse({ code: system, name: system, system, transport: "REST" }).success, true);
});
test("integration sources default disabled and store secret references only", () => {
  const parsed = integrationSourceSchema.parse({ code: "STUDENT_MIS_PRIMARY", name: "Student MIS", system: "STUDENT_MIS", transport: "REST", credential_ref: "STUDENT_MIS_API_TOKEN" });
  assert.equal(parsed.enabled, false);
  assert.equal(parsed.credential_ref, "STUDENT_MIS_API_TOKEN");
  assert.equal(integrationSourceSchema.safeParse({ code: "STUDENT_MIS_PRIMARY", name: "Student MIS", system: "STUDENT_MIS", transport: "REST", password: "secret" }).success, false);
});
test("rejects malformed codes, transports and credential references", () => {
  assert.equal(integrationSourceSchema.safeParse({ code: "student mis", name: "Student MIS", system: "STUDENT_MIS", transport: "REST" }).success, false);
  assert.equal(integrationSourceSchema.safeParse({ code: "STUDENT_MIS", name: "Student MIS", system: "STUDENT_MIS", transport: "FTP" }).success, false);
  assert.equal(integrationSourceSchema.safeParse({ code: "STUDENT_MIS", name: "Student MIS", system: "STUDENT_MIS", transport: "REST", credential_ref: "Bearer abc123" }).success, false);
});
test("validates sync counts and failure codes", () => {
  assert.equal(integrationRunSchema.safeParse({ status: "SUCCEEDED", records_read: 5, records_created: 2, records_updated: 1, records_rejected: 2 }).success, true);
  assert.equal(integrationRunSchema.safeParse({ status: "FAILED", records_read: 1, records_created: 0, records_updated: 0, records_rejected: 0 }).success, false);
  assert.equal(integrationRunSchema.safeParse({ status: "PARTIAL", records_read: 1, records_created: 1, records_updated: 1, records_rejected: 0 }).success, false);
});
