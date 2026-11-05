import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import { ApiError } from "../../utils/response";
import * as repository from "./finance.repository";
import type { ApprovedOutlayInput, ExpenditureInput, FundReleaseInput } from "./finance.types";

function validateSource(input: { source_system: string; source_record_id: string }) {
    if (!input.source_system.trim() || !input.source_record_id.trim()) {
        throw new ApiError({ statusCode: 422, code: "FINANCE_SOURCE_ID_REQUIRED", message: "source_system and source_record_id are required" });
    }
}

function validateAmount(amount: Prisma.Decimal, field: string) {
    if (!amount.isFinite() || amount.isNegative()) {
        throw new ApiError({ statusCode: 422, code: "INVALID_FINANCIAL_AMOUNT", message: `${field} must be a finite, non-negative decimal amount` });
    }
}

function validateDate(value: Date, field: string) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new ApiError({ statusCode: 422, code: "INVALID_FINANCE_DATE", message: `${field} must be a valid date` });
    }
}

function throwValidation(error: string): never {
    const messages: Record<string, { status: number; message: string }> = {
        CLUSTER_NOT_FOUND: { status: 422, message: "Cluster does not exist" },
        ITI_NOT_FOUND: { status: 422, message: "ITI does not exist" },
        ITI_CLUSTER_MISMATCH: { status: 422, message: "The ITI does not belong to the supplied cluster" },
        OUTLAY_NOT_FOUND: { status: 422, message: "Approved outlay does not exist" },
        RELEASE_NOT_FOUND: { status: 422, message: "Fund release does not exist" },
        RELEASE_OUTLAY_MISMATCH: { status: 422, message: "The selected fund release belongs to a different approved outlay" },
    };
    const detail = messages[error] ?? { status: 422, message: "Finance record validation failed" };
    throw new ApiError({ statusCode: detail.status, code: error, message: detail.message });
}

function isUniqueConstraintError(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Internal ingestion services only. They are deliberately not mounted as HTTP
 * routes until Finance source ownership, permissions and audit policy are approved.
 * Existing source identities are immutable here: changed source payloads require
 * an approved correction/reconciliation workflow, not an implicit overwrite.
 */
export async function ingestApprovedOutlay(input: ApprovedOutlayInput) {
    validateSource(input);
    validateAmount(input.approved_amount, "approved_amount");
    validateDate(input.sanction_date, "sanction_date");
    try {
        return await prisma.$transaction(async (tx) => {
            const result = await repository.ingestApprovedOutlay(input, tx);
            if ("error" in result) throwValidation(result.error);
            return result;
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new ApiError({ statusCode: 409, code: "FINANCE_SOURCE_CONFLICT", message: "This finance source record was ingested concurrently; retry to retrieve the existing record" });
        }
        throw error;
    }
}

export async function ingestFundRelease(input: FundReleaseInput) {
    validateSource(input);
    validateAmount(input.released_amount, "released_amount");
    validateDate(input.release_date, "release_date");
    try {
        return await prisma.$transaction(async (tx) => {
            const result = await repository.ingestFundRelease(input, tx);
            if ("error" in result) throwValidation(result.error);
            return result;
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new ApiError({ statusCode: 409, code: "FINANCE_SOURCE_CONFLICT", message: "This finance source record was ingested concurrently; retry to retrieve the existing record" });
        }
        throw error;
    }
}

export async function ingestExpenditure(input: ExpenditureInput) {
    validateSource(input);
    validateAmount(input.amount, "amount");
    validateDate(input.transaction_date, "transaction_date");
    try {
        return await prisma.$transaction(async (tx) => {
            const result = await repository.ingestExpenditure(input, tx);
            if ("error" in result) throwValidation(result.error);
            return result;
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new ApiError({ statusCode: 409, code: "FINANCE_SOURCE_CONFLICT", message: "This finance source record was ingested concurrently; retry to retrieve the existing record" });
        }
        throw error;
    }
}
