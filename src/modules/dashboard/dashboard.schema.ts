import { z } from "zod";

/**
 * Dashboard module — request validation.
 *
 * GET endpoints have no body. §16 documents no query parameters, so only
 * the cluster id route param is validated.
 */

export const clusterIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
