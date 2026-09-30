import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { AUDIT_READ_ROLES } from "../../modules/roles/role.constants";
import {
    listAuditLogs,
    getAuditLogById,
} from "./audit.controller";
import {
    auditLogIdParamsSchema,
    auditLogListQuerySchema,
} from "./audit.schema";

/**
 * Audit module — routes (RoadMap.md §22 "AUDIT APIs").
 *
 *   GET /admin/audit-logs        — paginated list with INFERRED filters
 *   GET /admin/audit-logs/:id    — single audit entry detail
 *
 * Auth: every route is behind requireAuth.
 * Authorization: requires AUDIT_READ_ROLES (INFERRED / TO CONFIRM).
 * The audit log is append-only; there are no POST/PATCH/DELETE audit endpoints.
 * Audit entries are created internally by trusted services only (see
 * audit.service.recordAuditEntry()).
 *
 * Middleware order (RoadMap §27): Authentication → RBAC → Validation → Controller.
 */
const auditRouter = Router();

auditRouter.use(requireAuth);
auditRouter.use(requireRoles(...AUDIT_READ_ROLES));

auditRouter.get("/", validate({ query: auditLogListQuerySchema }), listAuditLogs);
auditRouter.get(
    "/:id",
    validate({ params: auditLogIdParamsSchema }),
    getAuditLogById,
);

export default auditRouter;

