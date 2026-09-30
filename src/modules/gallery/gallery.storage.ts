import { createUploader, IMAGE_MIME_TYPES } from "../../middleware/upload.middleware";

/**
 * Gallery Management module — file storage.
 *
 * Wraps the existing project upload middleware (src/middleware/upload.middleware.ts)
 * configured for the "gallery" sub-folder. Media files are stored on disk under
 * uploads/gallery/ with random UUID names; metadata lives in PostgreSQL.
 *
 * Reuses, does not redesign, the existing storage abstraction.
 */

export const uploadGalleryMedia = createUploader({
    folder: "gallery",
    allowedMimeTypes: IMAGE_MIME_TYPES,
});
