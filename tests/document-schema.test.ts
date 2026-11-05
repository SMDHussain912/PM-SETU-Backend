import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentSchema, updateDocumentSchema } from "../src/modules/documents/document.schema";

const validFileMetadata = {
    file_path: "/app/uploads/documents/4f6a.pdf",
    file_size: 128,
    mime_type: "application/pdf",
    original_name: "government-order.pdf",
};

test("document creation accepts a complete uploaded-file metadata tuple", () => {
    const result = createDocumentSchema.safeParse({
        title: "Government Order",
        ...validFileMetadata,
    });
    assert.equal(result.success, true);
});

test("document creation accepts metadata-free documents", () => {
    const result = createDocumentSchema.safeParse({ title: "Guidelines" });
    assert.equal(result.success, true);
});

test("document writes reject partial uploaded-file metadata", () => {
    const result = updateDocumentSchema.safeParse({
        file_path: validFileMetadata.file_path,
        file_size: validFileMetadata.file_size,
        mime_type: validFileMetadata.mime_type,
    });
    assert.equal(result.success, false);
});

test("document writes reject file metadata without a stored path", () => {
    const result = updateDocumentSchema.safeParse({
        file_size: validFileMetadata.file_size,
        mime_type: validFileMetadata.mime_type,
        original_name: validFileMetadata.original_name,
    });
    assert.equal(result.success, false);
});

test("document updates can explicitly clear all file metadata", () => {
    const result = updateDocumentSchema.safeParse({ file_path: null });
    assert.equal(result.success, true);
});

test("document updates reject clearing a path while retaining file metadata", () => {
    const result = updateDocumentSchema.safeParse({
        file_path: null,
        file_size: validFileMetadata.file_size,
    });
    assert.equal(result.success, false);
});
