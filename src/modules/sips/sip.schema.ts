import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * SIP request schemas.
 *
 * RoadMap §10 establishes the workflow states, while §25 establishes the
 * SIP relationships to Cluster and AIP. The database field contract beyond
 * those references is still pending DBA/NIC confirmation; admin writes
 * therefore accept only these established fields.
 */

export const SIP_STATUSES = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "REVISION_REQUESTED",
    "RECOMMENDED",
    "APPROVED",
    "IMPLEMENTATION",
] as const;

export const sipStatusSchema = z.enum(SIP_STATUSES);

const nullablePositiveId = z.number().int().positive().nullable();

export const createSipSchema = z.object({
    status: sipStatusSchema.default("DRAFT"),
    cluster_id: nullablePositiveId.optional(),
    aip_id: nullablePositiveId.optional(),
}).strict();

export const updateSipSchema = z.object({
    status: sipStatusSchema.optional(),
    cluster_id: nullablePositiveId.optional(),
    aip_id: nullablePositiveId.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
});

export const sipIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const clusterIdParamsSchema = z.object({
    clusterId: z.coerce.number().int().positive(),
});

export const sipListQuerySchema = paginationQuerySchema;

export type CreateSipInput = z.infer<typeof createSipSchema>;
export type UpdateSipInput = z.infer<typeof updateSipSchema>;
export type SipIdParams = z.infer<typeof sipIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type SipListQuery = z.infer<typeof sipListQuerySchema>;
