import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { SipListQuery } from "./sip.schema";
import * as sipRepository from "./sip.repository";
import type { Sip } from "./sip.types";

/**
 * SIP module — service layer.
 *
 * Owns the module's business rules (pagination composition, not-found
 * handling) and delegates all data access to the repository. Controllers
 * never talk to the database directly, and no SQL lives above the repository
 * layer. Workflow transitions (submit/review/…/implement) are admin-side and
 * intentionally deferred.
 */

export interface SipListResult {
    items: Sip[];
    meta: PaginationMeta;
}

export async function listSips(query: SipListQuery): Promise<SipListResult> {
    const [items, total] = await Promise.all([
        sipRepository.listSips({ page: query.page, pageSize: query.pageSize }),
        sipRepository.countSips(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getSipById(id: number): Promise<Sip> {
    const sip = await sipRepository.getSipById(id);
    if (!sip) {
        // Same 404 convention the central error middleware uses for missing
        // records (Prisma P2025 → 404 RECORD_NOT_FOUND).
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "SIP not found",
        });
    }
    return sip;
}

export async function listClusterSips(clusterId: number): Promise<Sip[]> {
    return sipRepository.listClusterSips(clusterId);
}
