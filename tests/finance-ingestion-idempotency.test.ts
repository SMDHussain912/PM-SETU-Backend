import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../src/generated/prisma/client";
import {
    ingestApprovedOutlay,
    ingestFundRelease,
    ingestExpenditure,
} from "../src/modules/finance/finance.repository";

function fakeDelegate(existingRecord: Record<string, unknown>) {
    let lookups = 0;
    return {
        findUnique: async () => {
            lookups += 1;
            // The first lookup models the preflight race: another worker wins
            // the unique insert before this worker reaches createMany.
            return lookups === 1 ? null : existingRecord;
        },
        createMany: async () => ({ count: 0 }),
    };
}

test("concurrent duplicate outlay ingestion returns the canonical existing row", async () => {
    const canonical = { id: 101, sourceSystem: "FMS", sourceRecordId: "OUT-1" };
    const tx = {
        financeApprovedOutlay: fakeDelegate(canonical),
        cluster: { findUnique: async () => null },
        iti: { findUnique: async () => null },
    };
    const result = await ingestApprovedOutlay({
        source_system: "FMS",
        source_record_id: "OUT-1",
        sanction_reference: "SAN-1",
        sanction_date: new Date("2026-04-01T00:00:00.000Z"),
        financial_year: "2026-27",
        approved_amount: new Prisma.Decimal("100.25"),
        scope_level: "STATE",
    }, tx as never);

    assert.deepEqual(result, { outcome: "DUPLICATE", item: canonical });
});

test("concurrent duplicate release ingestion returns the canonical existing row", async () => {
    const canonical = { id: 202, sourceSystem: "FMS", sourceRecordId: "REL-1" };
    const tx = {
        financeFundRelease: fakeDelegate(canonical),
        financeApprovedOutlay: { findUnique: async () => ({ id: 1 }) },
    };
    const result = await ingestFundRelease({
        source_system: "FMS",
        source_record_id: "REL-1",
        outlay_id: 1,
        release_reference: "REL-REF-1",
        release_date: new Date("2026-04-02T00:00:00.000Z"),
        financial_year: "2026-27",
        released_amount: new Prisma.Decimal("50.00"),
        recipient_reference: "ITI-1",
    }, tx as never);

    assert.deepEqual(result, { outcome: "DUPLICATE", item: canonical });
});

test("concurrent duplicate expenditure ingestion returns the canonical existing row", async () => {
    const canonical = { id: 303, sourceSystem: "FMS", sourceRecordId: "EXP-1" };
    const tx = {
        financeExpenditure: fakeDelegate(canonical),
        financeApprovedOutlay: { findUnique: async () => ({ id: 1 }) },
    };
    const result = await ingestExpenditure({
        source_system: "FMS",
        source_record_id: "EXP-1",
        outlay_id: 1,
        transaction_reference: "TXN-1",
        transaction_date: new Date("2026-04-03T00:00:00.000Z"),
        financial_year: "2026-27",
        amount: new Prisma.Decimal("25.00"),
        recognition_basis: "SOURCE_REPORTED",
    }, tx as never);

    assert.deepEqual(result, { outcome: "DUPLICATE", item: canonical });
});
