import test from "node:test";
import assert from "node:assert/strict";
import {
    buildFinanceExpenditureReconciliationWhere,
    buildFinanceReleaseReconciliationWhere,
} from "../src/modules/finance/finance.reconciliation.repository";
import type { FinanceLedgerQuery } from "../src/modules/finance/finance.query.types";

const query: FinanceLedgerQuery = {
    financial_year: "2026-27",
    cluster_id: 4,
    iti_id: 9,
    project_reference: "PROJECT-1",
    as_of_date: new Date("2026-12-31T00:00:00.000Z"),
    page: 1,
    page_size: 25,
};

test("release reconciliation includes records linked to the requested outlay year", () => {
    const where = buildFinanceReleaseReconciliationWhere(query);
    assert.deepEqual(where.OR, [
        { financialYear: "2026-27" },
        { outlay: { financialYear: "2026-27" } },
    ]);
    assert.deepEqual(where.outlay, {
        clusterId: 4,
        itiId: 9,
        projectReference: "PROJECT-1",
    });
    assert.deepEqual(where.releaseDate, { lte: query.as_of_date });
});

test("expenditure reconciliation includes records linked by outlay or release year", () => {
    const where = buildFinanceExpenditureReconciliationWhere(query);
    assert.deepEqual(where.OR, [
        { financialYear: "2026-27" },
        { outlay: { financialYear: "2026-27" } },
        { release: { financialYear: "2026-27" } },
    ]);
    assert.deepEqual(where.outlay, {
        clusterId: 4,
        itiId: 9,
        projectReference: "PROJECT-1",
    });
    assert.deepEqual(where.transactionDate, { lte: query.as_of_date });
});

test("reconciliation predicates omit optional scope and as-of filters when absent", () => {
    const minimal: FinanceLedgerQuery = {
        financial_year: "2026-27",
        page: 1,
        page_size: 25,
    };
    const releaseWhere = buildFinanceReleaseReconciliationWhere(minimal);
    const expenditureWhere = buildFinanceExpenditureReconciliationWhere(minimal);

    assert.deepEqual(releaseWhere.outlay, {});
    assert.equal("releaseDate" in releaseWhere, false);
    assert.deepEqual(expenditureWhere.outlay, {});
    assert.equal("transactionDate" in expenditureWhere, false);
});
