import assert from "node:assert/strict";
import test from "node:test";
import { createAipSchema, updateAipSchema } from "../src/modules/aips/aip.schema";

const validAip = {
    name: "Coastal Manufacturing Partner",
    sector: "Manufacturing",
    status: "ACTIVE",
};

test("AIP creation accepts required registry fields", () => {
    assert.equal(createAipSchema.safeParse(validAip).success, true);
});

test("AIP creation supports nullable cluster and optional registry details", () => {
    assert.equal(createAipSchema.safeParse({
        ...validAip,
        cluster_id: null,
        logo_url: "https://example.org/logo.png",
        investment_amount: 1250000,
        academic_partner: true,
        contact: "+91 9876543210",
        website: "https://example.org",
    }).success, true);
});

test("AIP academic_partner must be a boolean matching the database model", () => {
    assert.equal(createAipSchema.safeParse({ ...validAip, academic_partner: "Yes" }).success, false);
    assert.equal(createAipSchema.safeParse({ ...validAip, academic_partner: true }).success, true);
});

test("AIP investment amount cannot be negative", () => {
    assert.equal(createAipSchema.safeParse({ ...validAip, investment_amount: -1 }).success, false);
});

test("AIP creation rejects unknown fields", () => {
    assert.equal(createAipSchema.safeParse({ ...validAip, invented_field: "x" }).success, false);
});

test("AIP updates require at least one field", () => {
    assert.equal(updateAipSchema.safeParse({}).success, false);
    assert.equal(updateAipSchema.safeParse({ status: "PARTNERED" }).success, true);
});

test("AIP updates can explicitly clear nullable values", () => {
    assert.equal(updateAipSchema.safeParse({ cluster_id: null, logo_url: null, investment_amount: null }).success, true);
});

test("AIP website and logo values must be valid URLs", () => {
    assert.equal(createAipSchema.safeParse({ ...validAip, website: "not-a-url" }).success, false);
    assert.equal(createAipSchema.safeParse({ ...validAip, logo_url: "not-a-url" }).success, false);
});
