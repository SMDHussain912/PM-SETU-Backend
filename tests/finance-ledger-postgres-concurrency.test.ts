import test from "node:test";
import { assertDedicatedTestDatabaseUrl } from "../helpers/test-database";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
    ingestApprovedOutlay,
    ingestFundRelease,
    ingestExpenditure,
} from "../src/modules/finance/finance.repository";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL concurrent source-identity ingestion is idempotent for all finance ledgers", {
    skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
    if (!databaseUrl) return;
    assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");

    const client = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const suffix = randomUUID();
    const sourceSystem = "PM_SETU_CONCURRENCY_TEST";
    const outlaySourceId = `OUT-${suffix}`;
    const releaseSourceId = `REL-${suffix}`;
    const expenditureSourceId = `EXP-${suffix}`;

    try {
        await client.$connect();

        const outlayInput = {
            source_system: sourceSystem,
            source_record_id: outlaySourceId,
            sanction_reference: `SAN-${suffix}`,
            sanction_date: new Date("2026-04-01T00:00:00.000Z"),
            financial_year: "2026-27",
            approved_amount: new Prisma.Decimal("1000.25"),
            scope_level: "STATE",
        };

        const outlayResults = await Promise.all([
            ingestApprovedOutlay(outlayInput, client),
            ingestApprovedOutlay(outlayInput, client),
        ]);
        const outlaySuccesses = outlayResults.map(result => {
            if ("error" in result) throw new Error(result.error);
            return result;
        });
        assert.deepEqual(outlaySuccesses.map(result => result.outcome).sort(), ["CREATED", "DUPLICATE"]);
        assert.equal(outlaySuccesses[0].item.id, outlaySuccesses[1].item.id);
        const outlayId = outlaySuccesses[0].item.id;

        const releaseInput = {
            source_system: sourceSystem,
            source_record_id: releaseSourceId,
            outlay_id: outlayId,
            release_reference: `RELREF-${suffix}`,
            release_date: new Date("2026-04-02T00:00:00.000Z"),
            financial_year: "2026-27",
            released_amount: new Prisma.Decimal("500.10"),
            recipient_reference: "TEST-RECIPIENT",
        };

        const releaseResults = await Promise.all([
            ingestFundRelease(releaseInput, client),
            ingestFundRelease(releaseInput, client),
        ]);
        const releaseSuccesses = releaseResults.map(result => {
            if ("error" in result) throw new Error(result.error);
            return result;
        });
        assert.deepEqual(releaseSuccesses.map(result => result.outcome).sort(), ["CREATED", "DUPLICATE"]);
        assert.equal(releaseSuccesses[0].item.id, releaseSuccesses[1].item.id);
        const releaseId = releaseSuccesses[0].item.id;

        const expenditureInput = {
            source_system: sourceSystem,
            source_record_id: expenditureSourceId,
            outlay_id: outlayId,
            release_id: releaseId,
            transaction_reference: `TXN-${suffix}`,
            transaction_date: new Date("2026-04-03T00:00:00.000Z"),
            financial_year: "2026-27",
            amount: new Prisma.Decimal("125.05"),
            recognition_basis: "SOURCE_REPORTED",
        };

        const expenditureResults = await Promise.all([
            ingestExpenditure(expenditureInput, client),
            ingestExpenditure(expenditureInput, client),
        ]);
        const expenditureSuccesses = expenditureResults.map(result => {
            if ("error" in result) throw new Error(result.error);
            return result;
        });
        assert.deepEqual(expenditureSuccesses.map(result => result.outcome).sort(), ["CREATED", "DUPLICATE"]);
        assert.equal(expenditureSuccesses[0].item.id, expenditureSuccesses[1].item.id);

        const [outlays, releases, expenditures] = await Promise.all([
            client.financeApprovedOutlay.count({ where: { sourceSystem, sourceRecordId: outlaySourceId } }),
            client.financeFundRelease.count({ where: { sourceSystem, sourceRecordId: releaseSourceId } }),
            client.financeExpenditure.count({ where: { sourceSystem, sourceRecordId: expenditureSourceId } }),
        ]);
        assert.deepEqual({ outlays, releases, expenditures }, { outlays: 1, releases: 1, expenditures: 1 });
    } finally {
        await client.financeExpenditure.deleteMany({
            where: { sourceSystem, sourceRecordId: expenditureSourceId },
        }).catch(() => undefined);
        await client.financeFundRelease.deleteMany({
            where: { sourceSystem, sourceRecordId: releaseSourceId },
        }).catch(() => undefined);
        await client.financeApprovedOutlay.deleteMany({
            where: { sourceSystem, sourceRecordId: outlaySourceId },
        }).catch(() => undefined);
        await client.$disconnect();
    }
});
