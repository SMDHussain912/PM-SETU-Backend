import test from "node:test";
import assert from "node:assert/strict";
import { resolveCorsOrigins } from "../src/config/cors";

test("development and test can retain the wildcard CORS default", () => {
    assert.equal(resolveCorsOrigins(undefined, false), "*");
    assert.equal(resolveCorsOrigins("  ", false), "*");
    assert.equal(resolveCorsOrigins("*", false), "*");
});

test("production rejects missing, blank and wildcard CORS configuration", () => {
    assert.throws(() => resolveCorsOrigins(undefined, true), /CORS_ORIGIN must contain an explicit/);
    assert.throws(() => resolveCorsOrigins(" ", true), /CORS_ORIGIN must contain an explicit/);
    assert.throws(() => resolveCorsOrigins("*", true), /CORS_ORIGIN must contain an explicit/);
});

test("explicit CORS origins are trimmed, deduplicated and preserved", () => {
    assert.deepEqual(
        resolveCorsOrigins(" https://portal.example.gov.in,https://admin.example.gov.in, https://portal.example.gov.in ", true),
        ["https://portal.example.gov.in", "https://admin.example.gov.in"],
    );
});

test("wildcard cannot be combined with an explicit allowlist", () => {
    assert.throws(
        () => resolveCorsOrigins("https://portal.example.gov.in,*", true),
        /cannot mix wildcard access/,
    );
});
