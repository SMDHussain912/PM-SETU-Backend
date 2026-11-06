import type { Request, Response } from "express";
import { discardDocumentUpload, validateDocumentUpload } from "./document.file-validation";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    CreateDocumentBody,
    DocumentIdParams,
    DocumentListQuery,
    UpdateDocumentBody,
} from "./document.schema";
import * as documentService from "./document.service";
import { toPublicDocument, toPublicDocumentVersion } from "./document.public";
import type { DocumentAuditContext } from "./document.service";

function getDocumentAuditContext(req: Request): DocumentAuditContext {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError({
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Authentication is required",
        });
    }
    return {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        path: req.originalUrl,
    };
}

/**
 * Document Management module — controller layer.
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function listDocuments(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, DocumentListQuery>(res);
    const result = await documentService.listDocuments(query);
    return sendSuccess(res, result.items.map(toPublicDocument), result.meta);
}

export async function getDocumentById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const document = await documentService.getDocumentById(params.id);
    return sendSuccess(res, toPublicDocument(document));
}

export async function downloadDocument(_req: Request, res: Response): Promise<void> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const { filePath, fileName } = await documentService.getDocumentFile(params.id);
    res.download(filePath, fileName);
}

export async function getDocumentVersions(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const versions = await documentService.getDocumentVersions(params.id);
    return sendSuccess(res, versions.map(toPublicDocumentVersion));
}

export async function createDocument(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateDocumentBody>(res);
    const document = await documentService.createDocument(body, getDocumentAuditContext(req));
    return sendCreated(res, document);
}

export async function updateDocument(_req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateDocumentBody, unknown, DocumentIdParams>(res);
    const document = await documentService.updateDocument(params.id, body, getDocumentAuditContext(_req));
    return sendSuccess(res, document);
}

export async function deleteDocument(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    await documentService.deleteDocument(params.id, getDocumentAuditContext(req));
    return sendSuccess(res, { id: params.id });
}

export async function publishDocument(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const document = await documentService.publishDocument(params.id, getDocumentAuditContext(req));
    return sendSuccess(res, document);
}

export async function archiveDocument(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const document = await documentService.archiveDocument(params.id, getDocumentAuditContext(req));
    return sendSuccess(res, document);
}

export async function createDocumentVersion(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, DocumentIdParams>(res);
    const context = getDocumentAuditContext(req);
    const document = await documentService.createDocumentVersion(params.id, context.userId, context);
    return sendCreated(res, document);
}

/**
 * POST /admin/documents/upload — row-less document file upload (RoadMap §24).
 * Returns stored-file metadata; the client persists file_path/file_name/mime_type/
 * file_size via POST /admin/documents or PATCH /admin/documents/:id. No DB
 * write happens here — the file is stored on disk and metadata is returned.
 */
export async function uploadDocumentFile(req: Request, res: Response): Promise<Response> {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
        throw new ApiError({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message: "A document file is required",
        });
    }
    let safeFileName: string;
    try {
        safeFileName = await validateDocumentUpload(file);
    } catch (error) {
        // Multer has already written the file. Do not leave rejected content on disk.
        await discardDocumentUpload(file.path).catch(() => undefined);
        throw error;
    }

    return sendSuccess(res, {
        file_path: file.path,
        // original_name is the canonical field accepted by document create/update.
        // file_name remains as a compatibility alias for existing clients.
        original_name: safeFileName,
        file_name: safeFileName,
        mime_type: file.mimetype,
        file_size: file.size,
    });
}
