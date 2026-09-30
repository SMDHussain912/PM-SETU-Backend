import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { ItiListQuery } from "./iti.schema";
import * as itiRepository from "./iti.repository";
import type { Iti } from "./iti.types";

/**
 * ITI module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface ItiListResult {
    items: Iti[];
    meta: PaginationMeta;
}

export async function listItis(query: ItiListQuery): Promise<ItiListResult> {
    const filters = {
        district: query.district,
        type: query.type,
        cluster_id: query.cluster_id,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        itiRepository.listItis(filters),
        itiRepository.countItis(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getItiById(id: number): Promise<Iti> {
    const iti = await itiRepository.getItiById(id);
    if (!iti) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "ITI not found",
        });
    }
    return iti;
}

export async function listClusterItis(clusterId: number): Promise<Iti[]> {
    return itiRepository.listClusterItis(clusterId);
}
