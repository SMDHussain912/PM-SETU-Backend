import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type {
    CreateNewsBody,
    NewsListQuery,
    UpdateNewsBody,
} from "./news.schema";
import * as newsRepository from "./news.repository";
import type {
    CreateNewsAttachmentInput,
    News,
} from "./news.types";

/**
 * News Management module — service layer.
 *
 * Owns business rules (pagination composition, not-found handling, admin
 * create/update/delete/publish/archive + attachment attachment) and
 * delegates all data access to the repository.
 *
 * Publish/archive semantics for News use the existing `is_published` boolean
 * (the news contract has NO is_archived column): publish = TRUE, archive =
 * FALSE. This is INFERRED / TO CONFIRM with DBA (sql/news §9–§10).
 */

export interface NewsListResult {
    items: News[];
    meta: PaginationMeta;
}

export async function listNews(query: NewsListQuery): Promise<NewsListResult> {
    const filters = {
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        newsRepository.listNews(filters),
        newsRepository.countNews(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getNewsById(id: number): Promise<News> {
    const news = await newsRepository.getNewsById(id);
    if (!news) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "News not found",
        });
    }
    // Load attachments for detail view
    news.attachments = await newsRepository.getNewsAttachments(id);
    return news;
}

export async function getLatestNews(limit: number = 5): Promise<News[]> {
    return newsRepository.getLatestNews(limit);
}

async function requireNews(id: number): Promise<News> {
    const news = await newsRepository.getNewsById(id);
    if (!news) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "News not found",
        });
    }
    return news;
}

/** POST /admin/news (RoadMap §13). Starts as DRAFT (is_published = FALSE). */
export async function createNews(body: CreateNewsBody): Promise<News> {
    const id = await newsRepository.createNews({
        title: body.title,
        summary: body.summary ?? null,
        content: body.content ?? null,
        published_date: body.published_date ?? null,
        expiry_date: body.expiry_date ?? null,
        category: body.category ?? null,
        cluster_id: body.cluster_id ?? null,
        thumbnail_url: body.thumbnail_url ?? null,
    });
    return requireNews(id);
}

/** PATCH /admin/news/:id — supplied columns only (INFERRED / TO CONFIRM). */
export async function updateNews(id: number, body: UpdateNewsBody): Promise<News> {
    await requireNews(id);
    await newsRepository.updateNews(id, {
        title: body.title,
        summary: body.summary,
        content: body.content,
        published_date: body.published_date,
        expiry_date: body.expiry_date,
        category: body.category,
        cluster_id: body.cluster_id,
        thumbnail_url: body.thumbnail_url,
    });
    return requireNews(id);
}

/** DELETE /admin/news/:id */
export async function deleteNews(id: number): Promise<void> {
    await requireNews(id);
    await newsRepository.deleteNews(id);
}

/** POST /admin/news/:id/publish — is_published = TRUE (INFERRED / TO CONFIRM). */
export async function publishNews(id: number): Promise<News> {
    await requireNews(id);
    await newsRepository.publishNews(id);
    return requireNews(id);
}

/** POST /admin/news/:id/archive — is_published = FALSE (INFERRED / TO CONFIRM). */
export async function archiveNews(id: number): Promise<News> {
    await requireNews(id);
    await newsRepository.archiveNews(id);
    return requireNews(id);
}

/** POST /admin/news/:id/attachments — attach a single file (§24 explicit). */
export async function attachNewsFile(
    id: number,
    input: {
        file_path: string;
        file_name: string;
        mime_type: string;
        file_size: number;
    },
): Promise<News> {
    await requireNews(id);
    const attachmentInput: CreateNewsAttachmentInput = {
        news_id: id,
        file_path: input.file_path,
        file_name: input.file_name,
        mime_type: input.mime_type,
        file_size: input.file_size,
    };
    await newsRepository.createNewsAttachment(attachmentInput);
    return requireNews(id);
}
