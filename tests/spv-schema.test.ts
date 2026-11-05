import assert from "node:assert/strict";
import test from "node:test";
import { createSpvSchema, updateSpvSchema } from "../src/modules/spvs/spv.schema";

const validSpv = { name: "Coastal Industrial SPV", status: "PROPOSED" };

test("SPV creation accepts the minimal registry fields", () => {
    assert.equal(createSpvSchema.safeParse(validSpv).success, true);
});
test("SPV creation accepts nullable cluster and AIP relationships", () => {
    assert.equal(createSpvSchema.safeParse({ ...validSpv, cluster_id: 2, aip_id: 4 }).success, true);
    assert.equal(createSpvSchema.safeParse({ ...validSpv, cluster_id: null, aip_id: null }).success, true);
});
test("SPV creation rejects missing or blank identity and status", () => {
    assert.equal(createSpvSchema.safeParse({ status: "PROPOSED" }).success, false);
    assert.equal(createSpvSchema.safeParse({ ...validSpv, name: " " }).success, false);
    assert.equal(createSpvSchema.safeParse({ ...validSpv, status: "" }).success, false);
});
test("SPV relationship identifiers must be positive integers or null", () => {
    assert.equal(createSpvSchema.safeParse({ ...validSpv, cluster_id: 0 }).success, false);
    assert.equal(createSpvSchema.safeParse({ ...validSpv, aip_id: 1.5 }).success, false);
});
test("SPV creation rejects unknown fields", () => {
    assert.equal(createSpvSchema.safeParse({ ...validSpv, sector: "Manufacturing" }).success, false);
});
test("SPV updates require at least one supported field", () => {
    assert.equal(updateSpvSchema.safeParse({}).success, false);
    assert.equal(updateSpvSchema.safeParse({ status: "OPERATIONAL" }).success, true);
});
test("SPV updates can explicitly clear nullable relationships", () => {
    assert.equal(updateSpvSchema.safeParse({ cluster_id: null, aip_id: null }).success, true);
});
test("SPV lifecycle status remains free text for non-exhaustive NIC examples", () => {
    assert.equal(createSpvSchema.safeParse({ ...validSpv, status: "UNDER_FORMATION" }).success, true);
    assert.equal(createSpvSchema.safeParse({ ...validSpv, status: "CUSTOM_APPROVED_STATE" }).success, true);
});
