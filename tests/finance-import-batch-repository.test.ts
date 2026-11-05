import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../src/generated/prisma/client";
import {
    createFinanceImportBatch,
    type CreateFinanceImportBatchInput,
} from "../src/modules/finance/finance.import-batch.repository";

const key = "123e4567-e89b-42d3-a456-426614174000";
const hash = "a".repeat(64);

function input(overrides: Partial<CreateFinanceImportBatchInput> = {}): CreateFinanceImportBatchInput {
    return {
        record_kind: "OUTLAY",
        file_sha256: hash,
        idempotency_key: key,
        lifecycle: "PREVIEWED",
        total_rows: 1,
        valid_rows: 1,
        invalid_rows: 0,
        rows: [{ row_number: 2, outcome: "VALID" }],
        ...overrides,
    };
}

function fakeDatabase() {
    let persisted: Record<string, unknown> | null = null;
    const rowDiagnostics: unknown[][] = [];
    let batchInsertAttempts = 0;

    const tx = {
        financeImportBatch: {
            createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
                batchInsertAttempts += 1;
                if (persisted) return { count: 0 };
                persisted = { id: 77, ...data[0] };
                return { count: 1 };
            },
            findUnique: async () => persisted,
        },
        financeImportBatchRow: {
            createMany: async ({ data }: { data: unknown[] }) => {
                rowDiagnostics.push(data);
                return { count: data.length };
            },
        },
    };

    const database = {
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    };

    return {
        database: database as unknown as Pick<PrismaClient, "$transaction">,
        rowDiagnostics,
        get batchInsertAttempts() { return batchInsertAttempts; },
    };
}

test("same-key replay returns the canonical batch without rewriting row diagnostics", async () => {
    const fake = fakeDatabase();
    const first = await createFinanceImportBatch(input(), fake.database);
    const replay = await createFinanceImportBatch(input({
        lifecycle: "INVALID",
        total_rows: 1,
        valid_rows: 0,
        invalid_rows: 1,
        rows: [{ row_number: 2, outcome: "INVALID", error_code: "BAD_ROW" }],
    }), fake.database);

    assert.deepEqual(replay, first);
    assert.equal(fake.batchInsertAttempts, 2);
    assert.equal(fake.rowDiagnostics.length, 1);
    assert.deepEqual(fake.rowDiagnostics[0], [{
        batchId: 77,
        rowNumber: 2,
        outcome: "VALID",
        targetRecordId: null,
        errorCode: null,
        errorMessage: null,
    }]);
});

test("same idempotency key with a different file hash is rejected", async () => {
    const fake = fakeDatabase();
    await createFinanceImportBatch(input(), fake.database);

    await assert.rejects(
        createFinanceImportBatch(input({ file_sha256: "b".repeat(64) }), fake.database),
        /FINANCE_IMPORT_IDEMPOTENCY_KEY_CONFLICT/,
    );
    assert.equal(fake.rowDiagnostics.length, 1);
});

test("same idempotency key with a different record kind is rejected", async () => {
    const fake = fakeDatabase();
    await createFinanceImportBatch(input(), fake.database);

    await assert.rejects(
        createFinanceImportBatch(input({ record_kind: "RELEASE" }), fake.database),
        /FINANCE_IMPORT_IDEMPOTENCY_KEY_CONFLICT/,
    );
    assert.equal(fake.rowDiagnostics.length, 1);
});
