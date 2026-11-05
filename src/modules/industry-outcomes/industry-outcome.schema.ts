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
    event_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    event_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((query, ctx) => {
    for (const field of ["event_date_from", "event_date_to"] as const) {
        const value = query[field];
        if (value) {
            const parsed = new Date(value + "T00:00:00.000Z");
            if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
                ctx.addIssue({ code: "custom", path: [field], message: field + " must be a valid calendar date" });
            }
        }
    }
    if (query.event_date_from && query.event_date_to && query.event_date_from > query.event_date_to) {
        ctx.addIssue({ code: "custom", path: ["event_date_to"], message: "event_date_to must be on or after event_date_from" });
    }
});

const MAX_OUTCOME_PAYLOAD_BYTES = 16 * 1024;
const MAX_OUTCOME_PAYLOAD_DEPTH = 8;

function isJsonValue(value: unknown, depth = 0): boolean {
    if (depth > MAX_OUTCOME_PAYLOAD_DEPTH) return false;
    if (value === null || typeof value === "string" || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
    if (typeof value === "object") {
        return Object.values(value as Record<string, unknown>).every((item) => isJsonValue(item, depth + 1));
    }
    return false;
}

export const outcomePayloadSchema = z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
    if (!isJsonValue(value)) {
        ctx.addIssue({ code: "custom", message: "payload must contain JSON-compatible values with a maximum nesting depth of 8" });
        return;
    }
    const serialized = JSON.stringify(value);
    if (new TextEncoder().encode(serialized).byteLength > MAX_OUTCOME_PAYLOAD_BYTES) {
        ctx.addIssue({ code: "custom", message: "payload must not exceed 16 KB when serialized" });
    }
}).superRefine((query, ctx) => {
    for (const field of ["event_date_from", "event_date_to"] as const) {
        const value = query[field];
        if (value && Number.isNaN(Date.parse(value + "T00:00:00.000Z"))) {
            ctx.addIssue({ code: "custom", path: [field], message: field + " must be a valid calendar date" });
        }
    }
    if (query.event_date_from && query.event_date_to && query.event_date_from > query.event_date_to) {
        ctx.addIssue({ code: "custom", path: ["event_date_to"], message: "event_date_to must be on or after event_date_from" });
    }
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
    payload: outcomePayloadSchema.optional(),
}).strict().refine((v) => !v.iti_id || !!v.cluster_id, {
    message: "cluster_id is required when iti_id is supplied",
    path: ["cluster_id"],
});

export const importOutcomeBatchSchema = z.object({
    records: z.array(z.unknown()).min(1).max(200),
}).strict();

export const reviewOutcomeSchema = z.object({
    review_status: z.enum(["VERIFIED", "REJECTED"]),
    review_note: z.string().trim().max(2000).nullable().optional(),
}).strict();

export type OutcomeIdParams = z.infer<typeof outcomeIdParamsSchema>;
export type OutcomeListQuery = z.infer<typeof outcomeListQuerySchema>;
export type CreateOutcomeBody = z.infer<typeof createOutcomeSchema>;
export type ReviewOutcomeBody = z.infer<typeof reviewOutcomeSchema>;
export type ImportOutcomeBatchBody = z.infer<typeof importOutcomeBatchSchema>;
