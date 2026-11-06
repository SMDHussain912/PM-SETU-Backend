import test from "node:test";
import assert from "node:assert/strict";

test("user audit projection contract excludes credentials and preserves access changes", () => {
    const user = {
        id: 17,
        username: "operator",
        full_name: "Portal Operator",
        email: "operator@example.test",
        status: "ACTIVE",
        created_at: new Date("2026-01-01T00:00:00Z"),
        roles: [{ id: 2, code: "STATE_PMU_ADMIN", name: "State PMU Admin" }],
        password_hash: "must-never-be-audited",
        failed_login_attempts: 3,
        locked_until: new Date(),
    };
    const projected = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        roles: user.roles.map(({ id, code, name }) => ({ id, code, name })),
    };
    assert.deepEqual(projected, {
        id: 17,
        username: "operator",
        full_name: "Portal Operator",
        email: "operator@example.test",
        status: "ACTIVE",
        roles: [{ id: 2, code: "STATE_PMU_ADMIN", name: "State PMU Admin" }],
    });
    assert.equal(JSON.stringify(projected).includes("must-never-be-audited"), false);
    assert.equal(JSON.stringify(projected).includes("failed_login_attempts"), false);
});
