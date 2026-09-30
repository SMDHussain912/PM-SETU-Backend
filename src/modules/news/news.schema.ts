import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * News Management module — request validation.
 *
 * GET endpoints have no body. Only route params and pagination are validated.
 * No filters are documented by §13, so no search/filter params are invented.
 */

export const newsIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const newsListQuerySchema = paginationQuerySchema;

/**
 * Admin create — RoadMap §13 admin POST. `title` is required; everything else
 * matches the existing news contract and is INFERRED / TO CONFIRM with DBA.
 */
export const createNewsSchema = z.object({
    title: z.string().min(1).max(500),
    summary: z.string().max(2000).nullable().optional(),
    content: z.string().max(50000).nullable().optional(),
    published_date: z.coerce.date().nullable().optional(),
    expiry_date: z.coerce.date().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    cluster_id: z.coerce.number().int().positive().nullable().optional(),
    thumbnail_url: z.string().max(2000).nullable().optional(),
});

/** Admin update — all fields optional (PATCH semantics). */
export const updateNewsSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    summary: z.string().max(2000).nullable().optional(),
    content: z.string().max(50000).nullable().optional(),
    published_date: z.coerce.date().nullable().optional(),
    expiry_date: z.coerce.date().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    cluster_id: z.coerce.number().int().positive().nullable().optional(),
    thumbnail_url: z.string().max(2000).nullable().optional(),
});

export type NewsIdParams = z.infer<typeof newsIdParamsSchema>;
export type NewsListQuery = z.infer<typeof newsListQuerySchema>;
export type CreateNewsBody = z.infer<typeof createNewsSchema>;
export type UpdateNewsBody = z.infer<typeof updateNewsSchema>;

