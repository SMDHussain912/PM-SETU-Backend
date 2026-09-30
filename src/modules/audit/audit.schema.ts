import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Audit module — request validation (RoadMap.md §22 "AUDIT APIs").
 *
 * GET endpoints have no body. Only route params and query filters are
 * validated. Filters below are INFERRED value-add (RoadMap §22 defines only
 * the two endpoints and an example record shape; it documents no filters).
 * Pagination is the only required query shape, shared with every list
 * endpoint in the project.
 */

export const auditLogIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const auditLogListQuerySchema = paginationQuerySchema.extend({
    /** INFERRED filter — entity type e.g. 'APPROVAL','DOCUMENT','USER'. TO CONFIRM enum vs free text. */
    entity: z.string().trim().min(1).max(50).optional(),
    /** INFERRED filter — numeric entity id in the owning module. */
    entity_id: z.coerce.number().int().positive().optional(),
    /** INFERRED filter — action e.g. 'CREATE','UPDATE','APPROVE','REJECT'. TO CONFIRM enum vs free text. */
    action: z.string().trim().min(1).max(50).optional(),
    /** INFERRED filter — the acting user id (string per req.user.id; TO CONFIRM numeric vs string with DBA). */
    user_id: z.string().trim().min(1).max(255).optional(),
    /** INFERRED filter — approval status e.g. 'PENDING','APPROVED','REJECTED'. TO CONFIRM. */
    approval_status: z.string().trim().min(1).max(50).optional(),
    /** INFERRED filter — ISO-8601 date only (no time). TO CONFIRM format with DBA. */
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

export type AuditLogIdParams = z.infer<typeof auditLogIdParamsSchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;

