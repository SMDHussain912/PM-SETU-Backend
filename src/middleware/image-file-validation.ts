import { open, unlink } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../utils/response";

const MIME_BY_EXTENSION: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
};

function hasImageSignature(extension: string, bytes: Buffer): boolean {
    switch (extension) {
        case ".jpg":
        case ".jpeg":
            return bytes.length >= 3 &&
                bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        case ".png":
            return bytes.length >= 8 && bytes.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            );
        case ".webp":
            return bytes.length >= 12 &&
                bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
                bytes.subarray(8, 12).toString("ascii") === "WEBP";
        case ".gif": {
            const header = bytes.subarray(0, 6).toString("ascii");
            return header === "GIF87a" || header === "GIF89a";
        }
        default:
            return false;
    }
}

/** Validate client metadata against the stored file's actual image signature. */
export async function validateImageUpload(file: Express.Multer.File): Promise<string> {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMime = MIME_BY_EXTENSION[extension];

    if (!expectedMime || file.mimetype !== expectedMime || file.size <= 0) {
        throw new ApiError({
            statusCode: 415,
            code: "INVALID_IMAGE_FILE",
            message: "The uploaded image type is not supported or its metadata is inconsistent",
        });
    }

    let header: Buffer;
    try {
        const handle = await open(file.path, "r");
        try {
            header = Buffer.alloc(12);
            const { bytesRead } = await handle.read(header, 0, header.length, 0);
            header = header.subarray(0, bytesRead);
        } finally {
            await handle.close();
        }
    } catch {
        throw new ApiError({
            statusCode: 415,
            code: "INVALID_IMAGE_CONTENT",
            message: "The uploaded image content could not be verified",
        });
    }

    if (!hasImageSignature(extension, header)) {
        throw new ApiError({
            statusCode: 415,
            code: "INVALID_IMAGE_CONTENT",
            message: "The file content does not match its declared image type",
        });
    }

    return path.basename(file.originalname)
        .replace(/[\r\n\0]/g, "")
        .slice(0, 180) || "image";
}

/** Remove every file in a rejected multi-file upload without masking its error. */
export async function discardImageUploads(files: Express.Multer.File[]): Promise<void> {
    await Promise.all(files.map(async (file) => {
        try {
            await unlink(file.path);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                throw error;
            }
        }
    }));
}

/** Validate a batch atomically from the caller's perspective; remove all files on failure. */
export async function validateImageUploads(files: Express.Multer.File[]): Promise<string[]> {
    try {
        return await Promise.all(files.map(validateImageUpload));
    } catch (error) {
        await discardImageUploads(files);
        throw error;
    }
}
