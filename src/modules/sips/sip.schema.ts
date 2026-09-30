import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * SIP module request schemas.
 *
 * All SIP endpoints are GET — there is no request body to validate. Only the
 * path parameters and pagination are validated, using the shared validate()
 * middleware (src/middleware/validate.middleware.ts) and the shared
 * pagination schema. §10 documents no list filters, so none are defined here
 * (the canonical workflow values exist, but no filter/workflow endpoint is
 * in scope — no enum is enforced in code yet).
 */

/** GET /sips/:id */
export const sipIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/** GET /clusters/:clusterId/sip */
export const clusterIdParamsSchema = z.object({
    clusterId: z.coerce.number().int().positive(),
});

/**
 * GET /sips — pagination only (RoadMap.md §10 documents no list filters).
 */
export const sipListQuerySchema = paginationQuerySchema;

export type SipIdParams = z.infer<typeof sipIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type SipListQuery = z.infer<typeof sipListQuerySchema>;
