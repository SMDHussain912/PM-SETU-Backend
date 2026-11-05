import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const outcomeTypes = [
    "APPRENTICESHIP",
    "OJT",
    "INDUSTRY_EXPOSURE",
    "PLACEMENT",
    "EMPLOYER_PARTICIPATION",
] as const;

export const outcomeIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const outcomeListQuerySchema = paginationQuerySchema.extend({
    outcome_type: z.enum(outcomeTypes).optional(),
    review_status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    iti_id: z.coerce.number().int().positive().optional(),
    source_system: z.string().trim().min(1).max(100).optional(),
});

export const createOutcomeSchema = z.object({
    outcome_type: z.enum(outcomeTypes),
    source_system: z.string().trim().min(1).max(100),
    source_record_id: z.string().trim().min(1).max(200).nullable().optional(),
    cluster_id: z.number().int().positive().nullable().optional(),
    iti_id: z.number().int().positive().nullable().optional(),
    employer_name: z.string().trim().min(1).max(200).nullable().optional(),
    participant_ref: z.string().trim().min(1).max(200).nullable().optional(),
    event_date: z.coerce.date().nullable().optional(),
    evidence_ref: z.string().trim().min(1).max(2048).nullable().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
}).strict().refine((v) => !v.iti_id || !!v.cluster_id, {
    message: "cluster_id is required when iti_id is supplied",
    path: ["cluster_id"],
});

export const reviewOutcomeSchema = z.object({
    review_status: z.enum(["VERIFIED", "REJECTED"]),
    review_note: z.string().trim().max(2000).nullable().optional(),
}).strict();

export type OutcomeIdParams = z.infer<typeof outcomeIdParamsSchema>;
export type OutcomeListQuery = z.infer<typeof outcomeListQuerySchema>;
export type CreateOutcomeBody = z.infer<typeof createOutcomeSchema>;
export type ReviewOutcomeBody = z.infer<typeof reviewOutcomeSchema>;
