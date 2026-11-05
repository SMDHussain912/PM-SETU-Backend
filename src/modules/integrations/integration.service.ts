import { prisma } from "../../config/database";
import { ApiError } from "../../utils/response";
import { integrationAdapterRegistry } from "./integration.adapters";
import { integrationIngestSchema } from "./integration.schema";
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

function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function runScheduledSource(source: NonNullable<Awaited<ReturnType<typeof repo.get>>>) {
  const startedAt = new Date();
  const adapter = integrationAdapterRegistry.get(source.code);
  if (!adapter || adapter.system !== source.system) {
    return repo.createRun({ sourceId: source.id, status: "FAILED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor: null, errorCode: adapter ? "ADAPTER_SYSTEM_MISMATCH" : "ADAPTER_NOT_CONFIGURED", errorSummary: adapter ? "Adapter system does not match source system" : "No reviewed adapter is registered for this source", startedAt, completedAt: new Date() });
  }
  const latest = await repo.listRuns(source.id, 1);
  const previous = latest[0];
  const cursor = previous?.status === "PARTIAL" ? previous.cursor : null;
  let page;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try { page = await adapter.fetchPage({ sourceCode: source.code, cursor, since: previous?.completedAt.toISOString() ?? null }); break; }
    catch (error) { lastError = error; if (attempt < 4) await delay(Math.min(1000 * (2 ** (attempt - 1)), 8000)); }
  }
  if (!page) {
    const message = lastError instanceof Error ? lastError.message : "Unknown adapter error";
    return repo.createRun({ sourceId: source.id, status: "FAILED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor, errorCode: "ADAPTER_EXECUTION_FAILED", errorSummary: message.slice(0, 1000), startedAt, completedAt: new Date() });
  }
  if (!Array.isArray(page.records) || page.records.length > 500 || typeof page.hasMore !== "boolean" || (page.hasMore && !page.nextCursor)) throw new ApiError({ statusCode: 502, code: "ADAPTER_RESPONSE_INVALID", message: "Adapter returned an invalid page or missing continuation cursor" });
  const parsed = integrationIngestSchema.safeParse({ records: page.records });
  if (!parsed.success) throw new ApiError({ statusCode: 422, code: "ADAPTER_RECORDS_INVALID", message: "Adapter records failed ingestion validation", details: parsed.error.flatten() });
  if (!parsed.data.records.length) return repo.createRun({ sourceId: source.id, status: page.hasMore ? "PARTIAL" : "SUCCEEDED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor: page.nextCursor ?? null, errorCode: null, errorSummary: null, startedAt, completedAt: new Date() });
  return repo.ingestBatch(source.id, parsed.data.records, { cursor: page.nextCursor ?? null, status: page.hasMore ? "PARTIAL" : "SUCCEEDED", startedAt });
}
