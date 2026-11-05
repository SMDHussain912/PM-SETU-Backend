import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import * as controller from "./industry-outcome.controller";
import { createOutcomeSchema, outcomeIdParamsSchema, outcomeListQuerySchema, reviewOutcomeSchema } from "./industry-outcome.schema";

const router = Router();
const readRoles = [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.DET_CONTENT_ADMIN, ROLE_CODES.APPROVING_AUTHORITY];
const writeRoles = [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.DET_CONTENT_ADMIN];
router.use(requireAuth);
router.get("/summary", requireRoles(...readRoles), controller.summary);\nrouter.get("/", validate({ query: outcomeListQuerySchema }), requireRoles(...readRoles), controller.list);
router.get("/:id", validate({ params: outcomeIdParamsSchema }), requireRoles(...readRoles), controller.get);
router.post("/", validate({ body: createOutcomeSchema }), requireRoles(...writeRoles), controller.create);
router.post("/:id/review", validate({ params: outcomeIdParamsSchema, body: reviewOutcomeSchema }), requireRoles(ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.APPROVING_AUTHORITY), controller.review);
export default router;
