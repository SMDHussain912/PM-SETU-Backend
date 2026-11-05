import assert from "node:assert/strict";
import test from "node:test";
import { itiIdParamsSchema } from "../../src/modules/dashboard/dashboard.schema";

test("ITI reporting scope accepts positive integer identifiers", () => {
    assert.deepEqual(itiIdParamsSchema.parse({ id: "42" }), { id: 42 });
});

test("ITI reporting scope rejects zero, negative, fractional, and non-numeric identifiers", () => {
    for (const id of ["0", "-1", "1.5", "abc", ""]) {
        assert.throws(() => itiIdParamsSchema.parse({ id }));
    }
});
