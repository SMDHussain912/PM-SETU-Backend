import assert from "node:assert/strict";
import test from "node:test";
import { toPublicDocument, toPublicDocumentVersion } from "../../src/modules/documents/document.public";
import type { Document, DocumentVersion } from "../../src/modules/documents/document.types";

test("public document projection omits the server filesystem path", () => {
    const document = {
        id: 12,
        title: "Published circular",
        file_path: "/srv/pm-setu/uploads/documents/private-name.pdf",
        file_size: 2048,
        mime_type: "application/pdf",
    } as Document;

    const result = toPublicDocument(document);

    assert.equal("file_path" in result, false);
    assert.equal(result.title, "Published circular");
    assert.equal(result.file_size, 2048);
    assert.equal(result.mime_type, "application/pdf");
});

test("public document version projection omits storage paths and internal creator IDs", () => {
    const version = {
        id: 31,
        document_id: 12,
        version: 2,
        file_path: "/srv/pm-setu/uploads/documents/previous-version.pdf",
        created_by: "internal-user-id",
        original_name: "circular.pdf",
    } as DocumentVersion;

    const result = toPublicDocumentVersion(version);

    assert.equal("file_path" in result, false);
    assert.equal("created_by" in result, false);
    assert.equal(result.original_name, "circular.pdf");
    assert.equal(result.version, 2);
});
