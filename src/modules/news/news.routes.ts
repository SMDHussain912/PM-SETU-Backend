import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { NEWS_WRITE_ROLES } from "../roles/role.constants";
import {
    createNewsSchema,
    newsIdParamsSchema,
    newsListQuerySchema,
    updateNewsSchema,
} from "./news.schema";
import {
    archiveNews,
    attachNewsFile,
    createNews,
    deleteNews,
    getLatestNews,
    getNewsById,
    listNews,
    publishNews,
    updateNews,
} from "./news.controller";
import { uploadNewsAttachment } from "./news.storage";

/**
 * News Management module — public + admin routes (RoadMap.md §13 + §24).
 *
 * Public (no auth):
 *   GET /api/v1/news        — paginated list
 *   GET /api/v1/news/:id    — single news item (with attachments)
 *   GET /api/v1/news/latest — latest news list
 *
 * Admin (mounted at /api/v1/admin/news by src/routes/index.ts):
 *   POST   /            — create (starts DRAFT, INFERRED)
 *   PATCH  /:id         — update (supplied columns only)
 *   DELETE /:id         — delete
 *   POST   /:id/publish — publish (INFERRED: is_published = TRUE)
 *   POST   /:id/archive — archive (INFERRED: is_published = FALSE)
 *   POST   /:id/attachments — attachment upload (§24 explicit)
 *
 * §13 defines NO admin read endpoints — GET /admin/news and GET
 * /admin/news/:id are intentionally not implemented (deferred / TO CONFIRM).
 *
 * All admin routes: requireAuth + NEWS_WRITE_ROLES (INFERRED / TO CONFIRM).
 * Guard chain per §27: requireAuth → requireRoles → validate → controller
 * (multer sits after validate for the attachment route).
 */

const newsRouter = Router();

newsRouter.get("/", validate({ query: newsListQuerySchema }), listNews);
newsRouter.get("/latest", getLatestNews);
newsRouter.get("/:id", validate({ params: newsIdParamsSchema }), getNewsById);

const newsAdminRouter = Router();

newsAdminRouter.use(requireAuth);
newsAdminRouter.use(requireRoles(...NEWS_WRITE_ROLES));

newsAdminRouter.post("/", validate({ body: createNewsSchema }), createNews);

newsAdminRouter.patch(
    "/:id",
    validate({ params: newsIdParamsSchema, body: updateNewsSchema }),
    updateNews,
);

newsAdminRouter.delete("/:id", validate({ params: newsIdParamsSchema }), deleteNews);

newsAdminRouter.post("/:id/publish", validate({ params: newsIdParamsSchema }), publishNews);

newsAdminRouter.post("/:id/archive", validate({ params: newsIdParamsSchema }), archiveNews);

newsAdminRouter.post(
    "/:id/attachments",
    validate({ params: newsIdParamsSchema }),
    uploadNewsAttachment.single("file"),
    attachNewsFile,
);

export default newsRouter;
export { newsAdminRouter };
