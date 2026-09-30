/**
 * Document Management module — public types.
 *
 * All fields except `id` are sourced from the task brief and are NOT verifiable
 * in RoadMap.md §12 (which defines no field list). They are marked TO CONFIRM
 * pending NIC-document verification. The 6 documented filters (type, cluster_id,
 * year, department, keyword, from/to) are explicitly supported by §12.
 */

export interface DocumentClusterSummary {
    id: number;
    name: string;
}

export interface Document {
    id: number;
    title: string | null;
    document_number: string | null;
    type: string | null;
    department: string | null;
    issue_date: string | null;
    financial_year: string | null;
    cluster: DocumentClusterSummary | null;
    keywords: string | null;
    publish_status: string | null;
    version: number | null;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    original_name: string | null;
    language: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface DocumentVersion {
    id: number;
    document_id: number;
    version: number;
    file_path: string | null;
    file_size: number | null;
    mime_type: string | null;
    original_name: string | null;
    created_by: string | null;
    created_at: string | null;
}

export interface DocumentListFilters {
    type?: string;
    cluster_id?: number;
    year?: string;
    department?: string;
    keyword?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
}

