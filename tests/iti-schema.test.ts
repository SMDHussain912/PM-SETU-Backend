import assert from "node:assert/strict";
import test from "node:test";
import { createItiSchema, updateItiSchema } from "../src/modules/itis/iti.schema";

const validIti = {
    iti_code: "AP001",
    iti_name: "Government ITI Kakinada",
    type: "HUB" as const,
    district: "Kakinada",
};

test("ITI creation accepts the required master-data fields", () => {
    assert.equal(createItiSchema.safeParse(validIti).success, true);
});

test("ITI creation rejects unsupported fields", () => {
    assert.equal(createItiSchema.safeParse({ ...validIti, invented_field: "x" }).success, false);
});

test("ITI creation rejects an invalid Hub/Spoke type", () => {
    assert.equal(createItiSchema.safeParse({ ...validIti, type: "CENTRE" }).success, false);
});

test("ITI updates require at least one supplied field", () => {
    assert.equal(updateItiSchema.safeParse({}).success, false);
    assert.equal(updateItiSchema.safeParse({ district: "East Godavari" }).success, true);
});

test("ITI updates can explicitly clear nullable fields", () => {
    assert.equal(updateItiSchema.safeParse({ address: null, cluster_id: null }).success, true);
});

test("ITI writes reject blank required text and invalid coordinates", () => {
    assert.equal(createItiSchema.safeParse({ ...validIti, iti_name: " " }).success, false);
    assert.equal(updateItiSchema.safeParse({ latitude: 120 }).success, false);
});
