import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Cluster module request schemas.
 *
 * Both endpoints are GET — there is no request body to validate. Only the
 * path parameter and the list query string are validated, using the shared
 * validate() middleware (src/middleware/validate.middleware.ts) and the
 * shared pagination schema.
 */

/** GET /clusters/:id */
export const clusterIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * GET /clusters — filters from RoadMap.md §6 "Filtering" (district, sector,
 * search) plus pagination from the shared utility. The §6 ?status= filter
 * example is deferred until a cluster status vocabulary exists.
 */
export const clusterListQuerySchema = paginationQuerySchema.extend({
    district: z.string().trim().min(1).max(100).optional(),
    sector: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type ClusterListQuery = z.infer<typeof clusterListQuerySchema>;
