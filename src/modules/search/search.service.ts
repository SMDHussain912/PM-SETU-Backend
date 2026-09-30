import { buildPaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type { SearchQuery } from "./search.schema";
import * as searchRepository from "./search.repository";
import type { SearchResponse, SearchResultItem } from "./search.types";

/**
 * Search module — service layer.
 *
 * Owns search orchestration (query execution, pagination composition) and
 * delegates all data access to the repository.
 */

export async function search(query: SearchQuery): Promise<SearchResponse> {
    const filters = {
        q: query.q,
        type: query.type,
        district: query.district,
        year: query.year,
        category: query.category,
        date: query.date,
        document_type: query.document_type,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [results, total] = await Promise.all([
        searchRepository.search(filters),
        searchRepository.countSearchResults(filters),
    ]);

    return {
        results,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
}
