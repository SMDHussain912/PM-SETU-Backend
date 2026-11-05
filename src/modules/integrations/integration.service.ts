import { prisma } from "../../config/database";
import { ApiError } from "../../utils/response";
import * as repo from "./integration.repository";
import type { IntegrationSourceInput } from "./integration.schema";
export async function list(filters: { enabled?: boolean; system?: string }) { return repo.list(filters); }
export async function create(input: IntegrationSourceInput) {
  try { return await repo.create(input); }
  catch (error) { if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new ApiError({ statusCode: 409, code: "INTEGRATION_SOURCE_EXISTS", message: "An integration source with this code already exists" }); throw error; }
}
export async function setEnabled(id: number, enabled: boolean) {
  const source = await repo.get(id);
  if (!source) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  return repo.updateEnabled(id, enabled);
}
export async function recordRun(id: number, input: { status: "SUCCEEDED" | "PARTIAL" | "FAILED"; records_read: number; records_created: number; records_updated: number; records_rejected: number; cursor?: string | null; error_code?: string | null; error_summary?: string | null }) {
  const source = await repo.get(id);
  if (!source) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  if (!source.enabled) throw new ApiError({ statusCode: 409, code: "INTEGRATION_DISABLED", message: "Integration source is disabled" });
  const now = new Date();
  return repo.createRun({ sourceId: id, status: input.status, recordsRead: input.records_read, recordsCreated: input.records_created, recordsUpdated: input.records_updated, recordsRejected: input.records_rejected, cursor: input.cursor ?? null, errorCode: input.error_code ?? null, errorSummary: input.error_summary ?? null, startedAt: now, completedAt: now });
}
export async function runs(id: number) {
  if (!await repo.get(id)) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  return repo.listRuns(id);
}

export async function ingest(id: number, records: import("./integration.schema").IntegrationIngestInput["records"]) {
  const source = await repo.get(id);
  if (!source) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  if (!source.enabled) throw new ApiError({ statusCode: 409, code: "INTEGRATION_DISABLED", message: "Integration source is disabled" });
  return repo.ingestBatch(id, records);
}
