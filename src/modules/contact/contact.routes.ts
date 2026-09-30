import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { authLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import { CONTACT_READ_ROLES, CONTACT_WRITE_ROLES } from "../roles/role.constants";
import {
    getContactMessageById,
    listContactMessages,
    submitContactMessage,
    updateContactMessageStatus,
} from "./contact.controller";
import {
    contactMessageIdParamsSchema,
    contactMessageListQuerySchema,
    createContactMessageSchema,
    updateContactMessageStatusSchema,
} from "./contact.schema";

/**
 * Contact module — routes (RoadMap.md §23 "CONTACT API").
 *
 * Public:
 *   POST /api/v1/contact — public form submission; authLimiter (stricter IP
 *   rate limit) per the §23 public-form security note. CAPTCHA is required
 *   in words by §23 but no provider exists yet — TO CONFIRM.
 *
 * Admin (mounted at /api/v1/admin/contact by src/routes/index.ts):
 *   GET   /messages      — list (CONTACT_READ_ROLES, INFERRED / TO CONFIRM)
 *   GET   /messages/:id  — detail (CONTACT_READ_ROLES)
 *   PATCH /messages/:id  — triage, status only (CONTACT_WRITE_ROLES)
 *
 * Guard chain per §27: requireAuth → requireRoles → validate → controller.
 * GET /api/v1/contact is NOT in §23 and is intentionally not implemented.
 */

const contactRouter = Router();

contactRouter.post(
    "/",
    authLimiter,
    validate({ body: createContactMessageSchema }),
    submitContactMessage,
);

const contactAdminRouter = Router();

contactAdminRouter.use(requireAuth);

contactAdminRouter.get(
    "/messages",
    requireRoles(...CONTACT_READ_ROLES),
    validate({ query: contactMessageListQuerySchema }),
    listContactMessages,
);

contactAdminRouter.get(
    "/messages/:id",
    requireRoles(...CONTACT_READ_ROLES),
    validate({ params: contactMessageIdParamsSchema }),
    getContactMessageById,
);

contactAdminRouter.patch(
    "/messages/:id",
    requireRoles(...CONTACT_WRITE_ROLES),
    validate({ params: contactMessageIdParamsSchema, body: updateContactMessageStatusSchema }),
    updateContactMessageStatus,
);

export default contactRouter;
export { contactAdminRouter };

