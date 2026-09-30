import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import * as sipController from "./sip.controller";
import { clusterIdParamsSchema, sipIdParamsSchema, sipListQuerySchema } from "./sip.schema";

const sipRouter = Router();

/**
 * Public SIP endpoints (RoadMap.md §10). Mounted under /api/v1/sips by
 * src/routes/index.ts. Request validation is minimal: pagination on the list
 * and the path param on the detail — GET endpoints have no request body.
 *
 * Only GET /, GET /:id and the cluster-scoped GET /clusters/:clusterId/sip
 * are implemented so far (per current scope). Admin CRUD, the 7 workflow
 * transition endpoints (§10 "Workflow APIs") and the SPV↔SIP link are
 * deferred.
 */
sipRouter.get("/", validate({ query: sipListQuerySchema }), sipController.listSips);
sipRouter.get("/:id", validate({ params: sipIdParamsSchema }), sipController.getSipById);

export default sipRouter;

/**
 * RoadMap §10 also exposes GET /api/v1/clusters/:clusterId/sip (note: the
 * spec uses the SINGULAR "sip" segment here, unlike "/itis" and "/aips" —
 * kept exactly as specified). This route belongs to the SIP module and is
 * mounted under /api/v1/clusters by src/routes/index.ts alongside the
 * cluster, ITI and SPV routers — no competing /clusters router is created.
 */
export const sipClusterRouter = Router();

sipClusterRouter.get(
    "/:clusterId/sip",
    validate({ params: clusterIdParamsSchema }),
    sipController.listClusterSips,
);
