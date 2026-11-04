import { z } from "zod";
export const aipWorkflowParamsSchema=z.object({id:z.coerce.number().int().positive()});
export const createAipActivitySchema=z.object({
 activity_type:z.enum(["INDUSTRY_ENGAGEMENT","APPRENTICESHIP","PLACEMENT","FACULTY_SUPPORT","EQUIPMENT_SUPPORT","TRAINING_SUPPORT","OTHER"]),
 title:z.string().trim().min(3).max(180),
 description:z.string().trim().max(4000).optional(),
 quantity:z.number().int().nonnegative().optional(),
 activity_date:z.string().date().optional(),
 institute_id:z.number().int().positive().optional(),
 evidence_url:z.string().url().max(2048).optional(),
});
export const createAipReportSchema=z.object({title:z.string().trim().min(3).max(180),report_period:z.string().trim().min(4).max(40),payload:z.record(z.string(),z.unknown())});
export const aipReportParamsSchema=aipWorkflowParamsSchema.extend({submissionId:z.coerce.number().int().positive()});
export const updateAipReportSchema=z.object({title:z.string().trim().min(3).max(180).optional(),report_period:z.string().trim().min(4).max(40).optional(),payload:z.record(z.string(),z.unknown()).optional()}).strict().refine(v=>Object.keys(v).length>0);
export const reviewAipReportSchema=z.object({decision:z.enum(["APPROVED","REVISION_REQUESTED","REJECTED"]),remarks:z.string().trim().min(3).max(2000)});
export type CreateAipActivity=z.infer<typeof createAipActivitySchema>;
export type CreateAipReport=z.infer<typeof createAipReportSchema>;
