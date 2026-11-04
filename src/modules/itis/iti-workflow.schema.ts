import { z } from "zod";

export const updateItiProfileSchema = z.object({
  address: z.string().trim().max(500).nullable().optional(),
  principal: z.string().trim().max(160).nullable().optional(),
  contact: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  existing_trades: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  proposed_trades: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  student_strength: z.number().int().min(0).max(1000000).nullable().optional(),
  infrastructure: z.string().trim().max(10000).nullable().optional(),
  lab_details: z.string().trim().max(10000).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one field to update");

export const itiSubmissionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  submissionId: z.coerce.number().int().positive().optional(),
});
export const createItiSubmissionSchema = z.object({
  report_type: z.enum(["PERSONNEL","TRAINING","INFRASTRUCTURE","STUDENT_PROGRESS","MONTHLY_PROGRESS","OTHER"]),
  title: z.string().trim().min(3).max(180),
  payload: z.record(z.unknown()),
});
export const updateItiSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  payload: z.record(z.unknown()).optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Provide title or payload");
export const reviewItiSubmissionSchema = z.object({
  decision: z.enum(["APPROVED","REVISION_REQUESTED","REJECTED"]),
  remarks: z.string().trim().min(3).max(2000),
});
export type UpdateItiProfile = z.infer<typeof updateItiProfileSchema>;
export type CreateItiSubmission = z.infer<typeof createItiSubmissionSchema>;
