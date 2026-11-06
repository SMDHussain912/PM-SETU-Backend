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
 * Middleware order (RoadMap §27): Authentication -> RBAC -> Validation -> Controller.
 * Role groups remain subject to the formal access-matrix approval tracked in Phase 9.
 */
const approvalRouter = Router();

approvalRouter.use(requireAuth);

approvalRouter.get(
    "/",
    requireRoles(...APPROVAL_READ_ROLES),
    validate({ query: approvalListQuerySchema }),
    listApprovals,
);

approvalRouter.get(
    "/:id",
    requireRoles(...APPROVAL_READ_ROLES),
    validate({ params: approvalIdParamsSchema }),
    getApprovalById,
);

approvalRouter.post(
    "/:id/submit",
    requireRoles(...APPROVAL_WRITE_ROLES),
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    submitApproval,
);

approvalRouter.post(
    "/:id/review",
    requireRoles(...APPROVAL_WRITE_ROLES),
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    reviewApproval,
);

approvalRouter.post(
    "/:id/approve",
    requireRoles(...APPROVAL_WRITE_ROLES),
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    approveApproval,
);

approvalRouter.post(
    "/:id/reject",
    requireRoles(...APPROVAL_WRITE_ROLES),
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    rejectApproval,
);

approvalRouter.post(
    "/:id/request-revision",
    requireRoles(...APPROVAL_WRITE_ROLES),
    validate({ params: approvalIdParamsSchema, body: approvalTransitionBodySchema }),
    requestRevisionApproval,
);

export default approvalRouter;
