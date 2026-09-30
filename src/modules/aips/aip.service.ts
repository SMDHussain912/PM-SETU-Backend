import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { AipListQuery } from "./aip.schema";
import * as aipRepository from "./aip.repository";
import type { Aip } from "./aip.types";

/**
 * AIP module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface AipListResult {
    items: Aip[];
    meta: PaginationMeta;
}

export async function listAips(query: AipListQuery): Promise<AipListResult> {
    const filters = {
        sector: query.sector,
        cluster_id: query.cluster_id,
        status: query.status,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        aipRepository.listAips(filters),
        aipRepository.countAips(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getAipById(id: number): Promise<Aip> {
    const aip = await aipRepository.getAipById(id);
    if (!aip) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "AIP not found",
        });
    }
    return aip;
}
