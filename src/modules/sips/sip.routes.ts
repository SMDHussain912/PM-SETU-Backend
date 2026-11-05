import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import { ApiError } from "../../utils/response";
import * as sipController from "./sip.controller";
import {
    clusterIdParamsSchema,
    createSipSchema,
    sipIdParamsSchema,
    sipListQuerySchema,
    updateSipSchema,
} from "./sip.schema";

const sipRouter = Router();

/** Public SIP registry reads. */
sipRouter.get("/", validate({ query: sipListQuerySchema }), sipController.listSips);
sipRouter.get("/:id", validate({ params: sipIdParamsSchema }), sipController.getSipById);

export default sipRouter;

/** Cluster-scoped SIP listing, mounted at /api/v1/clusters. */
export const sipClusterRouter = Router();
sipClusterRouter.get(
    "/:clusterId/sip",
    validate({ params: clusterIdParamsSchema }),
    sipController.listClusterSips,
);

/**
 * Cluster admins can edit only SIP records inside their assigned scope.
 * They cannot change the Cluster or AIP relationship; reassignment is
 * reserved for state-level administrators.
 */
function preventClusterAdminReassignment(req: Request, _res: Response, next: NextFunction): void {
    const roles = req.user?.roles ?? [];
    if (
        roles.includes(ROLE_CODES.CLUSTER_ADMIN)
        && !roles.includes(ROLE_CODES.STATE_PMU_ADMIN)
        && !roles.includes(ROLE_CODES.SUPER_ADMIN)
        && (req.body?.cluster_id !== undefined || req.body?.aip_id !== undefined)
    ) {
        next(new ApiError({
            statusCode: 403,
            code: "SIP_REASSIGNMENT_FORBIDDEN",
            message: "Only state-level administrators can change a SIP cluster or AIP assignment",
        }));
        return;
    }
    next();
}

/** SIP registry administration. Workflow status is not editable here. */
export const sipAdminRouter = Router();
sipAdminRouter.use(requireAuth);
sipAdminRouter.post(
    "/",
    requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ body: createSipSchema }),
    sipController.createSip,
);
sipAdminRouter.patch(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: sipIdParamsSchema, body: updateSipSchema }),
    preventClusterAdminReassignment,
    requireResourceScope("SIP"),
    sipController.updateSip,
);
sipAdminRouter.delete(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: sipIdParamsSchema }),
    requireResourceScope("SIP"),
    sipController.deleteSip,
);
