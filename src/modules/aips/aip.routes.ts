import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import { ApiError } from "../../utils/response";
import { validate } from "../../middleware/validate.middleware";
import * as aipController from "./aip.controller";
import { aipIdParamsSchema, aipListQuerySchema, createAipSchema, updateAipSchema } from "./aip.schema";

const aipRouter = Router();

/**
 * Public AIP endpoints (RoadMap.md §8). Mounted under /api/v1/aips by
 * src/routes/index.ts. Request validation is minimal: the list query string
 * and the path param — GET endpoints have no request body.
 *
 * Public reads remain separate from the protected registry administration
 * routes exported below.
 */
aipRouter.get("/", validate({ query: aipListQuerySchema }), aipController.listAips);
aipRouter.get("/:id", validate({ params: aipIdParamsSchema }), aipController.getAipById);

export default aipRouter;


/** Cluster admins can edit AIP details but cannot move an AIP between clusters. */
function preventClusterAdminReassignment(req: Request, _res: Response, next: NextFunction): void {
    const roles = req.user?.roles ?? [];
    if (
        roles.includes(ROLE_CODES.CLUSTER_ADMIN)
        && !roles.includes(ROLE_CODES.STATE_PMU_ADMIN)
        && !roles.includes(ROLE_CODES.SUPER_ADMIN)
        && req.body?.cluster_id !== undefined
    ) {
        next(new ApiError({
            statusCode: 403,
            code: "CLUSTER_REASSIGNMENT_FORBIDDEN",
            message: "Only state-level administrators can change an AIP cluster assignment",
        }));
        return;
    }
    next();
}

/** AIP registry administration; operational activity and submissions stay separate. */
export const aipAdminRouter = Router();
aipAdminRouter.use(requireAuth);
aipAdminRouter.post(
    "/",
    requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ body: createAipSchema }),
    aipController.createAip,
);
aipAdminRouter.patch(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: aipIdParamsSchema, body: updateAipSchema }),
    preventClusterAdminReassignment,
    requireResourceScope("AIP"),
    aipController.updateAip,
);
aipAdminRouter.delete(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: aipIdParamsSchema }),
    requireResourceScope("AIP"),
    aipController.deleteAip,
);
