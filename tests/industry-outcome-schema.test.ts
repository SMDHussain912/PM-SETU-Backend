import assert from "node:assert/strict";
import test from "node:test";
import {
    createOutcomeSchema,
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
