import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
    Banner,
    BannerListFilters,
    CreateBannerInput,
    UpdateBannerInput,
} from "./banner.types";

/**
 * Banner Management module — database access layer.
 *
 * The statements below mirror sql/banners/banner_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input
 * is passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * STATUS (full details in sql/banners/banner_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake banner records.
 */

interface BannerRow {
    id: number;
    title: string | null;
    desktop_image_url: string | null;
    mobile_image_url: string | null;
    cta_text: string | null;
    cta_url: string | null;
    display_order: number | null;
    start_date: Date | null;
    end_date: Date | null;
    is_published: boolean | null;
    is_archived: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
}

const BANNER_SELECT = Prisma.sql`
    SELECT
        banners.id                   AS id,
        banners.title                AS title,
        banners.desktop_image_url    AS desktop_image_url,
        banners.mobile_image_url     AS mobile_image_url,
        banners.cta_text             AS cta_text,
        banners.cta_url              AS cta_url,
        banners.display_order        AS display_order,
        banners.start_date           AS start_date,
        banners.end_date             AS end_date,
        banners.is_published         AS is_published,
        banners.is_archived          AS is_archived,
        banners.created_at           AS created_at,
        banners.updated_at           AS updated_at
    FROM banners`;

function mapBannerRow(row: BannerRow): Banner {
    return {
        id: row.id,
        title: row.title,
        desktop_image_url: row.desktop_image_url,
        mobile_image_url: row.mobile_image_url,
        cta_text: row.cta_text,
        cta_url: row.cta_url,
        display_order: row.display_order,
        start_date: row.start_date ? row.start_date.toISOString() : null,
        end_date: row.end_date ? row.end_date.toISOString() : null,
        is_published: row.is_published,
        is_archived: row.is_archived,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

/** GET /banners — published, non-archived list (sql/banners #1). */
export async function listBanners(filters: BannerListFilters): Promise<Banner[]> {
    const rows = await prisma.$queryRaw<BannerRow[]>(
        Prisma.sql`${BANNER_SELECT} WHERE banners.is_published = TRUE AND banners.is_archived = FALSE ORDER BY banners.display_order ASC NULLS LAST, banners.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapBannerRow);
}

/** GET /banners — published count (sql/banners #2). */
export async function countBanners(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM banners WHERE is_published = TRUE AND is_archived = FALSE`,
    );
    return Number(rows[0]?.count ?? 0);
}

/** GET /banners/active — published + date-window aware (sql/banners #3). */
export async function listActiveBanners(filters: BannerListFilters): Promise<Banner[]> {
    const rows = await prisma.$queryRaw<BannerRow[]>(
        Prisma.sql`${BANNER_SELECT} WHERE banners.is_published = TRUE AND banners.is_archived = FALSE AND (banners.start_date IS NULL OR banners.start_date <= now()) AND (banners.end_date IS NULL OR banners.end_date >= now()) ORDER BY banners.display_order ASC NULLS LAST, banners.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapBannerRow);
}

/** GET /banners/active — count (sql/banners #4). */
export async function countActiveBanners(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM banners WHERE is_published = TRUE AND is_archived = FALSE AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now())`,
    );
    return Number(rows[0]?.count ?? 0);
}

/** Shared detail lookup used by admin write paths (sql/banners #6-#10). */
export async function getBannerById(id: number): Promise<Banner | null> {
    const rows = await prisma.$queryRaw<BannerRow[]>(
        Prisma.sql`${BANNER_SELECT} WHERE banners.id = ${id}`,
    );
    return rows[0] ? mapBannerRow(rows[0]) : null;
}

/** POST /admin/banners — new rows start unpublished + unarchived (sql/banners #5). */
export async function createBanner(input: CreateBannerInput): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO banners (title, desktop_image_url, mobile_image_url, cta_text, cta_url, display_order, start_date, end_date, is_published, is_archived)
        VALUES (${input.title}, ${input.desktop_image_url}, ${input.mobile_image_url}, ${input.cta_text}, ${input.cta_url}, ${input.display_order}, ${input.start_date}, ${input.end_date}, FALSE, FALSE)
        RETURNING id`);
    return rows[0].id;
}

/** PATCH /admin/banners/:id — only supplied columns (sql/banners #6). */
export async function updateBanner(id: number, input: UpdateBannerInput): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.title !== undefined) {
        updates.push(Prisma.sql`title = ${input.title}`);
    }
    if (input.desktop_image_url !== undefined) {
        updates.push(Prisma.sql`desktop_image_url = ${input.desktop_image_url}`);
    }
    if (input.mobile_image_url !== undefined) {
        updates.push(Prisma.sql`mobile_image_url = ${input.mobile_image_url}`);
    }
    if (input.cta_text !== undefined) {
        updates.push(Prisma.sql`cta_text = ${input.cta_text}`);
    }
    if (input.cta_url !== undefined) {
        updates.push(Prisma.sql`cta_url = ${input.cta_url}`);
    }
    if (input.display_order !== undefined) {
        updates.push(Prisma.sql`display_order = ${input.display_order}`);
    }
    if (input.start_date !== undefined) {
        updates.push(Prisma.sql`start_date = ${input.start_date}`);
    }
    if (input.end_date !== undefined) {
        updates.push(Prisma.sql`end_date = ${input.end_date}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE banners
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

/** DELETE /admin/banners/:id (sql/banners #7). */
export async function deleteBanner(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM banners WHERE id = ${id}`);
}

/** POST /admin/banners/:id/publish (sql/banners #8). */
export async function publishBanner(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE banners
        SET is_published = TRUE, is_archived = FALSE, updated_at = now()
        WHERE id = ${id}`);
}

/** POST /admin/banners/:id/archive (sql/banners #9). */
export async function archiveBanner(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE banners
        SET is_archived = TRUE, updated_at = now()
        WHERE id = ${id}`);
}

/** POST /admin/banners/:id/images — update row image columns (sql/banners #10). */
export async function updateBannerImages(
    id: number,
    input: { desktop_image_url?: string | null; mobile_image_url?: string | null },
): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.desktop_image_url !== undefined) {
        updates.push(Prisma.sql`desktop_image_url = ${input.desktop_image_url}`);
    }
    if (input.mobile_image_url !== undefined) {
        updates.push(Prisma.sql`mobile_image_url = ${input.mobile_image_url}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE banners
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

