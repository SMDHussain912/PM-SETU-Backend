import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import * as governanceController from "./governance.controller";
import { governanceListQuerySchema, memberIdParamsSchema } from "./governance.schema";

const governanceRouter = Router();

/**
 * Public governance directory endpoints (RoadMap.md §11). Mounted under
 * /api/v1/governance by src/routes/index.ts. Request validation is minimal:
 * pagination on the list and the path param on the detail — GET endpoints
 * have no request body.
 *
 * Only GET /, GET /members and GET /members/:id are implemented so far (per
 * current scope). The six group-specific §11 endpoints (steering-committee,
 * pmu, officers, cluster-officers, spv, contacts) are deferred — the
 * grouping mechanism they need is specified nowhere. Admin CRUD
 * (POST/PATCH/DELETE /api/v1/admin/governance/members...) is also deferred.
 */
governanceRouter.get("/", validate({ query: governanceListQuerySchema }), governanceController.listGovernanceMembers);
governanceRouter.get("/members", validate({ query: governanceListQuerySchema }), governanceController.listGovernanceMembers);
governanceRouter.get("/members/:id", validate({ params: memberIdParamsSchema }), governanceController.getGovernanceMemberById);

export default governanceRouter;
