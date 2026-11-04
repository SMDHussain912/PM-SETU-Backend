import { z } from "zod";
export const clusterWorkflowParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const createClusterReportSchema = z.object({
  title: z.string().trim().min(3).max(180),
  report_period: z.string().trim().min(4).max(40),
  payload: z.record(z.string(), z.unknown()),
});
export const updateClusterReportSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  report_period: z.string().trim().min(4).max(40).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
}).strict().refine(v => Object.keys(v).length > 0, "Provide at least one field");
export const clusterReportParamsSchema = clusterWorkflowParamsSchema.extend({ submissionId: z.coerce.number().int().positive() });
export const reviewClusterReportSchema = z.object({
  decision: z.enum(["APPROVED","REVISION_REQUESTED","REJECTED"]),
  remarks: z.string().trim().min(3).max(2000),
});
export type CreateClusterReport = z.infer<typeof createClusterReportSchema>;
