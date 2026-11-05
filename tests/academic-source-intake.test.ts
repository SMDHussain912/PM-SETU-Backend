import test from "node:test";
import assert from "node:assert/strict";
import { academicRecordSchema, academicBatchSchema } from "../src/modules/academics/academic.schema";
import { buildAcademicScopeWhere } from "../src/modules/academics/academic.access";
import { ROLE_CODES } from "../src/modules/roles/role.constants";

const valid = { kpi_code: "ACD-04", source_system: "STUDENT_MIS", source_record_id: "ADM-1001", cluster_id: 3, iti_id: 8, event_date: "2026-08-01", subject_token: "token-123", payload: { academic_year_code: "2026-27", status_code: "ADMITTED" } };

test("accepts source-neutral records for each documented academic KPI", () => {
    for (const code of ["ACD-01","ACD-02","ACD-03","ACD-04","ACD-05"]) assert.equal(academicRecordSchema.safeParse({ ...valid, kpi_code: code }).success, true);
});
test("requires stable source identifiers and cluster context for ITI records", () => {
    assert.equal(academicRecordSchema.safeParse({ ...valid, source_record_id: "" }).success, false);
    assert.equal(academicRecordSchema.safeParse({ ...valid, cluster_id: undefined }).success, false);
});
test("rejects invalid dates and direct personal identifiers in payload", () => {
    assert.equal(academicRecordSchema.safeParse({ ...valid, event_date: "2026-02-30" }).success, false);
    assert.equal(academicRecordSchema.safeParse({ ...valid, payload: { student_name: "Test Person" } }).success, false);
});
test("limits payload size and batch size", () => {
    assert.equal(academicRecordSchema.safeParse({ ...valid, payload: { blob: "x".repeat(17000) } }).success, false);
    assert.equal(academicBatchSchema.safeParse({ records: Array.from({ length: 201 }, () => valid) }).success, false);
});
test("global roles bypass academic organisation scopes", () => {
    assert.equal(buildAcademicScopeWhere([ROLE_CODES.STATE_PMU_ADMIN], []), undefined);
});
test("cluster and ITI roles receive only compatible assignments", () => {
    assert.deepEqual(buildAcademicScopeWhere([ROLE_CODES.CLUSTER_ADMIN], [{ scopeType: "CLUSTER", scopeId: 4 }, { scopeType: "ITI", scopeId: 9 }]), { OR: [{ clusterId: 4 }] });
    assert.deepEqual(buildAcademicScopeWhere([ROLE_CODES.HUB_ITI_USER], [{ scopeType: "ITI", scopeId: 9 }, { scopeType: "CLUSTER", scopeId: 4 }]), { OR: [{ itiId: 9 }] });
    assert.deepEqual(buildAcademicScopeWhere([ROLE_CODES.SPOKE_ITI_USER], []), { id: -1 });
});
