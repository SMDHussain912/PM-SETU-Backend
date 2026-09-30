import fs from "node:fs";
import path from "node:path";
import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { ensureUploadDir } from "../../config/storage";
import type { CreateDocumentBody, DocumentListQuery, UpdateDocumentBody } from "./document.schema";
import * as documentRepository from "./document.repository";
import type { Document, DocumentVersion } from "./document.types";

/**
 * Document Management module — service layer.
 *
 * Owns business rules (pagination composition, not-found handling, file
 * existence checks) and delegates all data access to the repository.
 */

export interface DocumentListResult {
    items: Document[];
    meta: PaginationMeta;
}

export async function listDocuments(query: DocumentListQuery): Promise<DocumentListResult> {
    const filters = {
        type: query.type,
        cluster_id: query.cluster_id,
        year: query.year,
        department: query.department,
        keyword: query.keyword,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        documentRepository.listDocuments(filters),
        documentRepository.countDocuments(filters),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getDocumentById(id: number): Promise<Document> {
    const document = await documentRepository.getDocumentById(id);
    if (!document) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Document not found",
        });
    }
    return document;
}

export async function getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    // Verify the document exists first
    const document = await documentRepository.getDocumentById(documentId);
    if (!document) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Document not found",
        });
    }
    return documentRepository.getDocumentVersions(documentId);
}

export async function getDocumentFile(id: number): Promise<{ filePath: string; fileName: string }> {
    const document = await documentRepository.getDocumentById(id);
    if (!document) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Document not found",
        });
    }
    if (!document.file_path) {
        throw new ApiError({
            statusCode: 404,
            code: "FILE_NOT_FOUND",
            message: "File not found",
        });
    }
    // Verify the file exists on disk
    if (!fs.existsSync(document.file_path)) {
        throw new ApiError({
            statusCode: 404,
            code: "FILE_NOT_FOUND",
            message: "File not found on disk",
        });
    }
    return { filePath: document.file_path, fileName: document.original_name ?? "document" };
}

async function requireDocument(id: number): Promise<Document> {
    const document = await documentRepository.getDocumentById(id);
    if (!document) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Document not found",
        });
    }
    return document;
}

function toDateOrNull(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) {
        return null;
    }
    return new Date(`${value}T00:00:00.000Z`);
}

export async function createDocument(body: CreateDocumentBody): Promise<Document> {
    const id = await documentRepository.createDocument({
        title: body.title ?? null,
        document_number: body.document_number ?? null,
        type: body.type ?? null,
        department: body.department ?? null,
        issue_date: body.issue_date ? toDateOrNull(body.issue_date) : null,
        financial_year: body.financial_year ?? null,
        cluster_id: body.cluster_id ?? null,
        keywords: body.keywords ?? null,
        language: body.language ?? null,
    });
    return requireDocument(id);
}

export async function updateDocument(id: number, body: UpdateDocumentBody): Promise<Document> {
    await requireDocument(id);
    await documentRepository.updateDocument(id, {
        title: body.title,
        document_number: body.document_number,
        type: body.type,
        department: body.department,
        issue_date: body.issue_date !== undefined ? toDateOrNull(body.issue_date ?? undefined) : undefined,
        financial_year: body.financial_year,
        cluster_id: body.cluster_id,
        keywords: body.keywords,
        language: body.language,
    });
    return requireDocument(id);
}

export async function deleteDocument(id: number): Promise<void> {
    await requireDocument(id);
    await documentRepository.deleteDocument(id);
}

export async function publishDocument(id: number): Promise<Document> {
    const document = await requireDocument(id);
    if (document.publish_status === "ARCHIVED") {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_TRANSITION",
            message: "Archived documents cannot be published",
        });
    }
    await documentRepository.publishDocument(id);
    return requireDocument(id);
}

export async function archiveDocument(id: number): Promise<Document> {
    await requireDocument(id);
    await documentRepository.archiveDocument(id);
    return requireDocument(id);
}

export async function createDocumentVersion(id: number, createdBy: string | null): Promise<Document> {
    await requireDocument(id);
    await documentRepository.createDocumentVersion(id, createdBy);
    return requireDocument(id);
}

export async function attachDocumentFile(
    id: number,
    file: Express.Multer.File,
): Promise<Document> {
    await requireDocument(id);
    await documentRepository.updateDocumentFile(id, {
        file_path: path.resolve(ensureUploadDir("documents"), file.filename),
        file_size: file.size,
        mime_type: file.mimetype,
        original_name: file.originalname,
    });
    return requireDocument(id);
}
