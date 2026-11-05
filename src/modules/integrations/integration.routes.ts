import express, { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { ROLE_CODES } from "../roles/role.constants";
import * as controller from "./integration.controller";
import { integrationIdSchema, integrationListSchema, integrationSourceSchema, integrationIngestSchema } from "./integration.schema";

const router = Router();
const admin = [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN];
router.use(requireAuth);
router.get("/", validate({ query: integrationListSchema }), requireRoles(...admin), controller.list);
router.post("/", validate({ body: integrationSourceSchema }), requireRoles(...admin), controller.create);
router.patch("/:id/enabled", validate({ params: integrationIdSchema, body: integrationSourceSchema.pick({ enabled: true }) }), requireRoles(...admin), controller.enable);
router.post("/:id/ingest", validate({ params: integrationIdSchema, body: integrationIngestSchema }), requireRoles(...admin), controller.ingest);
router.post("/:id/csv", express.text({ type: ["text/csv", "application/csv"], limit: "1mb" }), validate({ params: integrationIdSchema }), requireRoles(...admin), controller.ingestCsv);
router.get("/:id/runs", validate({ params: integrationIdSchema }), requireRoles(...admin), controller.runs);

export const integrationWebhookRouter = Router();
integrationWebhookRouter.post("/:id", validate({ params: integrationIdSchema }), controller.webhook);
export default router;
