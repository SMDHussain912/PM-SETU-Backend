import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import * as spvController from "./spv.controller";
import { clusterIdParamsSchema, spvIdParamsSchema, spvListQuerySchema } from "./spv.schema";

const spvRouter = Router();

/**
 * Public SPV endpoints (RoadMap.md §9). Mounted under /api/v1/spvs by
 * src/routes/index.ts. Request validation is minimal: pagination on the list
 * and the path param on the detail — GET endpoints have no request body.
 *
 * Only GET /, GET /:id and the cluster-scoped GET /clusters/:clusterId/spv
 * are implemented so far (per current scope). Admin CRUD and the
 * PATCH /admin/spvs/:id/status lifecycle transition are deferred.
 */
spvRouter.get("/", validate({ query: spvListQuerySchema }), spvController.listSpvs);
spvRouter.get("/:id", validate({ params: spvIdParamsSchema }), spvController.getSpvById);

export default spvRouter;

/**
 * RoadMap §9 also exposes GET /api/v1/clusters/:clusterId/spv (note: the
 * spec uses the SINGULAR "spv" segment here, unlike "/itis" and "/aips" —
 * kept exactly as specified). This route belongs to the SPV module and is
 * mounted under /api/v1/clusters by src/routes/index.ts alongside the
 * cluster and ITI routers — no second competing /clusters router is created.
 */
export const spvClusterRouter = Router();

spvClusterRouter.get(
    "/:clusterId/spv",
    validate({ params: clusterIdParamsSchema }),
    spvController.listClusterSpvs,
);
