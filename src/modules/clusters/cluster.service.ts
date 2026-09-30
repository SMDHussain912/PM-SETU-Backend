import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { ClusterListQuery } from "./cluster.schema";
import * as clusterRepository from "./cluster.repository";
import type { Cluster } from "./cluster.types";

/**
 * Cluster module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer.
 */

export interface ClusterListResult {
    items: Cluster[];
    meta: PaginationMeta;
}

export async function listClusters(query: ClusterListQuery): Promise<ClusterListResult> {
    const filters = {
        district: query.district,
        sector: query.sector,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        clusterRepository.listClusters(filters),
        clusterRepository.countClusters(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getClusterById(id: number): Promise<Cluster> {
    const cluster = await clusterRepository.getClusterById(id);
    if (!cluster) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Cluster not found",
        });
    }
    return cluster;
}
