import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import { ApiError } from "../../utils/response";
import * as spvController from "./spv.controller";
import { clusterIdParamsSchema, spvIdParamsSchema, spvListQuerySchema, createSpvSchema, updateSpvSchema } from "./spv.schema";

const spvRouter = Router();
spvRouter.get("/", validate({ query: spvListQuerySchema }), spvController.listSpvs);
spvRouter.get("/:id", validate({ params: spvIdParamsSchema }), spvController.getSpvById);
export default spvRouter;

export const spvClusterRouter = Router();
spvClusterRouter.get("/:clusterId/spv", validate({ params: clusterIdParamsSchema }), spvController.listClusterSpvs);

/** Cluster admins may edit scoped SPVs but cannot reassign their cluster or AIP. */
function preventClusterAdminReassignment(req: Request, _res: Response, next: NextFunction): void {
    const roles = req.user?.roles ?? [];
    if (
        roles.includes(ROLE_CODES.CLUSTER_ADMIN)
        && !roles.includes(ROLE_CODES.STATE_PMU_ADMIN)
        && !roles.includes(ROLE_CODES.SUPER_ADMIN)
        && (req.body?.cluster_id !== undefined || req.body?.aip_id !== undefined)
    ) {
        next(new ApiError({
            statusCode: 403, code: "SPV_REASSIGNMENT_FORBIDDEN",
            message: "Only state-level administrators can change an SPV cluster or AIP assignment",
        }));
        return;
    }
    next();
}

export const spvAdminRouter = Router();
spvAdminRouter.use(requireAuth);
spvAdminRouter.post("/", requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN), validate({ body: createSpvSchema }), spvController.createSpv);
spvAdminRouter.patch(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    requireResourceScope("SPV"), preventClusterAdminReassignment, validate({ params: spvIdParamsSchema, body: updateSpvSchema }),
    spvController.updateSpv,
);
spvAdminRouter.delete(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    requireResourceScope("SPV"), validate({ params: spvIdParamsSchema }),
    spvController.deleteSpv,
);
