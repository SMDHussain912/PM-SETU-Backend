import {
    createUploader,
    DOCUMENT_MIME_TYPES,
    IMAGE_MIME_TYPES,
} from "../../middleware/upload.middleware";

/**
 * News Management module — file storage.
 *
 * Wraps the existing project upload middleware (src/middleware/upload.middleware.ts)
 * configured for the "news" sub-folder. Files are stored on disk under
 * uploads/news/ with random UUID names; metadata lives in PostgreSQL.
 *
 * Thumbnails are image-only. Attachments (POST /admin/news/:id/attachments —
 * RoadMap §24) accept document MIME types (PDF/Word/Excel/images).
 *
 * Reuses, does not redesign, the existing storage abstraction.
 */

export const uploadNewsThumbnail = createUploader({
    folder: "news",
    allowedMimeTypes: IMAGE_MIME_TYPES,
});

export const uploadNewsAttachment = createUploader({
    folder: "news",
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
});
