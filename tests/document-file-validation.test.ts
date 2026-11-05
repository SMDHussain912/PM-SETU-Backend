import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { discardDocumentUpload, validateDocumentUpload } from "../src/modules/documents/document.file-validation";

async function fixture(
    originalname: string,
    mimetype: string,
    bytes: Buffer,
): Promise<{ directory: string; file: Express.Multer.File }> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pm-setu-document-"));
    const filePath = path.join(directory, "upload.bin");
    await writeFile(filePath, bytes);
    return {
        directory,
        file: {
            fieldname: "file",
            originalname,
            encoding: "7bit",
            mimetype,
            destination: directory,
            filename: "upload.bin",
            path: filePath,
            size: bytes.length,
            stream: null as never,
            buffer: bytes,
        },
    };
}

test("accepts a PDF whose signature matches its extension and MIME type", async () => {
    const sample = await fixture("policy.pdf", "application/pdf", Buffer.from("%PDF-1.7 sample"));
    try {
        assert.equal(await validateDocumentUpload(sample.file), "policy.pdf");
    } finally {
        await rm(sample.directory, { recursive: true, force: true });
    }
});

test("rejects a spoofed PDF and does not accept a mismatched MIME declaration", async () => {
    const spoofed = await fixture("policy.pdf", "application/pdf", Buffer.from("not a PDF"));
    try {
        await assert.rejects(
            validateDocumentUpload(spoofed.file),
            (error: unknown) => error instanceof Error && "code" in error &&
                error.code === "INVALID_DOCUMENT_CONTENT",
        );
    } finally {
        await rm(spoofed.directory, { recursive: true, force: true });
    }

    const mismatched = await fixture("policy.pdf", "text/plain", Buffer.from("%PDF-1.7 sample"));
    try {
        await assert.rejects(
            validateDocumentUpload(mismatched.file),
            (error: unknown) => error instanceof Error && "code" in error &&
                error.code === "INVALID_DOCUMENT_FILE",
        );
    } finally {
        await rm(mismatched.directory, { recursive: true, force: true });
    }
});

test("rejects empty uploads and sanitizes the original filename", async () => {
    const empty = await fixture("empty.pdf", "application/pdf", Buffer.alloc(0));
    try {
        await assert.rejects(validateDocumentUpload(empty.file));
    } finally {
        await rm(empty.directory, { recursive: true, force: true });
    }

    const named = await fixture("../policy\nfinal.pdf", "application/pdf", Buffer.from("%PDF-1.7 sample"));
    try {
        assert.equal(await validateDocumentUpload(named.file), "policyfinal.pdf");
    } finally {
        await rm(named.directory, { recursive: true, force: true });
    }
});

test("discards rejected files safely", async () => {
    const sample = await fixture("bad.pdf", "application/pdf", Buffer.from("bad"));
    await discardDocumentUpload(sample.file.path);
    await assert.rejects(import("node:fs/promises").then(({ stat }) => stat(sample.file.path)));
    await rm(sample.directory, { recursive: true, force: true });
});
