import assert from "node:assert/strict";
import test from "node:test";
import { createClusterSchema, updateClusterSchema } from "../src/modules/clusters/cluster.schema";

test("cluster creation accepts the three defined master-data fields", () => {
    const result = createClusterSchema.safeParse({
        name: "Coastal Engineering Cluster",
        district: "Kakinada",
        sector: "Engineering",
    });
    assert.equal(result.success, true);
});

test("cluster creation rejects unknown fields", () => {
    const result = createClusterSchema.safeParse({
        name: "Cluster",
        district: "Kakinada",
        sector: "Engineering",
        latitude: 16.9,
    });
    assert.equal(result.success, false);
});

test("cluster updates require at least one supplied field", () => {
    assert.equal(updateClusterSchema.safeParse({}).success, false);
    assert.equal(updateClusterSchema.safeParse({ district: "East Godavari" }).success, true);
});

test("cluster writes reject blank values", () => {
    assert.equal(createClusterSchema.safeParse({
        name: " ",
        district: "Kakinada",
        sector: "Engineering",
    }).success, false);
});
