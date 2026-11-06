import test from "node:test";
import assert from "node:assert/strict";
import {
    createUploader,
    DEFAULT_MULTIPART_LIMITS,
} from "../src/middleware/upload.middleware";

test("upload middleware applies bounded multipart parser limits", () => {
    const uploader = createUploader({ allowedMimeTypes: [] }) as unknown as {
        limits: Record<string, number>;
    };

    assert.deepEqual(uploader.limits, DEFAULT_MULTIPART_LIMITS);
    assert.equal(uploader.limits.files, 2);
    assert.equal(uploader.limits.fields, 10);
    assert.equal(uploader.limits.parts, 12);
    assert.equal(uploader.limits.fieldSize, 64 * 1024);
    assert.equal(uploader.limits.fieldNameSize, 100);
    assert.equal(uploader.limits.headerPairs, 2000);
    assert.ok(uploader.limits.fileSize > 0);
});

test("per-uploader file-size overrides preserve the multipart bounds", () => {
    const uploader = createUploader({
        allowedMimeTypes: [],
        maxFileSizeMb: 2,
    }) as unknown as { limits: Record<string, number> };

    assert.deepEqual(uploader.limits, {
        ...DEFAULT_MULTIPART_LIMITS,
        fileSize: 2 * 1024 * 1024,
    });
});

test("multipart part budget accommodates the largest configured banner upload", () => {
    assert.ok(
        DEFAULT_MULTIPART_LIMITS.parts >= DEFAULT_MULTIPART_LIMITS.files,
        "multipart part limit must allow the configured two-image banner upload",
    );
});
