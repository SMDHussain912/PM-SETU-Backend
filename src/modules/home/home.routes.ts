import { Router } from "express";
import * as homeController from "./home.controller";

const homeRouter = Router();

/**
 * Public homepage endpoints (RoadMap.md §5). Mounted under /api/v1/home by
 * src/routes/index.ts. Request validation lives in home.schema.ts; GET /kpis
 * has no request input, so no validate() middleware is applied.
 */
homeRouter.get("/kpis", homeController.getHomeKpis);

export default homeRouter;
