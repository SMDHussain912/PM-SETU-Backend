/**
 * Search module — public types.
 *
 * Searchable entities are limited to those with established database tables
 * in the current SQL contracts: clusters, itis, aips, spvs, sips, documents, news.
 *
 * GO, RFP, Circular, and District are NOT included because their tables do not
 * exist yet. They are documented as future integration points in
 * sql/search/search_queries.sql.
 *
 * All searchable fields are INFERRED from existing SQL contracts and are NOT
 * verifiable in RoadMap.md. They are marked TO CONFIRM pending NIC-document
 * verification.
 */

export interface SearchResultItem {
    id: number;
    type: string;
    title: string | null;
    summary: string | null;
    url: string;
    metadata: Record<string, string | number | null>;
}

export interface SearchResponse {
    results: SearchResultItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface SearchFilters {
    q: string;
    type?: string;
    district?: string;
    year?: string;
    category?: string;
    date?: string;
    document_type?: string;
    page: number;
    pageSize: number;
}
