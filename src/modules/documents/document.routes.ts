import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import { DOCUMENT_WRITE_ROLES } from "../roles/role.constants";
import {
    createDocumentSchema,
    documentIdParamsSchema,
    documentListQuerySchema,
    updateDocumentSchema,
} from "./document.schema";
import {
    archiveDocument,
    createDocument,
    createDocumentVersion,
    deleteDocument,
    downloadDocument,
    getDocumentById,
    getDocumentVersions,
    listDocuments,
    publishDocument,
    updateDocument,
    uploadDocumentFile,
} from "./document.controller";
import { uploadDocument } from "./document.storage";

/**
 * Document Management module — public + admin routes (RoadMap.md §12 + §24).
 *
 * Public (no auth):
 *   GET /api/v1/documents               — paginated list + 6 filters
 *   GET /api/v1/documents/:id           — single document
 *   GET /api/v1/documents/:id/download  — file download
 *   GET /api/v1/documents/:id/versions  — version history
 *
 * Admin (mounted at /api/v1/admin/documents by src/routes/index.ts):
 *   POST   /            — create (starts DRAFT + version 1, INFERRED)
 *   PATCH  /:id         — update (supplied columns only)
 *   DELETE /:id         — delete
 *   POST   /:id/publish — publish (INFERRED guard: archived cannot publish)
 *   POST   /:id/archive — archive
 *   POST   /:id/version — version snapshot (INFERRED behavior / TO CONFIRM)
 *   POST   /upload      — row-less file upload (§24 explicit — returns file
 *                          metadata; the client binds it via create/update)
 *
 * All admin routes: requireAuth + DOCUMENT_WRITE_ROLES (INFERRED / TO
 * CONFIRM). Guard chain per §27: requireAuth → requireRoles → validate →
 * controller (multer sits after validate for the file route).
 */

const documentRouter = Router();

documentRouter.get("/", validate({ query: documentListQuerySchema }), listDocuments);
documentRouter.get("/:id", validate({ params: documentIdParamsSchema }), getDocumentById);
documentRouter.get(
    "/:id/download",
    validate({ params: documentIdParamsSchema }),
    downloadDocument,
);
documentRouter.get(
    "/:id/versions",
    validate({ params: documentIdParamsSchema }),
    getDocumentVersions,
);

const documentAdminRouter = Router();

documentAdminRouter.use(requireAuth);
documentAdminRouter.use(requireRoles(...DOCUMENT_WRITE_ROLES));

documentAdminRouter.post("/", validate({ body: createDocumentSchema }), createDocument);

documentAdminRouter.patch(
    "/:id",
    validate({ params: documentIdParamsSchema, body: updateDocumentSchema }),
    updateDocument,
);

documentAdminRouter.delete("/:id", validate({ params: documentIdParamsSchema }), deleteDocument);

documentAdminRouter.post("/:id/publish", validate({ params: documentIdParamsSchema }), publishDocument);

documentAdminRouter.post("/:id/archive", validate({ params: documentIdParamsSchema }), archiveDocument);

documentAdminRouter.post("/:id/version", validate({ params: documentIdParamsSchema }), createDocumentVersion);

documentAdminRouter.post(
    "/upload",
    uploadDocument.single("file"),
    uploadDocumentFile,
);

export default documentRouter;
export { documentAdminRouter };
