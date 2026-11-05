import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
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
 * SIP registry administration.
 *
 * The currently confirmed editable fields are only the Cluster/AIP
 * relationships. These are state-level assignments, so only state/super
 * administrators may change them. Cluster admins retain scoped deletion of
 * DRAFT records but cannot reassign these relationships. Workflow status is
 * managed separately by the SIP workflow endpoints.
 */
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
    requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: sipIdParamsSchema, body: updateSipSchema }),
    sipController.updateSip,
);
sipAdminRouter.delete(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: sipIdParamsSchema }),
    requireResourceScope("SIP"),
    sipController.deleteSip,
);
