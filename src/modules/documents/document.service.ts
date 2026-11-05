import path from "node:path";
import { realpath, stat } from "node:fs/promises";
import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { ensureUploadDir, uploadsRoot } from "../../config/storage";
import { prisma } from "../../config/database";
import { recordAuditEntry } from "../audit/audit.service";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateDocumentBody, DocumentListQuery, UpdateDocumentBody } from "./document.schema";
import * as documentRepository from "./document.repository";
import type { Document, DocumentVersion } from "./document.types";

/**
 * Document Management module — service layer.
 *
 * Owns business rules (pagination composition, not-found handling, file
 * existence checks) and delegates all data access to the repository.
 */

export interface DocumentAuditContext {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    path?: string;
}

async function recordDocumentAudit(
    tx: Prisma.TransactionClient,
    document: Document,
    action: string,
    oldValue: Document | null,
    context: DocumentAuditContext,
): Promise<void> {
    await recordAuditEntry({
        userId: context.userId,
        action,
        entity: "DOCUMENT",
        entityId: document.id,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: JSON.stringify(document),
        approvalStatus: document.publish_status,
        context: {
            userId: context.userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            path: context.path,
        },
    }, tx);
}

type UploadedDocumentMetadata = {
    file_path: string;
    file_size: number;
    mime_type: string;
    original_name: string;
};

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
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

async function resolveStoredDocumentPath(filePath: string): Promise<string> {
    let documentsRoot: string;
    let resolvedPath: string;
    try {
        documentsRoot = await realpath(path.join(uploadsRoot, "documents"));
        resolvedPath = await realpath(filePath);
    } catch {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_DOCUMENT_FILE",
            message: "The referenced uploaded document does not exist",
        });
    }

    const relativePath = path.relative(documentsRoot, resolvedPath);
    if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_DOCUMENT_FILE_PATH",
            message: "The document file must be inside the managed documents storage directory",
        });
    }

    const fileStats = await stat(resolvedPath);
    if (!fileStats.isFile()) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_DOCUMENT_FILE",
            message: "The referenced document is not a regular file",
        });
    }

    return resolvedPath;
}

/**
 * Never trust a client-supplied absolute path or file metadata. Resolve the
 * path through realpath (including symlinks), enforce the managed directory,
 * and compare the claimed size/MIME with the actual stored file.
 */
async function validateUploadedDocumentMetadata(input: {
    file_path?: string | null;
    file_size?: number | null;
    mime_type?: string | null;
    original_name?: string | null;
}): Promise<UploadedDocumentMetadata | null> {
    if (input.file_path === undefined) return null;
    if (input.file_path === null) {
        return {
            file_path: null as unknown as string,
            file_size: null as unknown as number,
            mime_type: null as unknown as string,
            original_name: null as unknown as string,
        };
    }

    const resolvedPath = await resolveStoredDocumentPath(input.file_path);
    const fileStats = await stat(resolvedPath);
    const extension = path.extname(input.original_name ?? "").toLowerCase();
    const expectedMime = DOCUMENT_MIME_BY_EXTENSION[extension];

    if (
        !expectedMime ||
        input.mime_type !== expectedMime ||
        input.file_size !== fileStats.size ||
        !input.original_name?.trim()
    ) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_DOCUMENT_FILE_METADATA",
            message: "The uploaded file metadata does not match the stored file",
        });
    }

    const originalName = path.basename(input.original_name)
        .replace(/[\\r\\n\\0]/g, "")
        .slice(0, 180);
    if (!originalName) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_DOCUMENT_FILE_NAME",
            message: "A valid original document filename is required",
        });
    }

    return {
        file_path: resolvedPath,
        file_size: fileStats.size,
        mime_type: expectedMime,
        original_name: originalName,
    };
}

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
    const document = await documentRepository.getPublishedDocumentById(id);
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
    const document = await documentRepository.getPublishedDocumentById(documentId);
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
    const document = await documentRepository.getPublishedDocumentById(id);
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
    const filePath = await resolveStoredDocumentPath(document.file_path);
    return { filePath, fileName: document.original_name ?? "document" };
}

