import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
    CreateGalleryItemInput,
    GalleryItem,
    GalleryListFilters,
    UpdateGalleryItemInput,
} from "./gallery.types";

/**
 * Gallery Management module — database access layer.
 *
 * The statements below mirror sql/gallery/gallery_queries.sql, the
 * DBA-maintained copy. If a query changes, update BOTH files. All user input is
 * passed through tagged-template interpolation (bound parameters) — never
 * string-concatenate values, never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/gallery/gallery_queries.sql):
 *   The PM SETU tables do not exist yet. Until the DBA creates the real
 *   schema, these queries fail at runtime and the endpoints return a 500
 *   error envelope. That is intentional: no fake gallery records.
 */

interface GalleryItemRow {
    id: number;
    title: string | null;
    description: string | null;
    type: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    published_date: Date | null;
    category: string | null;
    is_published: boolean | null;
    display_order: number | null;
    created_at: Date | null;
    updated_at: Date | null;
}

const GALLERY_SELECT = Prisma.sql`
    SELECT
        gallery_items.id                AS id,
        gallery_items.title             AS title,
        gallery_items.description       AS description,
        gallery_items.type              AS type,
        gallery_items.media_url         AS media_url,
        gallery_items.thumbnail_url     AS thumbnail_url,
        gallery_items.published_date    AS published_date,
        gallery_items.category          AS category,
        gallery_items.is_published      AS is_published,
        gallery_items.display_order     AS display_order,
        gallery_items.created_at        AS created_at,
        gallery_items.updated_at        AS updated_at
    FROM gallery_items`;

function mapGalleryItemRow(row: GalleryItemRow): GalleryItem {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        media_url: row.media_url,
        thumbnail_url: row.thumbnail_url,
        published_date: row.published_date ? row.published_date.toISOString() : null,
        category: row.category,
        is_published: row.is_published,
        display_order: row.display_order,
        created_at: row.created_at ? row.created_at.toISOString() : null,
        updated_at: row.updated_at ? row.updated_at.toISOString() : null,
    };
}

export async function listGalleryItems(filters: GalleryListFilters): Promise<GalleryItem[]> {
    const rows = await prisma.$queryRaw<GalleryItemRow[]>(
        Prisma.sql`${GALLERY_SELECT} ORDER BY gallery_items.display_order ASC NULLS LAST, gallery_items.published_date DESC NULLS LAST, gallery_items.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapGalleryItemRow);
}

export async function countGalleryItems(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM gallery_items`,
    );
    return Number(rows[0]?.count ?? 0);
}

export async function getGalleryItemById(id: number): Promise<GalleryItem | null> {
    const rows = await prisma.$queryRaw<GalleryItemRow[]>(
        Prisma.sql`${GALLERY_SELECT} WHERE gallery_items.id = ${id}`,
    );
    return rows[0] ? mapGalleryItemRow(rows[0]) : null;
}

export async function listGalleryPhotos(filters: GalleryListFilters): Promise<GalleryItem[]> {
    const rows = await prisma.$queryRaw<GalleryItemRow[]>(
        Prisma.sql`${GALLERY_SELECT} WHERE gallery_items.type = 'PHOTO' ORDER BY gallery_items.display_order ASC NULLS LAST, gallery_items.published_date DESC NULLS LAST, gallery_items.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapGalleryItemRow);
}

export async function countGalleryPhotos(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM gallery_items WHERE type = 'PHOTO'`,
    );
    return Number(rows[0]?.count ?? 0);
}

export async function listGalleryVideos(filters: GalleryListFilters): Promise<GalleryItem[]> {
    const rows = await prisma.$queryRaw<GalleryItemRow[]>(
        Prisma.sql`${GALLERY_SELECT} WHERE gallery_items.type = 'VIDEO' ORDER BY gallery_items.display_order ASC NULLS LAST, gallery_items.published_date DESC NULLS LAST, gallery_items.id DESC LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`,
    );
    return rows.map(mapGalleryItemRow);
}

export async function countGalleryVideos(): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM gallery_items WHERE type = 'VIDEO'`,
    );
    return Number(rows[0]?.count ?? 0);
}

/* ---------------------------------------------------------------------------
 * ADMIN (RoadMap §14 + §24) — mirrors sql/gallery/gallery_queries.sql (§8–§10).
 * All are INFERRED / TO CONFIRM with DBA.
 * ------------------------------------------------------------------------- */

/** POST /admin/gallery — insert as DRAFT (is_published = FALSE). Returns id. */
export async function createGalleryItem(
    input: CreateGalleryItemInput,
): Promise<number> {
    const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
        INSERT INTO gallery_items (title, description, type, media_url,
                                   thumbnail_url, published_date, category,
                                   is_published, display_order)
        VALUES (${input.title}, ${input.description}, ${input.type}, ${input.media_url},
                ${input.thumbnail_url}, ${input.published_date}, ${input.category},
                FALSE, ${input.display_order})
        RETURNING id`);
    return rows[0].id;
}

/** PATCH /admin/gallery/:id — only supplied columns. */
export async function updateGalleryItem(
    id: number,
    input: UpdateGalleryItemInput,
): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.title !== undefined) {
        updates.push(Prisma.sql`title = ${input.title}`);
    }
    if (input.description !== undefined) {
        updates.push(Prisma.sql`description = ${input.description}`);
    }
    if (input.type !== undefined) {
        updates.push(Prisma.sql`type = ${input.type}`);
    }
    if (input.media_url !== undefined) {
        updates.push(Prisma.sql`media_url = ${input.media_url}`);
    }
    if (input.thumbnail_url !== undefined) {
        updates.push(Prisma.sql`thumbnail_url = ${input.thumbnail_url}`);
    }
    if (input.published_date !== undefined) {
        updates.push(Prisma.sql`published_date = ${input.published_date}`);
    }
    if (input.category !== undefined) {
        updates.push(Prisma.sql`category = ${input.category}`);
    }
    if (input.is_published !== undefined) {
        updates.push(Prisma.sql`is_published = ${input.is_published}`);
    }
    if (input.display_order !== undefined) {
        updates.push(Prisma.sql`display_order = ${input.display_order}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE gallery_items
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

/** DELETE /admin/gallery/:id */
export async function deleteGalleryItem(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM gallery_items WHERE id = ${id}`);
}
