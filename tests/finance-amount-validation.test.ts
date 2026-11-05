import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "../src/generated/prisma/client";
import { isValidFinanceAmount } from "../src/modules/finance/finance.amount.validation";

test("accepts zero and the maximum DECIMAL(18,2) amount", () => {
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("0")), true);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("9999999999999999.99")), true);
});

test("accepts amounts with one or two fractional digits", () => {
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("12.3")), true);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("12.34")), true);
});

test("rejects negative, non-finite, over-precision and over-scale amounts", () => {
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("-0.01")), false);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("1.234")), false);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("10000000000000000")), false);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("Infinity")), false);
    assert.equal(isValidFinanceAmount(new Prisma.Decimal("NaN")), false);
});