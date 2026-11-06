import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MULTIPART_LIMITS } from "../src/middleware/upload.middleware";

test("upload middleware bounds multipart files, fields, parts and field sizes", () => {
    assert.deepEqual(DEFAULT_MULTIPART_LIMITS, {
        fileSize: DEFAULT_MULTIPART_LIMITS.fileSize,
        files: 2,
        fields: 10,
        parts: 12,
        fieldSize: 64 * 1024,
        fieldNameSize: 100,
        headerPairs: 2000,
    });
    assert.ok(DEFAULT_MULTIPART_LIMITS.fileSize > 0);
});

test("multipart part budget accommodates the largest configured banner upload", () => {
    assert.ok(
        DEFAULT_MULTIPART_LIMITS.parts >= DEFAULT_MULTIPART_LIMITS.files,
        "multipart part limit must allow the configured two-image banner upload",
    );
});
