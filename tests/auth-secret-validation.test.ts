import test from "node:test";
import assert from "node:assert/strict";
import {
    hasStrongJwtAccessSecret,
    MIN_JWT_ACCESS_SECRET_BYTES,
} from "../src/config/auth-security";

test("JWT access signing key must contain at least 32 bytes", () => {
    assert.equal(MIN_JWT_ACCESS_SECRET_BYTES, 32);
    assert.equal(hasStrongJwtAccessSecret(undefined), false);
    assert.equal(hasStrongJwtAccessSecret(""), false);
    assert.equal(hasStrongJwtAccessSecret("x".repeat(31)), false);
    assert.equal(hasStrongJwtAccessSecret("x".repeat(32)), true);
    assert.equal(hasStrongJwtAccessSecret("x".repeat(48)), true);
});

test("JWT secret validation measures UTF-8 bytes rather than character count", () => {
    assert.equal(hasStrongJwtAccessSecret("é".repeat(16)), true);
    assert.equal(hasStrongJwtAccessSecret("é".repeat(15)), false);
});
