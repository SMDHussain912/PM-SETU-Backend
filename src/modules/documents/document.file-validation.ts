import { open, unlink } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../../utils/response";

const MIME_BY_EXTENSION: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
};

function hasSignature(extension: string, bytes: Buffer): boolean {
    switch (extension) {
        case ".pdf":
            return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
        case ".jpg":
        case ".jpeg":
            return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        case ".png":
            return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case ".webp":
            return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
                bytes.subarray(8, 12).toString("ascii") === "WEBP";
        case ".gif": {
            const header = bytes.subarray(0, 6).toString("ascii");
            return header === "GIF87a" || header === "GIF89a";
        }
        case ".doc":
        case ".xls":
            return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
        case ".docx":
        case ".xlsx":
            // OOXML documents are ZIP containers. The extension and declared MIME
            // type are checked separately; this rejects plain-text spoofing.
            return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
                [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
        default:
            return false;
    }
}

/**
 * Validate the uploaded file using both its extension/MIME declaration and
 * its actual leading bytes. Multer's MIME filter alone is client-controlled.
 */
export async function validateDocumentUpload(file: Express.Multer.File): Promise<string> {
    const extension = path.extname(file.originalname).toLowerCase();
    const expectedMime = MIME_BY_EXTENSION[extension];

    if (!expectedMime || file.mimetype !== expectedMime || file.size <= 0) {
        throw new ApiError({
            statusCode: 415,
            code: "INVALID_DOCUMENT_FILE",
            message: "The uploaded file type is not supported or its metadata is inconsistent",
        });
    }

    const handle = await open(file.path, "r");
    let header: Buffer;
    try {
        header = Buffer.alloc(16);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        header = header.subarray(0, bytesRead);
    } finally {
        await handle.close();
    }

    if (!hasSignature(extension, header)) {
        throw new ApiError({
            statusCode: 415,
            code: "INVALID_DOCUMENT_CONTENT",
            message: "The file content does not match its declared document type",
        });
    }

    // Never persist control characters or path components from a client filename.
    return path.basename(file.originalname).replace(/[\r\n\0]/g, "").slice(0, 180) || "document";
}

/** Remove a rejected upload without masking the original validation error. */
export async function discardDocumentUpload(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    }
}
