import { z } from "zod";
export const spvWorkflowParamsSchema=z.object({id:z.coerce.number().int().positive()});
export const createSpvActivitySchema=z.object({
 activity_type:z.enum(["FORMATION","INCORPORATION","OPERATIONS","INDUSTRY_ENGAGEMENT","EMPLOYMENT","TRAINING","OTHER"]),
 title:z.string().trim().min(3).max(180),
 description:z.string().trim().max(4000).optional(),
 quantity:z.number().int().nonnegative().optional(),
 activity_date:z.string().date().optional(),
 evidence_url:z.string().url().max(2048).optional(),
});
export const createSpvReportSchema=z.object({title:z.string().trim().min(3).max(180),report_period:z.string().trim().min(4).max(40),payload:z.record(z.string(),z.unknown())});
export const spvReportParamsSchema=spvWorkflowParamsSchema.extend({submissionId:z.coerce.number().int().positive()});
export const updateSpvReportSchema=z.object({title:z.string().trim().min(3).max(180).optional(),report_period:z.string().trim().min(4).max(40).optional(),payload:z.record(z.string(),z.unknown()).optional()}).strict().refine(v=>Object.keys(v).length>0);
export const reviewSpvReportSchema=z.object({decision:z.enum(["APPROVED","REVISION_REQUESTED","REJECTED"]),remarks:z.string().trim().min(3).max(2000)});
export type CreateSpvActivity=z.infer<typeof createSpvActivitySchema>;
export type CreateSpvReport=z.infer<typeof createSpvReportSchema>;
