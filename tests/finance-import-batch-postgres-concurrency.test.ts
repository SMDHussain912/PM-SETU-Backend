import test from "node:test";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createFinanceImportBatch } from "../src/modules/finance/finance.import-batch.repository";

// This test is deliberately opt-in and accepts only a dedicated test URL.
// Never point PM_SETU_TEST_DATABASE_URL at a production or shared database.
const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL concurrent same-key submissions persist one canonical batch", {
    skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
    if (!databaseUrl) return;
    assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

    const client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const idempotencyKey = randomUUID();
    const fileHash = "c".repeat(64);

    const input = {
        record_kind: "OUTLAY" as const,
        file_sha256: fileHash,
        idempotency_key: idempotencyKey,
        lifecycle: "PREVIEWED" as const,
        total_rows: 1,
        valid_rows: 1,
        invalid_rows: 0,
        rows: [{ row_number: 2, outcome: "VALID" as const }],
    };

    try {
        await client.$connect();

        // Separate Prisma transactions/connection-pool work race on the
        // database's unique idempotency-key constraint.
        const [first, second] = await Promise.all([
            createFinanceImportBatch(input, client),
            createFinanceImportBatch(input, client),
        ]);

        assert.equal(first.id, second.id);

        const persisted = await client.financeImportBatch.findUnique({
            where: { idempotencyKey },
            include: { rows: true },
        });
        assert.ok(persisted);
        assert.equal(persisted.rows.length, 1);
        assert.equal(persisted.rows[0].rowNumber, 2);
        assert.equal(persisted.rows[0].outcome, "VALID");
    } finally {
        await client.financeImportBatch.deleteMany({
            where: { idempotencyKey },
        }).catch(() => undefined);
        await client.$disconnect();
    }
});
