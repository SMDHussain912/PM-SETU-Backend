import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const itiIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const clusterIdParamsSchema = z.object({
    clusterId: z.coerce.number().int().positive(),
});

export const itiListQuerySchema = paginationQuerySchema.extend({
    district: z.string().trim().min(1).max(100).optional(),
    type: z.enum(["HUB", "SPOKE"]).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

const requiredText = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(200).nullable().optional();
const textArray = z.array(z.string().trim().min(1).max(150)).max(100);

export const createItiSchema = z.object({
    iti_code: requiredText,
    iti_name: requiredText,
    type: z.enum(["HUB", "SPOKE"]),
    district: requiredText,
    cluster_id: z.number().int().positive().nullable().optional(),
    address: optionalText,
    principal: optionalText,
    contact: optionalText,
    email: z.string().trim().email().max(254).nullable().optional(),
    existing_trades: textArray.optional(),
    proposed_trades: textArray.optional(),
    student_strength: z.number().int().nonnegative().nullable().optional(),
    infrastructure: optionalText,
    lab_details: optionalText,
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    photos: z.array(z.string().url().max(2048)).max(100).optional(),
    status: z.string().trim().min(1).max(50).optional(),
}).strict();

export const updateItiSchema = z.object({
    iti_code: requiredText.optional(),
    iti_name: requiredText.optional(),
    type: z.enum(["HUB", "SPOKE"]).optional(),
    district: requiredText.optional(),
    cluster_id: z.number().int().positive().nullable().optional(),
    address: optionalText,
    principal: optionalText,
    contact: optionalText,
    email: z.string().trim().email().max(254).nullable().optional(),
    existing_trades: textArray.optional(),
    proposed_trades: textArray.optional(),
    student_strength: z.number().int().nonnegative().nullable().optional(),
    infrastructure: optionalText,
    lab_details: optionalText,
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    photos: z.array(z.string().url().max(2048)).max(100).optional(),
    status: z.string().trim().min(1).max(50).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one ITI field must be supplied",
});

export type ItiIdParams = z.infer<typeof itiIdParamsSchema>;
export type ClusterIdParams = z.infer<typeof clusterIdParamsSchema>;
export type ItiListQuery = z.infer<typeof itiListQuerySchema>;
export type CreateItiBody = z.infer<typeof createItiSchema>;
export type UpdateItiBody = z.infer<typeof updateItiSchema>;
