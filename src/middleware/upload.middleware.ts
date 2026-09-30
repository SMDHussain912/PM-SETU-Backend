import { randomUUID } from "node:crypto";
import path from "node:path";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { ApiError } from "../utils/response";
import { ensureUploadDir, maxFileSizeBytes } from "../config/storage";

export const IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

export const DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ...IMAGE_MIME_TYPES,
];

export interface UploaderOptions {
    /** Sub-directory under the uploads root, e.g. "gallery", "documents". */
    folder?: string;
    /** Allowed MIME types; empty array disables filtering (not recommended). */
    allowedMimeTypes?: string[];
    /** Max size per file in MB (defaults to env UPLOAD_MAX_FILE_SIZE_MB). */
    maxFileSizeMb?: number;
}

/**
 * Creates a reusable multer instance for module routes, e.g.:
 *   const upload = createUploader({ folder: "gallery", allowedMimeTypes: IMAGE_MIME_TYPES });
 *   router.post("/banners/:id/images", upload.array("images", 5), controller);
 * Files are stored with random names (prevents traversal/collisions); the
 * original filename stays available as file.originalname for module metadata.
 */
export function createUploader(options: UploaderOptions = {}) {
    const {
        folder,
        allowedMimeTypes = DOCUMENT_MIME_TYPES,
        maxFileSizeMb,
    } = options;

    return multer({
        storage: multer.diskStorage({
            destination: (_req, _file, cb) => {
                try {
                    cb(null, ensureUploadDir(folder));
                } catch (error) {
                    // The destination argument is ignored when an error is passed.
                    cb(error instanceof Error ? error : new Error(String(error)), "");
                }
            },
            filename: (_req, file, cb) => {
                const extension = path.extname(file.originalname).toLowerCase();
                cb(null, `${randomUUID()}${extension}`);
            },
        }),
        limits: {
            fileSize:
                maxFileSizeMb !== undefined
                    ? maxFileSizeMb * 1024 * 1024
                    : maxFileSizeBytes,
        },
        fileFilter:
            allowedMimeTypes.length > 0
                ? (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
                      if (allowedMimeTypes.includes(file.mimetype)) {
                          cb(null, true);
                          return;
                      }
                      cb(
                          new ApiError({
                              message: `Unsupported file type: ${file.mimetype}`,
                              statusCode: 415,
                              code: "UNSUPPORTED_MEDIA_TYPE",
                          }),
                      );
                  }
                : undefined,
    });
}

/** Ready-made uploaders for the most common cases. */
export const imageUploader = createUploader({
    allowedMimeTypes: IMAGE_MIME_TYPES,
});

export const documentUploader = createUploader({
    allowedMimeTypes: DOCUMENT_MIME_TYPES,
});
