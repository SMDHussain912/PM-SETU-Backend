import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { clusterIdParamsSchema } from "./dashboard.schema";
import {
    getClusterDashboard,
    getDashboardContract,
    getClustersDashboard,
    getFinanceDashboard,
    getPlacementsDashboard,
    getStateDashboard,
    getTrainingDashboard,
} from "./dashboard.controller";

/**
 * Dashboard module — intentionally public read-only routes (RoadMap.md §16).
 *
 * Access decision: project direction selects the public model for all six
 * dashboard GET endpoints. Do not add requireAuth/RBAC/resource-scope guards
 * here unless the dashboard audience policy is formally changed. Keep write
 * operations out of this router; public responses must remain read-only.
 *
 * GET /api/v1/dashboard/state         — state-level overview
 * GET /api/v1/dashboard/clusters      — cluster list with metrics
 * GET /api/v1/dashboard/clusters/:id  — single cluster dashboard
 * GET /api/v1/dashboard/finance       — finance overview
 * GET /api/v1/dashboard/training      — training overview (limited)
 * GET /api/v1/dashboard/placements    — placements overview (pending source)
 */

const dashboardRouter = Router();

dashboardRouter.get("/contract", getDashboardContract);
dashboardRouter.get("/state", getStateDashboard);
dashboardRouter.get("/clusters", getClustersDashboard);
dashboardRouter.get(
    "/clusters/:id",
    validate({ params: clusterIdParamsSchema }),
    getClusterDashboard,
);
dashboardRouter.get("/finance", getFinanceDashboard);
dashboardRouter.get("/training", getTrainingDashboard);
dashboardRouter.get("/placements", getPlacementsDashboard);

export default dashboardRouter;
