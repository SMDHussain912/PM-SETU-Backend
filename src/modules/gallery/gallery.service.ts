import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import type {
    CreateGalleryItemBody,
    GalleryListQuery,
    UpdateGalleryItemBody,
} from "./gallery.schema";
import * as galleryRepository from "./gallery.repository";
import type { GalleryItem } from "./gallery.types";

/**
 * Gallery Management module — service layer.
 *
 * Owns business rules (pagination composition, not-found handling, admin
 * create/update/delete) and delegates all data access to the repository.
 */

export interface GalleryListResult {
    items: GalleryItem[];
    meta: PaginationMeta;
}

export async function listGalleryItems(query: GalleryListQuery): Promise<GalleryListResult> {
    const filters = {
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        galleryRepository.listGalleryItems(filters),
        galleryRepository.countGalleryItems(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getGalleryItemById(id: number): Promise<GalleryItem> {
    const item = await galleryRepository.getGalleryItemById(id);
    if (!item) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Gallery item not found",
        });
    }
    return item;
}

export async function listGalleryPhotos(query: GalleryListQuery): Promise<GalleryListResult> {
    const filters = {
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        galleryRepository.listGalleryPhotos(filters),
        galleryRepository.countGalleryPhotos(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function listGalleryVideos(query: GalleryListQuery): Promise<GalleryListResult> {
    const filters = {
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        galleryRepository.listGalleryVideos(filters),
        galleryRepository.countGalleryVideos(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

async function requireGalleryItem(id: number): Promise<GalleryItem> {
    const item = await galleryRepository.getGalleryItemById(id);
    if (!item) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Gallery item not found",
        });
    }
    return item;
}

/** POST /admin/gallery (RoadMap §14). Starts as DRAFT (is_published = FALSE). */
export async function createGalleryItem(body: CreateGalleryItemBody): Promise<GalleryItem> {
    const id = await galleryRepository.createGalleryItem({
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        media_url: body.media_url ?? null,
        thumbnail_url: body.thumbnail_url ?? null,
        published_date: body.published_date ?? null,
        category: body.category ?? null,
        display_order: body.display_order ?? null,
    });
    return requireGalleryItem(id);
}

/** PATCH /admin/gallery/:id — supplied columns only (INFERRED / TO CONFIRM). */
export async function updateGalleryItem(
    id: number,
    body: UpdateGalleryItemBody,
): Promise<GalleryItem> {
    await requireGalleryItem(id);
    await galleryRepository.updateGalleryItem(id, {
        title: body.title,
        description: body.description,
        type: body.type,
        media_url: body.media_url,
        thumbnail_url: body.thumbnail_url,
        published_date: body.published_date,
        category: body.category,
        is_published: body.is_published,
        display_order: body.display_order,
    });
    return requireGalleryItem(id);
}

/** DELETE /admin/gallery/:id */
export async function deleteGalleryItem(id: number): Promise<void> {
    await requireGalleryItem(id);
    await galleryRepository.deleteGalleryItem(id);
}
