import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import * as aipController from "./aip.controller";
import { aipIdParamsSchema, aipListQuerySchema } from "./aip.schema";

const aipRouter = Router();

/**
 * Public AIP endpoints (RoadMap.md §8). Mounted under /api/v1/aips by
 * src/routes/index.ts. Request validation is minimal: the list query string
 * and the path param — GET endpoints have no request body.
 *
 * Only GET / and GET /:id are implemented so far (per current scope). The
 * cluster-scoped GET /clusters/:clusterId/aips (also listed in §8) and the
 * admin CRUD routes are deferred.
 */
aipRouter.get("/", validate({ query: aipListQuerySchema }), aipController.listAips);
aipRouter.get("/:id", validate({ params: aipIdParamsSchema }), aipController.getAipById);

export default aipRouter;
