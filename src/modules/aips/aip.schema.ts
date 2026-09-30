import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * AIP module request schemas.
 *
 * Both endpoints are GET — there is no request body to validate. Only the
 * path parameter and the list query string are validated, using the shared
 * validate() middleware (src/middleware/validate.middleware.ts) and the
 * shared pagination schema.
 */

/** GET /aips/:id */
export const aipIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * GET /aips — filters from RoadMap.md §8 "Search/filter" (sector,
 * cluster_id, status, search) plus pagination from the shared utility.
 * `status` is an exact free-string match — the partnership-status vocabulary
 * is TO CONFIRM, so no enum is invented here.
 */
export const aipListQuerySchema = paginationQuerySchema.extend({
    sector: z.string().trim().min(1).max(100).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    status: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

export type AipIdParams = z.infer<typeof aipIdParamsSchema>;
export type AipListQuery = z.infer<typeof aipListQuerySchema>;
