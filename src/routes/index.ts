import { Router, type NextFunction } from "express";
import { prisma } from "../config/database";
import aipRouter from "../modules/aips/aip.routes";
import authRouter from "../modules/auth/auth.routes";
import approvalRouter from "../modules/approvals/approval.routes";
import auditRouter from "../modules/audit/audit.routes";
import bannerRouter, { bannerAdminRouter } from "../modules/banners/banner.routes";
import clusterRouter from "../modules/clusters/cluster.routes";
import contactRouter, { contactAdminRouter } from "../modules/contact/contact.routes";
import dashboardRouter from "../modules/dashboard/dashboard.routes";
import documentRouter, {
    documentAdminRouter,
} from "../modules/documents/document.routes";
import { docsRouter } from "../docs/swagger";
import galleryRouter, {
    galleryAdminRouter,
} from "../modules/gallery/gallery.routes";
import governanceRouter from "../modules/governance/governance.routes";
import homeRouter from "../modules/home/home.routes";
import itiRouter, { itiClusterRouter } from "../modules/itis/iti.routes";
import newsRouter, {
    newsAdminRouter,
} from "../modules/news/news.routes";
import roleRouter, { permissionRouter } from "../modules/roles/role.routes";
import sipRouter, { sipClusterRouter } from "../modules/sips/sip.routes";
import searchRouter from "../modules/search/search.routes";
import spvRouter, { spvClusterRouter } from "../modules/spvs/spv.routes";
import userRouter from "../modules/users/user.routes";
import { logger } from "../utils/logger";
import { sendSuccess } from "../utils/response";

const router = Router();

// OpenAPI documentation (UI + raw spec)
router.use(docsRouter);

/**
 * GET /api/v1/health — infrastructure health check only (no business logic).
 * Reports basic runtime info and whether PostgreSQL is reachable. The request
 * itself never fails because of the database; the status is reported instead.
 */
router.get("/health", async (_req, res, next: NextFunction) => {
    try {
        let database: "up" | "down" = "down";
        try {
            await prisma.$queryRaw`SELECT 1`;
            database = "up";
        } catch (error) {
            logger.warn("Database health check failed", {
                message: error instanceof Error ? error.message : String(error),
            });
        }

        return sendSuccess(res, {
            status: "ok",
            database,
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return next(error);
    }
});

// PM SETU module routers (RoadMap.md §26) — mounted here as they are
// implemented:
// RoadMap.md §18 — authentication (mounted first per §26 ordering; only
// /auth/login is public — /auth/me and /auth/change-password self-guard).
router.use("/auth", authRouter);
router.use("/home", homeRouter);
router.use("/itis", itiRouter);
// Four routers share the /clusters prefix without conflict: clusterRouter
// defines only 0-/1-segment paths ("/" and "/:id"), while the ITI module's
// GET /:clusterId/itis, the SPV module's GET /:clusterId/spv and the SIP
// module's GET /:clusterId/sip are two-segment paths with distinct literal
// suffixes that always fall through to their own routers.
router.use("/clusters", clusterRouter);
router.use("/clusters", itiClusterRouter);
router.use("/clusters", spvClusterRouter);
router.use("/clusters", sipClusterRouter);
router.use("/aips", aipRouter);
router.use("/spvs", spvRouter);
router.use("/sips", sipRouter);
router.use("/governance", governanceRouter);
router.use("/documents", documentRouter);
router.use("/news", newsRouter);
router.use("/gallery", galleryRouter);
router.use("/banners", bannerRouter);
router.use("/contact", contactRouter);
router.use("/search", searchRouter);
router.use("/dashboard", dashboardRouter);

// RoadMap.md §19/§20 — administrative user/role management. The module
// routers enforce requireAuth + requireRoles themselves; these mounts are
// intentionally NOT public.
router.use("/admin/users", userRouter);
router.use("/admin/roles", roleRouter);
router.use("/admin/permissions", permissionRouter);

// RoadMap.md §21/§22 — approvals + audit (admin). The module routers enforce
// requireAuth + requirePermissions themselves; these mounts are intentionally
// NOT public. Approvals: requireAuth + APPROVAL_READ (list/detail) /
// APPROVAL_WRITE (transitions). Audit: requireAuth + AUDIT_READ (list/detail).
// See src/modules/approvals/approval.routes.ts and
// src/modules/audit/audit.routes.ts for the exact guards.
router.use("/admin/approvals", approvalRouter);
router.use("/admin/audit-logs", auditRouter);

// RoadMap.md §23/§15+§24 — contact + banner admin. The module routers
// enforce requireAuth + requireRoles themselves; these mounts are
// intentionally NOT public. Contact: CONTACT_READ (messages list/detail) /
// CONTACT_WRITE (triage PATCH). Banners: BANNER_WRITE (create/update/delete/
// publish/archive/images). See the respective *.routes.ts for exact guards.
router.use("/admin/contact", contactAdminRouter);
router.use("/admin/banners", bannerAdminRouter);

// RoadMap.md §12 + §24 — document admin CRUD + publish/archive/version/file
// upload. The module router enforces requireAuth + DOCUMENT_WRITE_ROLES itself.
router.use("/admin/documents", documentAdminRouter);

// RoadMap.md §13 + §24 — news admin CRUD + publish/archive + attachment
// upload. The module router enforces requireAuth + NEWS_WRITE_ROLES itself.
router.use("/admin/news", newsAdminRouter);

// RoadMap.md §14 + §24 — gallery admin CRUD + row-less media upload.
// The module router enforces requireAuth + GALLERY_WRITE_ROLES itself.
router.use("/admin/gallery", galleryAdminRouter);


export default router;
