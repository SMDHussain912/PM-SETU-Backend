import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    discardImageUploads,
    validateImageUpload,
    validateImageUploads,
} from "../src/middleware/image-file-validation";

async function fixture(
    originalname: string,
    mimetype: string,
    bytes: Buffer,
): Promise<{ directory: string; file: Express.Multer.File }> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pm-setu-image-"));
    const filePath = path.join(directory, "stored-upload");
    await writeFile(filePath, bytes);
    return {
        directory,
        file: {
            fieldname: "file",
            originalname,
            encoding: "7bit",
            mimetype,
            destination: directory,
            filename: "stored-upload",
            path: filePath,
            size: bytes.length,
            stream: null as never,
            buffer: bytes,
        },
    };
}

test("accepts a PNG whose signature matches its extension and MIME type", async () => {
    const sample = await fixture(
        "banner.png",
        "image/png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    );
    try {
        assert.equal(await validateImageUpload(sample.file), "banner.png");
    } finally {
        await rm(sample.directory, { recursive: true, force: true });
    }
});

test("accepts JPEG, WebP and GIF signatures", async () => {
    const fixtures = [
        await fixture("photo.jpg", "image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00])),
        await fixture("photo.webp", "image/webp", Buffer.from("RIFFxxxxWEBP")),
        await fixture("photo.gif", "image/gif", Buffer.from("GIF89a")),
    ];
    try {
        for (const sample of fixtures) {
            await validateImageUpload(sample.file);
        }
    } finally {
        await Promise.all(fixtures.map((sample) =>
            rm(sample.directory, { recursive: true, force: true }),
        ));
    }
});

test("rejects spoofed image bytes and mismatched MIME declarations", async () => {
    const spoofed = await fixture("fake.png", "image/png", Buffer.from("not an image"));
    try {
        await assert.rejects(
            validateImageUpload(spoofed.file),
            (error: unknown) => error instanceof Error && "code" in error &&
                error.code === "INVALID_IMAGE_CONTENT",
        );
    } finally {
        await rm(spoofed.directory, { recursive: true, force: true });
    }

    const mismatched = await fixture(
        "fake.png",
        "image/jpeg",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    try {
        await assert.rejects(
            validateImageUpload(mismatched.file),
            (error: unknown) => error instanceof Error && "code" in error &&
                error.code === "INVALID_IMAGE_FILE",
        );
    } finally {
        await rm(mismatched.directory, { recursive: true, force: true });
    }
});

test("rejects empty files and unsupported extensions", async () => {
    const empty = await fixture("empty.png", "image/png", Buffer.alloc(0));
    const unsupported = await fixture("script.svg", "image/svg+xml", Buffer.from("<svg/>"));
    try {
        await assert.rejects(validateImageUpload(empty.file));
        await assert.rejects(validateImageUpload(unsupported.file));
    } finally {
        await Promise.all([empty, unsupported].map((sample) =>
            rm(sample.directory, { recursive: true, force: true }),
        ));
    }
});

test("sanitizes the returned original filename", async () => {
    const sample = await fixture("../banner\nfinal.png", "image/png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    try {
        assert.equal(await validateImageUpload(sample.file), "final.png");
    } finally {
        await rm(sample.directory, { recursive: true, force: true });
    }
});

test("removes all files when one image in a batch fails validation", async () => {
    const valid = await fixture("valid.png", "image/png",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const invalid = await fixture("invalid.png", "image/png", Buffer.from("not an image"));
    try {
        await assert.rejects(validateImageUploads([valid.file, invalid.file]));
        await assert.rejects(readFile(valid.file.path));
        await assert.rejects(readFile(invalid.file.path));
    } finally {
        await Promise.all([valid, invalid].map((sample) =>
            rm(sample.directory, { recursive: true, force: true }),
        ));
    }
});

test("discarding already removed files is safe", async () => {
    const sample = await fixture("removed.png", "image/png", Buffer.from("x"));
    await discardImageUploads([sample.file]);
    await assert.doesNotReject(discardImageUploads([sample.file]));
    await rm(sample.directory, { recursive: true, force: true });
});
