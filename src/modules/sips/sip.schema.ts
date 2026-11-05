import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * SIP request schemas.
 *
 * The canonical workflow states are defined by RoadMap §10. Workflow status
 * is intentionally excluded from registry CRUD: status changes must go
 * through the dedicated transition/approval workflow, not generic PATCH.
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
    cluster_id: nullablePositiveId.optional(),
    aip_id: nullablePositiveId.optional(),
}).strict();

export const updateSipSchema = z.object({
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
