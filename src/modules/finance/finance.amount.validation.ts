import type { Prisma } from "../../generated/prisma/client";

/**
 * PostgreSQL DECIMAL(18,2): at most 16 integer digits and 2 fractional digits.
 * Decimal.js operations are used directly; monetary values never pass through
 * JavaScript Number arithmetic.
 */
export function isValidFinanceAmount(amount: Prisma.Decimal): boolean {
    return amount.isFinite()
        && !amount.isNegative()
        && amount.decimalPlaces() <= 2
        && amount.lessThan("10000000000000000");
}
