import { createUploader, IMAGE_MIME_TYPES } from "../../middleware/upload.middleware";

/**
 * Banner Management module — file storage (RoadMap.md §24 "FILE UPLOAD API").
 *
 * Wraps the existing project upload middleware
 * (src/middleware/upload.middleware.ts) configured for the "banners"
 * sub-folder. Banner images are stored on disk under uploads/banners/ with
 * random UUID names; metadata lives in PostgreSQL.
 *
 * Reuses, does not redesign, the existing storage abstraction.
 */

export const uploadBannerImages = createUploader({
    folder: "banners",
    allowedMimeTypes: IMAGE_MIME_TYPES,
});
