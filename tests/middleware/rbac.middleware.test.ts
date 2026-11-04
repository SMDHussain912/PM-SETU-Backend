import test from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { requirePermissions, requireRoles } from "../src/middleware/rbac.middleware";

type Middleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => void;

function invoke(
    middleware: Middleware,
    user?: { id: string; roles?: string[]; permissions?: string[] },
) {
    let nextCalls = 0;
    let nextError: unknown;
    const req = { user } as unknown as Request;
    const res = {} as Response;
    const next = ((error?: unknown) => {
        nextCalls += 1;
        nextError = error;
    }) as NextFunction;

    middleware(req, res, next);

    return { nextCalls, nextError };
}

test("requireRoles allows a user with one of the permitted roles", () => {
    const result = invoke(
        requireRoles("state_pmu_admin", "cluster_admin"),
        { id: "10", roles: ["cluster_admin"] },
    );

    assert.equal(result.nextCalls, 1);
    assert.equal(result.nextError, undefined);
});

test("requireRoles denies a user without a permitted role", () => {
    const result = invoke(
        requireRoles("state_pmu_admin", "cluster_admin"),
        { id: "11", roles: ["spoke_iti_user"] },
    );

    assert.equal(result.nextCalls, 1);
    assert.ok(result.nextError);
});

test("requireRoles rejects an unauthenticated request", () => {
    const result = invoke(requireRoles("super_admin"));

    assert.equal(result.nextCalls, 1);
    assert.ok(result.nextError);
});

test("requirePermissions requires every requested permission", () => {
    const allowed = invoke(
        requirePermissions("document.write", "news.write"),
        {
            id: "12",
            permissions: ["document.write", "news.write", "gallery.write"],
        },
    );
    const denied = invoke(
        requirePermissions("document.write", "news.write"),
        { id: "13", permissions: ["document.write"] },
    );

    assert.equal(allowed.nextError, undefined);
    assert.equal(allowed.nextCalls, 1);
    assert.ok(denied.nextError);
    assert.equal(denied.nextCalls, 1);
});

test("requirePermissions rejects an unauthenticated request", () => {
    const result = invoke(requirePermissions("audit.read"));

    assert.equal(result.nextCalls, 1);
    assert.ok(result.nextError);
});
