import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireResourceScope } from "../../middleware/scope.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import * as clusterController from "./cluster.controller";
import { clusterIdParamsSchema, clusterListQuerySchema, createClusterSchema, updateClusterSchema } from "./cluster.schema";

const clusterRouter = Router();
clusterRouter.get("/", validate({ query: clusterListQuerySchema }), clusterController.listClusters);
clusterRouter.get("/:id", validate({ params: clusterIdParamsSchema }), clusterController.getClusterById);

const clusterAdminRouter = Router();
clusterAdminRouter.use(requireAuth);
clusterAdminRouter.post("/", requireRoles(ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN), validate({ body: createClusterSchema }), clusterController.createCluster);
clusterAdminRouter.patch("/:id", requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN), validate({ params: clusterIdParamsSchema, body: updateClusterSchema }), requireResourceScope("CLUSTER"), clusterController.updateCluster);
clusterAdminRouter.delete("/:id", requireRoles(ROLE_CODES.CLUSTER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.SUPER_ADMIN), validate({ params: clusterIdParamsSchema }), requireResourceScope("CLUSTER"), clusterController.deleteCluster);

export default clusterRouter;
export { clusterAdminRouter };
