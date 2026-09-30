import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import * as clusterController from "./cluster.controller";
import { clusterIdParamsSchema, clusterListQuerySchema } from "./cluster.schema";

const clusterRouter = Router();

/**
 * Public cluster endpoints (RoadMap.md §6). Mounted under /api/v1/clusters by
 * src/routes/index.ts, where it coexists with the ITI module's
 * itiClusterRouter (GET /:clusterId/itis). There is no conflict: this router
 * only defines 0- and 1-segment paths ("/" and "/:id"), so the two-segment
 * "/:clusterId/itis" path always falls through to the ITI router.
 *
 * Only GET / and GET /:id are implemented so far (per current scope). The
 * remaining §6 routes (/:id/summary, /map, /:id/aip, /:id/spv, /:id/sip,
 * /:id/documents, /:id/gallery) are deferred to their own modules/endpoints.
 * Request validation is minimal: the list query string and the path param —
 * GET endpoints have no request body.
 */
clusterRouter.get("/", validate({ query: clusterListQuerySchema }), clusterController.listClusters);
clusterRouter.get("/:id", validate({ params: clusterIdParamsSchema }), clusterController.getClusterById);

export default clusterRouter;
