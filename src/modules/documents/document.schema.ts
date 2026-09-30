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
 * Admin write validation (RoadMap §12 admin + §24 upload metadata).
 * All fields are optional-nullable (TO CONFIRM — mirrors the public Document
 * shape where every field except id is nullable). No enum vocabularies are
 * invented for type/department/publish_status.
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
    // File metadata — bound after a row-less POST /admin/documents/upload
    // returns its stored-file metadata (INFERRED / TO CONFIRM).
    file_path: z.string().trim().max(2000).nullish(),
    file_size: z.coerce.number().int().min(0).nullish(),
    mime_type: z.string().trim().max(100).nullish(),
    original_name: z.string().trim().max(255).nullish(),
});

export const updateDocumentSchema = createDocumentSchema;

export type CreateDocumentBody = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentBody = z.infer<typeof updateDocumentSchema>;

