import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Gallery Management module — request validation.
 *
 * GET endpoints have no body. Only route params and pagination are validated.
 * No filters are documented by §14, so no search/filter params are invented.
 */

export const galleryIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const galleryListQuerySchema = paginationQuerySchema;

/**
 * Admin create — RoadMap §14 admin POST. `title` and `type` are required.
 * The type vocabulary (PHOTO | VIDEO | PRESS_RELEASE) is TO CONFIRM with DBA.
 */
export const createGalleryItemSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).nullable().optional(),
    type: z.string().min(1).max(30),
    media_url: z.string().max(2000).nullable().optional(),
    thumbnail_url: z.string().max(2000).nullable().optional(),
    published_date: z.coerce.date().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    display_order: z.coerce.number().int().min(0).nullable().optional(),
});

/** Admin update — all fields optional (PATCH semantics). */
export const updateGalleryItemSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(2000).nullable().optional(),
    type: z.string().min(1).max(30).optional(),
    media_url: z.string().max(2000).nullable().optional(),
    thumbnail_url: z.string().max(2000).nullable().optional(),
    published_date: z.coerce.date().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    is_published: z.coerce.boolean().nullable().optional(),
    display_order: z.coerce.number().int().min(0).nullable().optional(),
});

export type GalleryIdParams = z.infer<typeof galleryIdParamsSchema>;
export type GalleryListQuery = z.infer<typeof galleryListQuerySchema>;
export type CreateGalleryItemBody = z.infer<typeof createGalleryItemSchema>;
export type UpdateGalleryItemBody = z.infer<typeof updateGalleryItemSchema>;

