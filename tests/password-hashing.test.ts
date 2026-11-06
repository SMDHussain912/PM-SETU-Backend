import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
    hashPassword,
    needsPasswordRehash,
    verifyPassword,
} from "../src/utils/password";

test("new password hashes verify the full password beyond bcrypt's 72-byte limit", async () => {
    const password = "A".repeat(90) + "🔐-tail";
    const hash = await hashPassword(password);

    assert.equal(needsPasswordRehash(hash), false);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword(password.slice(0, 72), hash), false);
    assert.equal(await verifyPassword(password + "-wrong", hash), false);
});

test("legacy bcrypt hashes remain verifiable and are marked for upgrade", async () => {
    const password = "legacy-password-under-72-bytes";
    const legacyHash = await bcrypt.hash(password, 4);

    assert.equal(needsPasswordRehash(legacyHash), true);
    assert.equal(await verifyPassword(password, legacyHash), true);
    assert.equal(await verifyPassword("different-password", legacyHash), false);
});
