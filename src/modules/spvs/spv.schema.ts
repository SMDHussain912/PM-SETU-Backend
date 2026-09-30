import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * SPV module request schemas.
 *
 * All SPV endpoints are GET — there is no request body to validate. Only the
 * path parameters and pagination are validated, using the shared validate()
 * middleware (src/middleware/validate.middleware.ts) and the shared
 * pagination schema. §9 documents no list filters, so none are defined here.
 */

/** GET /spvs/:id */
export const spvIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/** GET /clusters/:clusterId/spv */
export const clusterIdParamsSchema = z.object({
    clusterId: z.coerce.number().int().positive(),
});

/**
 * GET /spvs — pagination only (RoadMap.md §9 documents no list filters).
 */
export const spvListQuerySchema = paginationQuerySchema;

export type SpvIdParams = z.infer<typeof spvIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type SpvListQuery = z.infer<typeof spvListQuerySchema>;
