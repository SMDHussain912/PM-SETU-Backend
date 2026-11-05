import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/** Public read parameters. */
export const spvIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const clusterIdParamsSchema = z.object({ clusterId: z.coerce.number().int().positive() });
export const spvListQuerySchema = paginationQuerySchema;

/**
 * RoadMap §9 does not define a detailed SPV field list. Keep administration
 * within the minimal registry shape already used by public reads.
 * Status remains free text because the lifecycle examples are non-exhaustive.
 */
const spvName = z.string().trim().min(1).max(200);
const spvStatus = z.string().trim().min(1).max(100);
export const createSpvSchema = z.object({
    name: spvName,
    status: spvStatus,
    cluster_id: z.number().int().positive().nullable().optional(),
    aip_id: z.number().int().positive().nullable().optional(),
}).strict();
export const updateSpvSchema = z.object({
    name: spvName.optional(),
    status: spvStatus.optional(),
    cluster_id: z.number().int().positive().nullable().optional(),
    aip_id: z.number().int().positive().nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, {
    message: "At least one SPV field must be supplied",
});
export type SpvIdParams = z.infer<typeof spvIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type SpvListQuery = z.infer<typeof spvListQuerySchema>;
export type CreateSpvBody = z.infer<typeof createSpvSchema>;
export type UpdateSpvBody = z.infer<typeof updateSpvSchema>;
