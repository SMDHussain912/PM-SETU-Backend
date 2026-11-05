import { z } from "zod";
import { INTEGRATION_SYSTEMS } from "./integration.types";
export const integrationSourceSchema = z.object({
  code: z.string().trim().min(2).max(60).regex(/^[A-Z][A-Z0-9_]*$/),
  name: z.string().trim().min(2).max(120),
  system: z.enum(INTEGRATION_SYSTEMS),
  transport: z.enum(["REST", "SFTP", "CSV_UPLOAD", "WEBHOOK"]),
  enabled: z.boolean().default(false),
  credential_ref: z.string().trim().min(2).max(120).regex(/^[A-Z][A-Z0-9_]*$/).nullable().optional(),
}).strict();
export const integrationIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const integrationListSchema = z.object({ enabled: z.enum(["true", "false"]).optional(), system: z.enum(INTEGRATION_SYSTEMS).optional() });
export const integrationRunSchema = z.object({
  status: z.enum(["SUCCEEDED", "PARTIAL", "FAILED"]),
  records_read: z.number().int().min(0).max(1000000),
  records_created: z.number().int().min(0).max(1000000),
  records_updated: z.number().int().min(0).max(1000000),
  records_rejected: z.number().int().min(0).max(1000000),
  cursor: z.string().max(2000).nullable().optional(),
  error_code: z.string().max(100).nullable().optional(),
  error_summary: z.string().max(1000).nullable().optional(),
}).strict().superRefine((v, ctx) => {
  if (v.status === "FAILED" && !v.error_code) ctx.addIssue({ code: "custom", path: ["error_code"], message: "error_code is required for failed runs" });
  if (v.records_created + v.records_updated + v.records_rejected > v.records_read) ctx.addIssue({ code: "custom", message: "processed record counts cannot exceed records_read" });
});
export type IntegrationSourceInput = z.infer<typeof integrationSourceSchema>;
