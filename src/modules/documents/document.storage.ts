import { createUploader, DOCUMENT_MIME_TYPES } from "../../middleware/upload.middleware";

/**
 * Document Management module — file storage.
 *
 * Wraps the existing project upload middleware (src/middleware/upload.middleware.ts)
 * configured for the "documents" sub-folder. Files are stored on disk under
 * uploads/documents/ with random UUID names; metadata lives in PostgreSQL.
 *
 * Reuses, does not redesign, the existing storage abstraction.
 */

export const uploadDocument = createUploader({
    folder: "documents",
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
});
