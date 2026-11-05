import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import * as itiController from "./iti.controller";
import { clusterIdParamsSchema, createItiSchema, itiIdParamsSchema, itiListQuerySchema, updateItiSchema } from "./iti.schema";

const itiRouter = Router();

/**
 * Public ITI endpoints (RoadMap.md §7). Mounted under /api/v1/itis by
 * src/routes/index.ts. Request validation is minimal: the list query string
 * and the path params — GET endpoints have no request body.
 */
itiRouter.get("/", validate({ query: itiListQuerySchema }), itiController.listItis);
itiRouter.get("/:id", validate({ params: itiIdParamsSchema }), itiController.getItiById);

export default itiRouter;

/**
 * NIC also exposes GET /api/v1/clusters/:clusterId/itis (RoadMap §7). This
 * route belongs to the ITI module and is mounted under /api/v1/clusters by
 * src/routes/index.ts — no separate cluster module is created for it. When
 * the Cluster module is implemented it must reuse this router for this path
 * instead of defining a duplicate route.
 */
export const itiClusterRouter = Router();

itiClusterRouter.get(
    "/:clusterId/itis",
    validate({ params: clusterIdParamsSchema }),
    itiController.listClusterItis,
);


/** ITI master-data administration. Operational profile submissions remain separate. */
export const itiAdminRouter = Router();
itiAdminRouter.use(requireAuth);
itiAdminRouter.post(
    "/",
    requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ body: createItiSchema }),
    itiController.createIti,
);
itiAdminRouter.patch(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: itiIdParamsSchema, body: updateItiSchema }),
    requireResourceScope("ITI"),
    itiController.updateIti,
);
itiAdminRouter.delete(
    "/:id",
    requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN),
    validate({ params: itiIdParamsSchema }),
    requireResourceScope("ITI"),
    itiController.deleteIti,
);
