import assert from "node:assert/strict";
import test from "node:test";
import { toOutcomeAuditSnapshot } from "../src/modules/industry-outcomes/industry-outcome.audit";
import {
    createOutcomeSchema,
    importOutcomeBatchSchema,
    outcomePayloadSchema,
    outcomeListQuerySchema,
    reviewOutcomeSchema,
} from "../src/modules/industry-outcomes/industry-outcome.schema";

const validRecord = {
    outcome_type: "APPRENTICESHIP",
    source_system: "DEMO_MIS",
    source_record_id: "APP-0001",
    cluster_id: 2,
    iti_id: 10,
};

test("industry outcome intake accepts a source-referenced record", () => {
    assert.equal(createOutcomeSchema.safeParse(validRecord).success, true);
});

test("industry outcome intake requires cluster attribution when ITI is supplied", () => {
    const { cluster_id: _clusterId, ...withoutCluster } = validRecord;
    assert.equal(createOutcomeSchema.safeParse(withoutCluster).success, false);
});

test("industry outcome intake rejects unsupported outcome types and unknown fields", () => {
    assert.equal(createOutcomeSchema.safeParse({ ...validRecord, outcome_type: "JOB_OFFER" }).success, false);
    assert.equal(createOutcomeSchema.safeParse({ ...validRecord, approved: true }).success, false);
});

test("industry outcome list validates filters and pagination", () => {
    assert.equal(outcomeListQuerySchema.safeParse({ outcome_type: "OJT", review_status: "PENDING", page: "1" }).success, true);
    assert.equal(outcomeListQuerySchema.safeParse({ review_status: "PUBLISHED" }).success, false);
});

test("industry outcome review only accepts explicit verified or rejected decisions", () => {
    assert.equal(reviewOutcomeSchema.safeParse({ review_status: "VERIFIED", review_note: "Evidence checked" }).success, true);
    assert.equal(reviewOutcomeSchema.safeParse({ review_status: "PENDING" }).success, false);
    assert.equal(reviewOutcomeSchema.safeParse({ review_status: "VERIFIED", is_public: true }).success, false);
});


test("industry outcome batch import accepts between one and 200 raw records", () => {
    assert.equal(importOutcomeBatchSchema.safeParse({ records: [validRecord] }).success, true);
    assert.equal(importOutcomeBatchSchema.safeParse({ records: [] }).success, false);
    assert.equal(importOutcomeBatchSchema.safeParse({ records: Array.from({ length: 201 }, () => validRecord) }).success, false);
    assert.equal(importOutcomeBatchSchema.safeParse({ records: [validRecord], dry_run: true }).success, false);
});


test("industry outcome payload accepts bounded JSON objects", () => {
    assert.equal(outcomePayloadSchema.safeParse({ source: "MIS", count: 12, flags: [true, null] }).success, true);
});

test("industry outcome payload rejects non-JSON values and excessive nesting", () => {
    assert.equal(outcomePayloadSchema.safeParse({ value: Number.POSITIVE_INFINITY }).success, false);
    let nested: unknown = "end";
    for (let depth = 0; depth < 10; depth += 1) nested = { child: nested };
    assert.equal(outcomePayloadSchema.safeParse({ nested }).success, false);
});

test("industry outcome payload enforces a 16 KB serialized size limit", () => {
    assert.equal(outcomePayloadSchema.safeParse({ note: "x".repeat(16 * 1024) }).success, false);
});


test("industry outcome audit snapshots omit participant references, evidence refs and raw payload", () => {
    const snapshot = toOutcomeAuditSnapshot({
        id: 7,
        outcomeType: "PLACEMENT",
        sourceSystem: "DEMO_MIS",
        sourceRecordId: "P-7",
        clusterId: 2,
        itiId: 10,
        employerName: "Example Employer",
        eventDate: new Date("2026-01-01T00:00:00.000Z"),
        reviewStatus: "PENDING",
    });
    assert.deepEqual(Object.keys(snapshot).sort(), [
        "clusterId", "employerName", "eventDate", "id", "itiId",
        "outcomeType", "reviewStatus", "sourceRecordId", "sourceSystem",
    ].sort());
    assert.equal("participantRef" in snapshot, false);
    assert.equal("evidenceRef" in snapshot, false);
    assert.equal("payload" in snapshot, false);
});
