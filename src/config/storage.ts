import fs from "node:fs";
import path from "node:path";
import { env } from "./env";
import { ApiError } from "../utils/response";

/** Absolute root directory for all uploaded files. */
export const uploadsRoot = path.resolve(process.cwd(), env.upload.dir);

export const maxFileSizeBytes = env.upload.maxFileSizeMb * 1024 * 1024;

/**
 * Creates (if needed) and returns the absolute directory for an upload
 * sub-folder, e.g. ensureUploadDir("gallery") -> <project>/uploads/gallery.
 */
export function ensureUploadDir(folder?: string): string {
    if (
        folder !== undefined &&
        (folder.includes("..") || path.isAbsolute(folder))
    ) {
        throw new ApiError({
            message: "Invalid upload folder",
            statusCode: 400,
            code: "INVALID_UPLOAD_FOLDER",
        });
    }
    const directory = folder ? path.join(uploadsRoot, folder) : uploadsRoot;
    fs.mkdirSync(directory, { recursive: true });
    return directory;
}
