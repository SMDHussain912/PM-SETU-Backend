import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { GALLERY_WRITE_ROLES } from "../roles/role.constants";
import {
    createGalleryItemSchema,
    galleryIdParamsSchema,
    galleryListQuerySchema,
    updateGalleryItemSchema,
} from "./gallery.schema";
import {
    createGalleryItem,
    deleteGalleryItem,
    getGalleryItemById,
    listGalleryItems,
    listGalleryPhotos,
    listGalleryVideos,
    updateGalleryItem,
    uploadGalleryMedia,
} from "./gallery.controller";
import { uploadGalleryMedia as uploadGalleryMediaMiddleware } from "./gallery.storage";

/**
 * Gallery Management module — public + admin routes (RoadMap.md §14 + §24).
 *
 * Public (no auth):
 *   GET /api/v1/gallery        — paginated list (all items)
 *   GET /api/v1/gallery/photos — paginated list (photos only)
 *   GET /api/v1/gallery/videos — paginated list (videos only)
 *   GET /api/v1/gallery/:id    — single gallery item
 *
 * Admin (mounted at /api/v1/admin/gallery by src/routes/index.ts):
 *   POST   /            — create (starts DRAFT, INFERRED)
 *   PATCH  /:id         — update (supplied columns only)
 *   DELETE /:id         — delete
 *   POST   /upload      — row-less media upload (§24 explicit — returns file
 *                          metadata; client binds URL via POST/PATCH)
 *
 * §14 defines NO admin read endpoints and NO publish/archive endpoints
 * (those exist for News/Banners but not Gallery) — intentionally not
 * implemented (deferred / TO CONFIRM).
 *
 * All admin routes: requireAuth + GALLERY_WRITE_ROLES (INFERRED / TO CONFIRM).
 * Guard chain per §27: requireAuth → requireRoles → validate → controller
 * (multer sits after validate for the upload route).
 */

const galleryRouter = Router();

galleryRouter.get("/", validate({ query: galleryListQuerySchema }), listGalleryItems);
galleryRouter.get("/photos", validate({ query: galleryListQuerySchema }), listGalleryPhotos);
galleryRouter.get("/videos", validate({ query: galleryListQuerySchema }), listGalleryVideos);
galleryRouter.get("/:id", validate({ params: galleryIdParamsSchema }), getGalleryItemById);

const galleryAdminRouter = Router();

galleryAdminRouter.use(requireAuth);
galleryAdminRouter.use(requireRoles(...GALLERY_WRITE_ROLES));

galleryAdminRouter.post("/", validate({ body: createGalleryItemSchema }), createGalleryItem);

galleryAdminRouter.patch(
    "/:id",
    validate({ params: galleryIdParamsSchema, body: updateGalleryItemSchema }),
    updateGalleryItem,
);

galleryAdminRouter.delete(
    "/:id",
    validate({ params: galleryIdParamsSchema }),
    deleteGalleryItem,
);

galleryAdminRouter.post(
    "/upload",
    uploadGalleryMediaMiddleware.single("media"),
    uploadGalleryMedia,
);

export default galleryRouter;
export { galleryAdminRouter };
