import type { Document, DocumentVersion } from "./document.types";

/**
 * Public document responses must never disclose server filesystem paths.
 * Keep the published metadata contract while excluding storage internals.
 */
export type PublicDocument = Omit<Document, "file_path">;
export type PublicDocumentVersion = Omit<DocumentVersion, "file_path" | "created_by">;

export function toPublicDocument(document: Document): PublicDocument {
    const { file_path: _filePath, ...publicDocument } = document;
    return publicDocument;
}

export function toPublicDocumentVersion(version: DocumentVersion): PublicDocumentVersion {
    const { file_path: _filePath, created_by: _createdBy, ...publicVersion } = version;
    return publicVersion;
}
