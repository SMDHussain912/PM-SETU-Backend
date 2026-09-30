/**
 * News Management module — public types.
 *
 * All fields except `id` are sourced from the task brief and are NOT verifiable
 * in RoadMap.md §13 (which defines only one sentence of fields). They are marked
 * TO CONFIRM pending NIC-document verification. The 3 public endpoints (news,
 * news/:id, news/latest) are explicitly supported by §13.
 */

export interface NewsClusterSummary {
    id: number;
    name: string;
}

export interface NewsAttachment {
    id: number;
    file_path: string | null;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    created_at: string | null;
}

export interface News {
    id: number;
    title: string | null;
    summary: string | null;
    content: string | null;
    published_date: string | null;
    expiry_date: string | null;
    category: string | null;
    cluster: NewsClusterSummary | null;
    thumbnail_url: string | null;
    is_published: boolean | null;
    attachments?: NewsAttachment[];
    created_at: string | null;
    updated_at: string | null;
}

export interface NewsListFilters {
    page: number;
    pageSize: number;
}

/**
 * Admin create/update inputs (RoadMap §13). Field list is the existing public
 * contract — INFERRED / TO CONFIRM with DBA. Admin reads (GET /admin/news)
 * are NOT implemented (§13 defines none).
 */
export interface CreateNewsInput {
    title: string;
    summary: string | null;
    content: string | null;
    published_date: Date | null;
    expiry_date: Date | null;
    category: string | null;
    cluster_id: number | null;
    thumbnail_url: string | null;
}

export interface UpdateNewsInput {
    title?: string;
    summary?: string | null;
    content?: string | null;
    published_date?: Date | null;
    expiry_date?: Date | null;
    category?: string | null;
    cluster_id?: number | null;
    thumbnail_url?: string | null;
}

export interface CreateNewsAttachmentInput {
    news_id: number;
    file_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
}

