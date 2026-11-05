import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const clusterIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const clusterListQuerySchema = paginationQuerySchema.extend({
    district: z.string().trim().min(1).max(100).optional(),
    sector: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

const clusterField = z.string().trim().min(1).max(150);

export const createClusterSchema = z.object({
    name: clusterField,
    district: clusterField,
    sector: clusterField,
}).strict();

export const updateClusterSchema = z.object({
    name: clusterField.optional(),
    district: clusterField.optional(),
    sector: clusterField.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one cluster field must be supplied",
});

export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type ClusterListQuery = z.infer<typeof clusterListQuerySchema>;
export type CreateClusterBody = z.infer<typeof createClusterSchema>;
export type UpdateClusterBody = z.infer<typeof updateClusterSchema>;
