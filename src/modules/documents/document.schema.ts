import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Document Management module — request validation.
 *
 * GET endpoints have no body. Only route params and the 6 documented §12
 * filters are validated. No enum constraints are invented for type/department
 * (vocabularies are TO CONFIRM).
 */

export const documentIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const optionalDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "issue_date must be in YYYY-MM-DD format")
    .optional();

export const documentListQuerySchema = paginationQuerySchema.extend({
    type: z.string().trim().min(1).max(50).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    year: z
        .string()
        .trim()
        .regex(/^\d{4}$/, "Year must be a 4-digit year")
        .optional(),
    department: z.string().trim().min(1).max(50).optional(),
    keyword: z.string().trim().min(1).max(100).optional(),
    from: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be in YYYY-MM-DD format")
        .optional(),
    to: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be in YYYY-MM-DD format")
        .optional(),
});

export type DocumentIdParams = z.infer<typeof documentIdParamsSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

/**
 * File metadata is accepted only as one complete tuple. The path is merely a
 * reference to a file previously stored by this server; the service resolves
 * and verifies it against the configured documents upload directory.
 */
const documentFileMetadataSchema = z.object({
    file_path: z.string().trim().min(1).max(2000).nullable().optional(),
    file_size: z.coerce.number().int().positive().nullable().optional(),
    mime_type: z.string().trim().min(1).max(100).nullable().optional(),
    original_name: z.string().trim().min(1).max(255).nullable().optional(),
});

function validateFileMetadata(
    value: z.infer<typeof documentFileMetadataSchema>,
    context: z.RefinementCtx,
): void {
    const supplied = [
        value.file_path,
        value.file_size,
        value.mime_type,
        value.original_name,
    ].filter((field) => field !== undefined && field !== null);

    if (supplied.length === 0) return;

    if (value.file_path === null) {
        if (supplied.length !== 1) {
            context.addIssue({
                code: "custom",
                path: ["file_path"],
                message: "Clearing a document file requires file_path: null without other file metadata",
            });
        }
        return;
    }

    if (
        !value.file_path ||
        value.file_size === undefined ||
        value.file_size === null ||
        !value.mime_type ||
        !value.original_name
    ) {
        context.addIssue({
            code: "custom",
            path: ["file_path"],
            message: "file_path, file_size, mime_type and original_name must be supplied together",
        });
    }
}

/**
 * Admin write validation (RoadMap §12 admin + §24 upload metadata).
 * No enum vocabularies are invented for type/department/publish_status.
 */
export const createDocumentSchema = z.object({
    title: z.string().trim().min(1).max(500).nullish(),
    document_number: z.string().trim().max(100).nullish(),
    type: z.string().trim().max(50).nullish(),
    department: z.string().trim().max(50).nullish(),
    issue_date: optionalDate,
    financial_year: z.string().trim().max(20).nullish(),
    cluster_id: z.coerce.number().int().positive().nullish(),
    keywords: z.string().trim().max(500).nullish(),
    language: z.string().trim().max(20).nullish(),
    ...documentFileMetadataSchema.shape,
}).superRefine(validateFileMetadata);

export const updateDocumentSchema = createDocumentSchema;

export type CreateDocumentBody = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentSchema>;