async function requireDocument(id: number, db: Prisma.TransactionClient = prisma): Promise<Document> {
    const document = await documentRepository.getDocumentById(id, db);
    if (!document) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Document not found",
        });
    }
    return document;
}

async function getLockedDocument(id: number, tx: Prisma.TransactionClient): Promise<Document> {
    const document = await documentRepository.getDocumentByIdForUpdate(id, tx);
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

export async function createDocument(body: CreateDocumentBody, context: DocumentAuditContext): Promise<Document> {
    const fileMetadata = await validateUploadedDocumentMetadata(body);
    return prisma.$transaction(async (tx) => {
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
            file_path: fileMetadata?.file_path ?? null,
            file_size: fileMetadata?.file_size ?? null,
            mime_type: fileMetadata?.mime_type ?? null,
            original_name: fileMetadata?.original_name ?? null,
        }, tx);
        const created = await requireDocument(id, tx);
        await recordDocumentAudit(tx, created, "CREATE", null, context);
        return created;
    });
}

export async function updateDocument(id: number, body: UpdateDocumentBody, context: DocumentAuditContext): Promise<Document> {
    const fileMetadata = await validateUploadedDocumentMetadata(body);
    return prisma.$transaction(async (tx) => {
        const previous = await getLockedDocument(id, tx);
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
            ...(fileMetadata
                ? {
                    file_path: fileMetadata.file_path,
                    file_size: fileMetadata.file_size,
                    mime_type: fileMetadata.mime_type,
                    original_name: fileMetadata.original_name,
                }
                : body.file_path === null
                    ? { file_path: null, file_size: null, mime_type: null, original_name: null }
                    : {}),
        }, tx);
        const updated = await requireDocument(id, tx);
        await recordDocumentAudit(tx, updated, "UPDATE", previous, context);
        return updated;
    });
}

export async function deleteDocument(id: number, context: DocumentAuditContext): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const previous = await requireDocument(id, tx);
        await documentRepository.deleteDocument(id, tx);
        await recordAuditEntry({
            userId: context.userId,
            action: "DELETE",
            entity: "DOCUMENT",
            entityId: id,
            oldValue: JSON.stringify(previous),
            newValue: null,
            approvalStatus: previous.publish_status,
            context: {
                userId: context.userId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                path: context.path,
            },
        }, tx);
    });
}

export async function publishDocument(id: number, context: DocumentAuditContext): Promise<Document> {
    return prisma.$transaction(async (tx) => {
        const previous = await requireDocument(id, tx);
        if (previous.publish_status === "ARCHIVED") {
            throw new ApiError({
                statusCode: 422,
                code: "INVALID_TRANSITION",
                message: "Archived documents cannot be published",
            });
        }
        await documentRepository.publishDocument(id, tx);
        const updated = await requireDocument(id, tx);
        await recordDocumentAudit(tx, updated, "PUBLISH", previous, context);
        return updated;
    });
}

export async function archiveDocument(id: number, context: DocumentAuditContext): Promise<Document> {
    return prisma.$transaction(async (tx) => {
        const previous = await requireDocument(id, tx);
        await documentRepository.archiveDocument(id, tx);
        const updated = await requireDocument(id, tx);
        await recordDocumentAudit(tx, updated, "ARCHIVE", previous, context);
        return updated;
    });
}

export async function createDocumentVersion(
    id: number,
    createdBy: string | null,
    context: DocumentAuditContext,
): Promise<Document> {
    return prisma.$transaction(async (tx) => {
        const previous = await requireDocument(id, tx);
        await documentRepository.createDocumentVersion(id, createdBy, tx);
        const updated = await requireDocument(id, tx);
        await recordDocumentAudit(tx, updated, "VERSION", previous, context);
        return updated;
    });
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
