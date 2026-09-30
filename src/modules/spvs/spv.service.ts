import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { SpvListQuery } from "./spv.schema";
import * as spvRepository from "./spv.repository";
import type { Spv } from "./spv.types";

/**
 * SPV module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface SpvListResult {
    items: Spv[];
    meta: PaginationMeta;
}

export async function listSpvs(query: SpvListQuery): Promise<SpvListResult> {
    const [items, total] = await Promise.all([
        spvRepository.listSpvs({ page: query.page, pageSize: query.pageSize }),
        spvRepository.countSpvs(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getSpvById(id: number): Promise<Spv> {
    const spv = await spvRepository.getSpvById(id);
    if (!spv) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "SPV not found",
        });
    }
    return spv;
}

export async function listClusterSpvs(clusterId: number): Promise<Spv[]> {
    return spvRepository.listClusterSpvs(clusterId);
}
