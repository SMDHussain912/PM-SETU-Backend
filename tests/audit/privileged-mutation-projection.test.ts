import test from "node:test";
import assert from "node:assert/strict";
import { toUserAuditValue } from "../../src/modules/users/user.audit";
import { toRoleAuditValue } from "../../src/modules/roles/role.audit";

test("user audit projection excludes credentials and lockout internals", () => {
    const user = {
        id: 17,
        username: "operator",
        full_name: "Portal Operator",
        email: "operator@example.test",
        status: "ACTIVE" as const,
        created_at: new Date("2026-01-01T00:00:00Z"),
        roles: [{ id: 2, code: "STATE_PMU_ADMIN", name: "State PMU Admin" }],
        password_hash: "must-never-be-audited",
        failed_login_attempts: 3,
        locked_until: new Date(),
    } as unknown as Parameters<typeof toUserAuditValue>[0];

    const projected = toUserAuditValue(user);
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

test("role audit projection preserves permission changes deterministically", () => {
    const role = {
        id: 4,
        code: "REPORT_VIEWER",
        name: "Report Viewer",
        description: null,
        is_system: false,
        permissions: ["report:read", "dashboard:read"],
    };
    assert.deepEqual(toRoleAuditValue(role), {
        id: 4,
        code: "REPORT_VIEWER",
        name: "Report Viewer",
        description: null,
        is_system: false,
        permissions: ["dashboard:read", "report:read"],
    });
});
