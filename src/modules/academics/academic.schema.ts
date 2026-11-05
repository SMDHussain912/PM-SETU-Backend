import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const academicKpiCodes = ["ACD-01", "ACD-02", "ACD-03", "ACD-04", "ACD-05"] as const;
const payloadSchema = z.record(z.string(), z.unknown()).superRefine((value, ctx) => {
    const jsonSafe = (v: unknown, depth = 0): boolean => {
        if (depth > 8) return false;
        if (v === null || typeof v === "string" || typeof v === "boolean") return true;
        if (typeof v === "number") return Number.isFinite(v);
        if (Array.isArray(v)) return v.every((item) => jsonSafe(item, depth + 1));
        if (typeof v === "object") return Object.entries(v as Record<string, unknown>).every(([key, item]) =>
            !/(student_?name|trainer_?name|person_?name|full_?name|phone|mobile|email|aadhaar|aadhar|date_?of_?birth|^dob$|password|personal_?address)/i.test(key) && jsonSafe(item, depth + 1));
        return false;
    };
    if (!jsonSafe(value)) ctx.addIssue({ code: "custom", message: "payload must be JSON-safe, depth <= 8, and must not contain direct personal identifiers" });
    else if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 16 * 1024) ctx.addIssue({ code: "custom", message: "payload must not exceed 16 KB" });
});

export const academicRecordSchema = z.object({
    kpi_code: z.enum(academicKpiCodes),
    source_system: z.string().trim().min(1).max(100),
    source_record_id: z.string().trim().min(1).max(200),
    source_version: z.string().trim().max(100).nullable().optional(),
    cluster_id: z.number().int().positive().nullable().optional(),
    iti_id: z.number().int().positive().nullable().optional(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    subject_token: z.string().trim().min(1).max(200).nullable().optional(),
    payload: payloadSchema.default({}),
}).strict().superRefine((v, ctx) => {
    if (v.iti_id && !v.cluster_id) ctx.addIssue({ code: "custom", path: ["cluster_id"], message: "cluster_id is required when iti_id is supplied" });
    if (v.event_date) {
        const d = new Date(v.event_date + "T00:00:00.000Z");
        if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v.event_date) ctx.addIssue({ code: "custom", path: ["event_date"], message: "event_date must be a valid calendar date" });
    }
});
export const academicBatchSchema = z.object({ records: z.array(z.unknown()).min(1).max(200) }).strict();
export const academicListQuerySchema = paginationQuerySchema.extend({
    kpi_code: z.enum(academicKpiCodes).optional(),
    review_status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional(),
    cluster_id: z.coerce.number().int().positive().optional(),
    iti_id: z.coerce.number().int().positive().optional(),
    source_system: z.string().trim().min(1).max(100).optional(),
});
export const academicIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const academicReviewSchema = z.object({
    review_status: z.enum(["ACCEPTED", "REJECTED"]),
    review_note: z.string().trim().max(2000).nullable().optional(),
}).strict();
export type AcademicRecordInput = z.infer<typeof academicRecordSchema>;
export type AcademicListQuery = z.infer<typeof academicListQuerySchema>;
