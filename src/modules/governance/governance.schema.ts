import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Governance module request schemas.
 *
 * All governance endpoints are GET — there is no request body to validate.
 * Only the path parameter and pagination are validated, using the shared
 * validate() middleware (src/middleware/validate.middleware.ts) and the
 * shared pagination schema. §11 documents no list filters, so none are
 * defined here.
 */

/** GET /governance/members/:id */
export const memberIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * GET /governance and GET /governance/members — pagination only (RoadMap.md
 * §11 documents no list filters).
 */
export const governanceListQuerySchema = paginationQuerySchema;

export type MemberIdParams = z.infer<typeof memberIdParamsSchema>;
export type GovernanceListQuery = z.infer<typeof governanceListQuerySchema>;
