import assert from "node:assert/strict";
import test from "node:test";
import {
    createSipSchema,
    SIP_STATUSES,
    updateSipSchema,
} from "../src/modules/sips/sip.schema";

test("SIP creation accepts optional nullable Cluster and AIP relationships", () => {
    assert.equal(createSipSchema.safeParse({}).success, true);
    assert.equal(createSipSchema.safeParse({ cluster_id: 2, aip_id: 4 }).success, true);
    assert.equal(createSipSchema.safeParse({ cluster_id: null, aip_id: null }).success, true);
});

test("SIP creation rejects invalid relationship identifiers", () => {
    assert.equal(createSipSchema.safeParse({ cluster_id: 0 }).success, false);
    assert.equal(createSipSchema.safeParse({ aip_id: 1.5 }).success, false);
    assert.equal(createSipSchema.safeParse({ cluster_id: "2" }).success, false);
});

test("SIP creation rejects unknown fields and caller-supplied workflow status", () => {
    assert.equal(createSipSchema.safeParse({ unknown_field: true }).success, false);
    assert.equal(createSipSchema.safeParse({ status: "APPROVED" }).success, false);
});

test("SIP updates require at least one supported relationship field", () => {
    assert.equal(updateSipSchema.safeParse({}).success, false);
    assert.equal(updateSipSchema.safeParse({ cluster_id: 3 }).success, true);
    assert.equal(updateSipSchema.safeParse({ aip_id: null }).success, true);
});

test("SIP updates cannot bypass the workflow by changing status", () => {
    for (const status of SIP_STATUSES) {
        assert.equal(updateSipSchema.safeParse({ status }).success, false);
    }
});

test("SIP updates reject unknown fields", () => {
    assert.equal(updateSipSchema.safeParse({ proposed_investment: 1000 }).success, false);
});
