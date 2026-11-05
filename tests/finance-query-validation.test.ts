import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/utils/response";
import { validateFinanceLedgerQuery } from "../src/modules/finance/finance.query.validation";
import type { FinanceLedgerQuery } from "../src/modules/finance/finance.query.types";

const validQuery: FinanceLedgerQuery = {
    financial_year: "2026-27",
    page: 1,
    page_size: 25,
};

function expectApiError(run: () => void, code: string) {
    assert.throws(run, (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.code, code);
        assert.equal(error.statusCode, 422);
        return true;
    });
}

test("accepts a valid finance ledger query", () => {
    assert.doesNotThrow(() => validateFinanceLedgerQuery(validQuery));
});

test("requires a non-empty financial year", () => {
    expectApiError(
        () => validateFinanceLedgerQuery({ ...validQuery, financial_year: " " }),
        "FINANCIAL_YEAR_REQUIRED",
    );
});

test("requires positive integer pagination values and caps page size", () => {
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, page: 0 }), "INVALID_PAGE");
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, page: 1.5 }), "INVALID_PAGE");
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, page_size: 0 }), "INVALID_PAGE_SIZE");
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, page_size: 101 }), "INVALID_PAGE_SIZE");
});

test("rejects invalid cluster and ITI scope identifiers", () => {
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, cluster_id: -2 }), "INVALID_FINANCE_SCOPE");
    expectApiError(() => validateFinanceLedgerQuery({ ...validQuery, iti_id: 1.2 }), "INVALID_FINANCE_SCOPE");
});

test("rejects empty project references and invalid as-of dates", () => {
    expectApiError(
        () => validateFinanceLedgerQuery({ ...validQuery, project_reference: " " }),
        "INVALID_PROJECT_REFERENCE",
    );
    expectApiError(
        () => validateFinanceLedgerQuery({ ...validQuery, as_of_date: new Date("not-a-date") }),
        "INVALID_AS_OF_DATE",
    );
});

test("accepts optional scope filters and a valid as-of date", () => {
    assert.doesNotThrow(() => validateFinanceLedgerQuery({
        ...validQuery,
        cluster_id: 3,
        iti_id: 12,
        project_reference: "PMSETU-PROJECT-01",
        as_of_date: new Date("2026-11-05T00:00:00.000Z"),
    }));
});
