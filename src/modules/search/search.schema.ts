import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Search module — request validation.
 *
 * GET endpoints have no body. Only the search query, optional entity type
 * filter, and pagination are validated. No enum constraints are invented for
 * filters (vocabularies are TO CONFIRM).
 */

export const searchQuerySchema = paginationQuerySchema.extend({
    q: z.string().trim().min(1).max(200),
    type: z
        .enum(["cluster", "iti", "aip", "spv", "sip", "document", "news"])
        .optional(),
    district: z.string().trim().min(1).max(100).optional(),
    year: z
        .string()
        .trim()
        .regex(/^\d{4}$/, "Year must be a 4-digit year")
        .optional(),
    category: z.string().trim().min(1).max(100).optional(),
    date: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional(),
    document_type: z.string().trim().min(1).max(50).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
