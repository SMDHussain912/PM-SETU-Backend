import assert from "node:assert/strict";
import test from "node:test";
import { clusterIdParamsSchema, itiIdParamsSchema } from "../../src/modules/dashboard/dashboard.schema";

test("ITI reporting scope accepts positive integer identifiers", () => {
    assert.deepEqual(itiIdParamsSchema.parse({ id: "42" }), { id: 42 });
});

test("dashboard detail scopes reject zero, negative, fractional, non-numeric, and unsafe identifiers", () => {
    for (const schema of [clusterIdParamsSchema, itiIdParamsSchema]) {
        for (const id of ["0", "-1", "1.5", "abc", "", "9007199254740992"]) {
            assert.throws(() => schema.parse({ id }), `expected ${id} to be rejected`);
        }
    }
});
