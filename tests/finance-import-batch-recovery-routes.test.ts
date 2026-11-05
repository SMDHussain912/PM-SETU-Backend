import test from "node:test";
import assert from "node:assert/strict";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import {
    createFinanceImportRecoveryRouter,
    parseFinanceRecoveryBatchId,
} from "../src/modules/finance/finance.import-batch.recovery.routes";

async function withRecoveryServer(
    router: ReturnType<typeof createFinanceImportRecoveryRouter>,
    run: (baseUrl: string) => Promise<void>,
) {
    const app = express();
    app.use(router);
    app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
        });
    });

    const server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    const address = server.address() as AddressInfo;
    try {
        await run(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close(error => error ? reject(error) : resolve());
        });
    }
}

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

test("authorization denial prevents recovery report resolution", async () => {
    let resolverCalled = false;
    const router = createFinanceImportRecoveryRouter({
        authorize: (_req, res) => {
            res.status(403).json({ success: false, error: { code: "FORBIDDEN" } });
        },
        resolveDownload: async () => {
            resolverCalled = true;
            return null;
        },
    });

    await withRecoveryServer(router, async baseUrl => {
        const response = await fetch(`${baseUrl}/42/recovery-report.json`);
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: "FORBIDDEN" },
        });
    });
    assert.equal(resolverCalled, false, "a denied request must not reach the report resolver");
});

test("authorized request downloads the JSON report with descriptor headers", async () => {
    let resolvedBatchId: number | undefined;
    const body = JSON.stringify({ batch_id: 42, status: "reconciled" });
    const router = createFinanceImportRecoveryRouter({
        authorize: (_req, _res, next) => next(),
        resolveDownload: async batchId => {
            resolvedBatchId = batchId;
            return {
                body,
                content_type: "application/json; charset=utf-8",
                content_disposition: 'attachment; filename="finance-recovery-42.json"',
                cache_control: "no-store",
            };
        },
    });

    await withRecoveryServer(router, async baseUrl => {
        const response = await fetch(`${baseUrl}/42/recovery-report.json`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
        assert.equal(response.headers.get("content-disposition"), 'attachment; filename="finance-recovery-42.json"');
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), { batch_id: 42, status: "reconciled" });
    });
    assert.equal(resolvedBatchId, 42);
});

test("returns 404 when the requested recovery report does not exist", async () => {
    const router = createFinanceImportRecoveryRouter({
        authorize: (_req, _res, next) => next(),
        resolveDownload: async () => null,
    });

    await withRecoveryServer(router, async baseUrl => {
        const response = await fetch(`${baseUrl}/42/recovery-report.json`);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: "FINANCE_RECOVERY_REPORT_NOT_FOUND" },
        });
    });
});

test("returns 400 for an invalid batch identifier without resolving a report", async () => {
    let resolverCalled = false;
    const router = createFinanceImportRecoveryRouter({
        authorize: (_req, _res, next) => next(),
        resolveDownload: async () => {
            resolverCalled = true;
            return null;
        },
    });

    await withRecoveryServer(router, async baseUrl => {
        const response = await fetch(`${baseUrl}/01/recovery-report.json`);
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: "INVALID_BATCH_ID" },
        });
    });
    assert.equal(resolverCalled, false);
});

test("forwards report resolver errors to Express error handling", async () => {
    const router = createFinanceImportRecoveryRouter({
        authorize: (_req, _res, next) => next(),
        resolveDownload: async () => {
            throw new Error("RECOVERY_REPORT_LOOKUP_FAILED");
        },
    });

    await withRecoveryServer(router, async baseUrl => {
        const response = await fetch(`${baseUrl}/42/recovery-report.json`);
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), {
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "RECOVERY_REPORT_LOOKUP_FAILED",
            },
        });
    });
});
