import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { GovernanceListQuery } from "./governance.schema";
import * as governanceRepository from "./governance.repository";
import type { GovernanceMember } from "./governance.types";

/**
 * Governance module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface GovernanceListResult {
    items: GovernanceMember[];
    meta: PaginationMeta;
}

export async function listGovernanceMembers(
    query: GovernanceListQuery,
): Promise<GovernanceListResult> {
    const [items, total] = await Promise.all([
        governanceRepository.listGovernanceMembers(query.page, query.pageSize),
        governanceRepository.countGovernanceMembers(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getGovernanceMemberById(id: number): Promise<GovernanceMember> {
    const member = await governanceRepository.getGovernanceMemberById(id);
    if (!member) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Governance member not found",
        });
    }
    return member;
}
