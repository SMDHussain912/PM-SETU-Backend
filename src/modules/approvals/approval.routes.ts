import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import {
    APPROVAL_READ_ROLES,
    APPROVAL_WRITE_ROLES,
} from "../../modules/roles/role.constants";
import {
    listApprovals,
    getApprovalById,
    submitApproval,
    reviewApproval,
    approveApproval,
    rejectApproval,
    requestRevisionApproval,
} from "./approval.controller";
import {
    approvalIdParamsSchema,
    approvalListQuerySchema,
    approvalTransitionBodySchema,
} from "./approval.schema";

/**
 * Approvals module — routes (RoadMap.md §21 "APPROVAL APIs").
 *
 *   GET  /admin/approvals                  — list + INFERRED filters
 *   GET  /admin/approvals/:id              — detail
 *   POST /admin/approvals/:id/submit       — submit
 *   POST /admin/approvals/:id/review       — review
 *   POST /admin/approvals/:id/approve      — approve
 *   POST /admin/approvals/:id/reject       — reject
 *   POST /admin/approvals/:id/request-revision — request-revision
 *
 * Auth: every route is behind requireAuth.
 * Authorization: list/detail require APPROVAL_READ_ROLES; the 5 transition
 * endpoints require APPROVAL_WRITE_ROLES (both INFERRED / TO CONFIRM).
 *
 * Middleware order (RoadMap §27): Authentication -> RBAC -> Validation -> Controller.
 *
 * No publish/archive/delete/generic-engine endpoints exist in this module.
 * The SIP module owns its own workflow (sips.status) — see sql/sips/sip_queries.sql.
 */
const approvalRouter = Router();

approvalRouter.use(requireAuth);

approvalRouter.get(
    "/",
    validate({ query: approvalListQuerySchema }),
    requireRoles(...APPROVAL_READ_ROLES),
    listApprovals,
);

approvalRouter.get(
    "/:id",
    validate({ params: approvalIdParamsSchema }),
    requireRoles(...APPROVAL_READ_ROLES),
    getApprovalById,
);

approvalRouter.post(
    "/:id/submit",
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requireRoles(...APPROVAL_WRITE_ROLES),
    submitApproval,
);

approvalRouter.post(
    "/:id/review",
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requireRoles(...APPROVAL_WRITE_ROLES),
    reviewApproval,
);

approvalRouter.post(
    "/:id/approve",
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requireRoles(...APPROVAL_WRITE_ROLES),
    approveApproval,
);

approvalRouter.post(
    "/:id/reject",
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requireRoles(...APPROVAL_WRITE_ROLES),
    rejectApproval,
);

approvalRouter.post(
    "/:id/request-revision",
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requireRoles(...APPROVAL_WRITE_ROLES),
    requestRevisionApproval,
);

export default approvalRouter;

