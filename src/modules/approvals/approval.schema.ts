import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";
import {
    APPROVAL_ACTION,
    APPROVAL_ENTITY_TYPE,
    APPROVAL_STATUS,
} from "./approval.types";

/**
 * Approvals module — request validation (RoadMap.md §21 "APPROVAL APIs").
 *
 * GET endpoints have no body. The list endpoint validates pagination plus
 * INFERRED filters (RoadMap §21 documents no filters; these are value-add and
 * TO CONFIRM). Transition endpoints validate a small optional body (remarks)
 * plus the path param.
 *
 * The status/action/entity vocabularies below come from
 * src/modules/approvals/approval.types.ts so the schemas and the type system
 * stay in sync. They are INFERRED / TO CONFIRM.
 */

export const approvalIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const approvalListQuerySchema = paginationQuerySchema.extend({
    /** INFERRED filter — entity type. TO CONFIRM enum vs free text. */
    entity_type: z.nativeEnum(APPROVAL_ENTITY_TYPE).optional(),
    /** INFERRED filter — entity id in the owning module. */
    entity_id: z.coerce.number().int().positive().optional(),
    /** INFERRED filter — approval status. TO CONFIRM. */
    status: z.nativeEnum(APPROVAL_STATUS).optional(),
    /** INFERRED filter — submitted_by user id (string per req.user.id). */
    submitted_by: z.string().trim().min(1).max(255).optional(),
    /** INFERRED filter — reviewed_by user id. */
    reviewed_by: z.string().trim().min(1).max(255).optional(),
    /** INFERRED filter — approved_by user id. */
    approved_by: z.string().trim().min(1).max(255).optional(),
    /** INFERRED filter — ISO-8601 date only. TO CONFIRM format. */
    from: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
        .optional(),
    to: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
        .optional(),
});

/** Optional remarks supplied with an approval action. INFERRED — TO CONFIRM whether required/optional. */
export const approvalTransitionBodySchema = z.object({
    remarks: z.string().trim().min(1).max(2000).optional(),
});

export type ApprovalIdParams = z.infer<typeof approvalIdParamsSchema>;
export type ApprovalListQuery = z.infer<typeof approvalListQuerySchema>;
export type ApprovalTransitionBody = z.infer<typeof approvalTransitionBodySchema>;

