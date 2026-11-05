import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * AIP module request schemas.
 *
 * Both endpoints are GET — there is no request body to validate. Only the
 * path parameter and the list query string are validated, using the shared
 * validate() middleware (src/middleware/validate.middleware.ts) and the
 * shared pagination schema.
 */

/** GET /aips/:id */
export const aipIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * GET /aips — filters from RoadMap.md §8 "Search/filter" (sector,
 * cluster_id, status, search) plus pagination from the shared utility.
 * `status` is an exact free-string match — the partnership-status vocabulary
 * is TO CONFIRM, so no enum is invented here.
 */
export const aipListQuerySchema = paginationQuerySchema.extend({
    sector: z.string().trim().min(1).max(100).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    status: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

export type AipIdParams = z.infer<typeof aipIdParamsSchema>;
export type AipListQuery = z.infer<typeof aipListQuerySchema>;


const aipText = z.string().trim().min(1).max(200);
const nullableText = z.string().trim().max(500).nullable().optional();
const nullableUrl = z.string().trim().url().max(2048).nullable().optional();
const investmentAmount = z.number().finite().nonnegative().max(9999999999999999.99).nullable().optional();

/** AIP registry creation fields mirror the Prisma Aip model exactly. */
export const createAipSchema = z.object({
    name: aipText,
    sector: aipText,
    status: aipText,
    cluster_id: z.number().int().positive().nullable().optional(),
    logo_url: nullableUrl,
    investment_amount: investmentAmount,
    academic_partner: z.boolean().optional(),
    contact: nullableText,
    website: nullableUrl,
}).strict();

/** Partial AIP master-data update; status remains free text until NIC confirms its vocabulary. */
export const updateAipSchema = z.object({
    name: aipText.optional(),
    sector: aipText.optional(),
    status: aipText.optional(),
    cluster_id: z.number().int().positive().nullable().optional(),
    logo_url: nullableUrl,
    investment_amount: investmentAmount,
    academic_partner: z.boolean().optional(),
    contact: nullableText,
    website: nullableUrl,
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one AIP field must be supplied",
});

export type CreateAipBody = z.infer<typeof createAipSchema>;
export type UpdateAipBody = z.infer<typeof updateAipSchema>;
