import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * ITI module request schemas.
 *
 * All ITI endpoints are GET — there is no request body to validate. Only the
 * path parameters and the list query string are validated, using the shared
 * validate() middleware (src/middleware/validate.middleware.ts).
 */

/** GET /itis/:id */
export const itiIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/** GET /clusters/:clusterId/itis */
export const clusterIdParamsSchema = z.object({
    clusterId: z.coerce.number().int().positive(),
});

/**
 * GET /itis — filters from RoadMap.md §7 "Filtering" plus pagination
 * (page/pageSize come from the shared pagination utility).
 */
export const itiListQuerySchema = paginationQuerySchema.extend({
    district: z.string().trim().min(1).max(100).optional(),
    type: z.enum(["HUB", "SPOKE"]).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

export type ItiIdParams = z.infer<typeof itiIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type ItiListQuery = z.infer<typeof itiListQuerySchema>;
