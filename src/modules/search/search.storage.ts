import { createUploader, IMAGE_MIME_TYPES } from "../../middleware/upload.middleware";

/**
 * Search module — file storage.
 *
 * Wraps the existing project upload middleware (src/middleware/upload.middleware.ts)
 * configured for the "search" sub-folder. Media files are stored on disk under
 * uploads/search/ with random UUID names; metadata lives in PostgreSQL.
 *
 * Reuses, does not redesign, the existing storage abstraction.
 */

export const uploadSearchMedia = createUploader({
    folder: "search",
    allowedMimeTypes: IMAGE_MIME_TYPES,
});
