import test from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { getAuditContext } from "../../src/modules/audit/audit.context";

test("audit context captures actor, client IP, user agent and route path", () => {
    const req = {
        user: { id: "42" },
        ip: "203.0.113.8",
        originalUrl: "/api/v1/admin/users/7/roles",
        get: (name: string) => name.toLowerCase() === "user-agent" ? "PM-SETU-Admin/1.0" : undefined,
    } as unknown as Request;

    assert.deepEqual(getAuditContext(req), {
        userId: "42",
        ipAddress: "203.0.113.8",
        userAgent: "PM-SETU-Admin/1.0",
        path: "/api/v1/admin/users/7/roles",
    });
});

test("audit context leaves unavailable request metadata undefined", () => {
    const req = {
        user: undefined,
        ip: "",
        originalUrl: "/api/v1/auth/change-password",
        get: () => undefined,
    } as unknown as Request;

    assert.deepEqual(getAuditContext(req), {
        userId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        path: "/api/v1/auth/change-password",
    });
});
