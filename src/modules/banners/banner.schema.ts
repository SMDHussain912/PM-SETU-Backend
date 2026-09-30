import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Banner Management module — request validation (RoadMap.md §15).
 *
 * Public GET endpoints validate pagination only (§15 documents no filters,
 * so none are invented). Admin create/update validate the INFERRED banner
 * fields (TO CONFIRM); publish/archive/images take no JSON body.
 */

const optionalUrl = z.string().trim().url().max(2000).nullish();

const optionalDateTime = z
    .string()
    .datetime({ offset: true })
    .nullish()
    .transform((value) => (value == null || value === "" ? null : new Date(value)));

export const bannerIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const bannerListQuerySchema = paginationQuerySchema;

export const createBannerSchema = z
    .object({
        title: z.string().trim().min(1).max(255),
        desktop_image_url: optionalUrl,
        mobile_image_url: optionalUrl,
        cta_text: z.string().trim().max(255).nullish(),
        cta_url: optionalUrl,
        display_order: z.coerce.number().int().min(0).default(0),
        start_date: optionalDateTime,
        end_date: optionalDateTime,
    })
    .refine((value) => value.end_date === null || value.start_date === null || value.end_date >= value.start_date, {
        message: "end_date must be on or after start_date",
        path: ["end_date"],
    });

export const updateBannerSchema = z
    .object({
        title: z.string().trim().min(1).max(255).optional(),
        desktop_image_url: optionalUrl,
        mobile_image_url: optionalUrl,
        cta_text: z.string().trim().max(255).nullish(),
        cta_url: optionalUrl,
        display_order: z.coerce.number().int().min(0).optional(),
        start_date: optionalDateTime,
        end_date: optionalDateTime,
    })
    .refine((value) => value.end_date == null || value.start_date == null || value.end_date >= value.start_date, {
        message: "end_date must be on or after start_date",
        path: ["end_date"],
    });

export type BannerIdParams = z.infer<typeof bannerIdParamsSchema>;
export type BannerListQuery = z.infer<typeof bannerListQuerySchema>;
export type CreateBannerBody = z.infer<typeof createBannerSchema>;
export type UpdateBannerBody = z.infer<typeof updateBannerSchema>;

