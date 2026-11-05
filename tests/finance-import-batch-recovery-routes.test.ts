import test from "node:test";
import assert from "node:assert/strict";
import type { RequestHandler } from "express";
import { createFinanceImportRecoveryRouter, parseFinanceRecoveryBatchId } from "../src/modules/finance/finance.import-batch.recovery.routes";

test("accepts only positive safe integer batch identifiers", () => {
    assert.equal(parseFinanceRecoveryBatchId("1"), 1);
    assert.equal(parseFinanceRecoveryBatchId("9007199254740991"), Number.MAX_SAFE_INTEGER);
    for (const value of ["0", "-1", "1.2", "1abc", "", "01", "9007199254740992"]) {
        assert.equal(parseFinanceRecoveryBatchId(value), null);
    }
});

test("requires explicit authorization and report resolver dependencies", () => {
    const authorize = ((_req, _res, next) => next()) as RequestHandler;
    assert.doesNotThrow(() => createFinanceImportRecoveryRouter({
        authorize,
        resolveDownload: async () => null,
    }));
    assert.throws(() => createFinanceImportRecoveryRouter({
        authorize: undefined as never,
        resolveDownload: async () => null,
    }), { message: "FINANCE_RECOVERY_ROUTE_DEPENDENCIES_REQUIRED" });
});

test("router is constructed only through the injected authorization middleware", () => {
    let authorized = false;
    const authorize = ((_req, _res, next) => {
        authorized = true;
        next();
    }) as RequestHandler;
    const router = createFinanceImportRecoveryRouter({
        authorize,
        resolveDownload: async () => null,
    });
    assert.ok(router);
    assert.equal(authorized, false, "authorization must run per request, not at construction");
});
