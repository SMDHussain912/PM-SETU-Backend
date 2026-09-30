import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
    CreateNewsAttachmentInput,
    CreateNewsInput,
    News,
    NewsAttachment,
    NewsListFilters,
    UpdateNewsInput,
} from "./news.types";

/**
 * News Management module — database access layer.
 *
 * The statements below mirror sql/news/news_queries.sql, the DBA-maintained
 * copy. If a query changes, update BOTH files. All user input is passed
 * through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/news/news_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake news records.
 */

interface NewsRow {
    id: number;
    title: string | null;
    summary: string | null;
    content: string | null;
    published_date: Date | null;
    expiry_date: Date | null;
    category: string | null;
    cluster_id: number | null;
    cluster_name: string | null;
    thumbnail_url: string | null;
    is_published: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
}

interface NewsAttachmentRow {
    id: number;
    news_id: number;
    file_path: string | null;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    created_at: Date | null;
}

const NEWS_SELECT = Prisma.sql`
    SELECT
        news.id                    AS id,
        news.title                 AS title,
        news.summary               AS summary,
        news.content               AS content,
        news.published_date        AS published_date,
        news.expiry_date           AS expiry_date,
        news.category              AS category,
        clusters.id                AS cluster_id,
        clusters.name              AS cluster_name,
        news.thumbnail_url         AS thumbnail_url,
        news.is_published          AS is_published,
        news.created_at            AS created_at,
        news.updated_at            AS updated_at
    FROM news
    LEFT JOIN clusters ON clusters.id = news.cluster_id`;

function mapNewsRow(row: NewsRow): News {
    return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        content: row.content,
        published_date: row.published_date ? row.published_date.toISOString() : null,
        expiry_date: row.expiry_date ? row.expiry_date.toISOString() : null,
        category: row.category,
        cluster:
            row.cluster_id === null
                ? null
                : { id: row.cluster_id, name: row.cluster_name ?? "" },
        thumbnail_url: row.thumbnail_url,
        is_published: row.is_published,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

function mapAttachmentRow(row: NewsAttachmentRow): NewsAttachment {
    return {
        id: row.id,
        file_path: row.file_path,
        file_name: row.file_name,
        mime_type: row.mime_type,
        file_size: row.file_size,
        created_at: row.created_at ? row.created_at.toISOString() : null,
    };
}

export async function listNews(filters: NewsListFilters): Promise<News[]> {
    const rows = await prisma.$queryRaw<NewsRow[]>(
        Prisma.sql`${NEWS_SELECT} ORDER BY news.published_date DESC, news.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapNewsRow);
}

export async function countNews(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM news`,
    );
    return Number(rows[0]?.count ?? 0);
}

export async function getNewsById(id: number): Promise<News | null> {
    const rows = await prisma.$queryRaw<NewsRow[]>(
        Prisma.sql`${NEWS_SELECT} WHERE news.id = ${id}`,
    );
    return rows[0] ? mapNewsRow(rows[0]) : null;
}

export async function getLatestNews(limit: number = 5): Promise<News[]> {
    const rows = await prisma.$queryRaw<NewsRow[]>(
        Prisma.sql`${NEWS_SELECT} ORDER BY news.published_date DESC, news.id DESC LIMIT ${limit}`,
    );
    return rows.map(mapNewsRow);
}

export async function getNewsAttachments(newsId: number): Promise<NewsAttachment[]> {
    const rows = await prisma.$queryRaw<NewsAttachmentRow[]>(
        Prisma.sql`
            SELECT
                id,
                news_id,
                file_path,
                file_name,
                mime_type,
                file_size,
                created_at
            FROM news_attachments
            WHERE news_id = ${newsId}
            ORDER BY created_at DESC, id DESC`,
    );
    return rows.map(mapAttachmentRow);
}

/* ---------------------------------------------------------------------------
 * ADMIN (RoadMap §13 + §24) — mirrors sql/news/news_queries.sql (§6–§11).
 * All are INFERRED / TO CONFIRM with DBA.
 * ------------------------------------------------------------------------- */

/** POST /admin/news — insert as DRAFT (is_published = FALSE). Returns new id. */
export async function createNews(input: CreateNewsInput): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO news (title, summary, content, published_date, expiry_date,
                          category, cluster_id, thumbnail_url, is_published)
        VALUES (${input.title}, ${input.summary}, ${input.content}, ${input.published_date}, ${input.expiry_date},
                ${input.category}, ${input.cluster_id}, ${input.thumbnail_url}, FALSE)
        RETURNING id`);
    return rows[0].id;
}

/** PATCH /admin/news/:id — only supplied columns. */
export async function updateNews(id: number, input: UpdateNewsInput): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.title !== undefined) {
        updates.push(Prisma.sql`title = ${input.title}`);
    }
    if (input.summary !== undefined) {
        updates.push(Prisma.sql`summary = ${input.summary}`);
    }
    if (input.content !== undefined) {
        updates.push(Prisma.sql`content = ${input.content}`);
    }
    if (input.published_date !== undefined) {
        updates.push(Prisma.sql`published_date = ${input.published_date}`);
    }
    if (input.expiry_date !== undefined) {
        updates.push(Prisma.sql`expiry_date = ${input.expiry_date}`);
    }
    if (input.category !== undefined) {
        updates.push(Prisma.sql`category = ${input.category}`);
    }
    if (input.cluster_id !== undefined) {
        updates.push(Prisma.sql`cluster_id = ${input.cluster_id}`);
    }
    if (input.thumbnail_url !== undefined) {
        updates.push(Prisma.sql`thumbnail_url = ${input.thumbnail_url}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE news
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

/** DELETE /admin/news/:id */
export async function deleteNews(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM news WHERE id = ${id}`);
}

/** POST /admin/news/:id/publish — is_published = TRUE (INFERRED / TO CONFIRM). */
export async function publishNews(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE news
        SET is_published = TRUE, updated_at = now()
        WHERE id = ${id}`);
}

/** POST /admin/news/:id/archive — is_published = FALSE (INFERRED / TO CONFIRM). */
export async function archiveNews(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE news
        SET is_published = FALSE, updated_at = now()
        WHERE id = ${id}`);
}

/** POST /admin/news/:id/attachments — insert attachment metadata (§24). */
export async function createNewsAttachment(
    input: CreateNewsAttachmentInput,
): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO news_attachments (news_id, file_path, file_name, mime_type,
                                      file_size)
        VALUES (${input.news_id}, ${input.file_path}, ${input.file_name}, ${input.mime_type}, ${input.file_size})
        RETURNING id`);
    return rows[0].id;
}
