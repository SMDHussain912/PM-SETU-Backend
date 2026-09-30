import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { BANNER_WRITE_ROLES } from "../roles/role.constants";
import {
    archiveBanner,
    createBanner,
    deleteBanner,
    listActiveBanners,
    listBanners,
    publishBanner,
    updateBanner,
    uploadBannerImagesController,
} from "./banner.controller";
import {
    bannerIdParamsSchema,
    bannerListQuerySchema,
    createBannerSchema,
    updateBannerSchema,
} from "./banner.schema";
import { uploadBannerImages } from "./banner.storage";

/**
 * Banner Management module — routes (RoadMap.md §15 "BANNER APIs" + §24).
 *
 * Public (no auth):
 *   GET /api/v1/banners        — published, non-archived list
 *   GET /api/v1/banners/active — published + date-window aware list
 *
 * Admin (mounted at /api/v1/admin/banners by src/routes/index.ts):
 *   POST   /            — create (starts unpublished + unarchived)
 *   PATCH  /:id         — update
 *   DELETE /:id         — delete
 *   POST   /:id/publish — publish (INFERRED guard: archived cannot publish)
 *   POST   /:id/archive — archive
 *   POST   /:id/images  — image upload (multer; updates row image columns)
 *
 * All admin routes: requireAuth + BANNER_WRITE_ROLES (INFERRED / TO
 * CONFIRM). Guard chain per §27: requireAuth → requireRoles → validate →
 * controller.
 *
 * INTENTIONALLY NOT IMPLEMENTED (not in §15 — deferred / TO CONFIRM):
 *   GET /api/v1/admin/banners, GET /api/v1/admin/banners/:id,
 *   PATCH /api/v1/admin/banners/:id/status.
 */

const bannerRouter = Router();

bannerRouter.get("/", validate({ query: bannerListQuerySchema }), listBanners);
bannerRouter.get("/active", validate({ query: bannerListQuerySchema }), listActiveBanners);

const bannerAdminRouter = Router();

bannerAdminRouter.use(requireAuth);
bannerAdminRouter.use(requireRoles(...BANNER_WRITE_ROLES));

bannerAdminRouter.post("/", validate({ body: createBannerSchema }), createBanner);

bannerAdminRouter.patch(
    "/:id",
    validate({ params: bannerIdParamsSchema, body: updateBannerSchema }),
    updateBanner,
);

bannerAdminRouter.delete("/:id", validate({ params: bannerIdParamsSchema }), deleteBanner);

bannerAdminRouter.post("/:id/publish", validate({ params: bannerIdParamsSchema }), publishBanner);

bannerAdminRouter.post("/:id/archive", validate({ params: bannerIdParamsSchema }), archiveBanner);

bannerAdminRouter.post(
    "/:id/images",
    validate({ params: bannerIdParamsSchema }),
    uploadBannerImages.array("images", 5),
    uploadBannerImagesController,
);

export default bannerRouter;
export { bannerAdminRouter };

