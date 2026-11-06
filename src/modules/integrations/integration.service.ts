import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../../utils/response";
import { integrationAdapterRegistry } from "./integration.adapters";
import { selectCommittedCheckpoint } from "./integration.checkpoint";
import { executeWithRetry } from "./integration.retry";
import { integrationAdapterPageSchema, integrationIngestSchema } from "./integration.schema";
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
export async function setSchedule(id: number, seconds: number | null) {
  if (!await repo.get(id)) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  return repo.updateSchedule(id, seconds);
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
  return ingestEnabledSource(id, records);
}

async function ingestEnabledSource(sourceId: number, records: import("./integration.schema").IntegrationIngestInput["records"]) {
  try {
    return await repo.ingestBatch(sourceId, records);
  } catch (error) {
    if (error instanceof Error && error.message === "INTEGRATION_SOURCE_NOT_ENABLED") {
      throw new ApiError({ statusCode: 409, code: "INTEGRATION_DISABLED", message: "Integration source is disabled" });
    }
    throw error;
  }
}

type ScheduledSourceRepository = Pick<typeof repo, "listCommittedRuns" | "createScheduledRun" | "ingestBatch">;

export async function runScheduledSource(
  source: NonNullable<Awaited<ReturnType<typeof repo.get>>>,
  claimToken: string,
  repository: ScheduledSourceRepository = repo,
) {
  const startedAt = new Date();
  const adapter = integrationAdapterRegistry.get(source.code);
  if (!adapter || adapter.system !== source.system) {
    return repo.createScheduledRun(source.id, claimToken, { status: "FAILED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor: null, errorCode: adapter ? "ADAPTER_SYSTEM_MISMATCH" : "ADAPTER_NOT_CONFIGURED", errorSummary: adapter ? "Adapter system does not match source system" : "No reviewed adapter is registered for this source", startedAt, completedAt: new Date() });
  }
  const history = await repository.listCommittedRuns(source.id, 1);
  const previous = selectCommittedCheckpoint(history);
  // Preserve the last committed cursor across failed runs so transient adapter
  // failures do not restart a large source from its beginning.
  const cursor = previous?.cursor ?? null;
  const retry = await executeWithRetry(
    () => adapter.fetchPage({ sourceCode: source.code, cursor, since: previous?.completedAt.toISOString() ?? null }),
    { attempts: 4, baseDelayMs: 1000, maxDelayMs: 8000 },
  );
  if (retry.exhausted || retry.value === undefined) {
    // Do not persist upstream exception text: providers sometimes include URLs,
    // response fragments, or credentials in error messages.
    return repository.createScheduledRun(source.id, claimToken, { status: "FAILED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor, errorCode: "ADAPTER_EXECUTION_FAILED", errorSummary: "Adapter request failed after four attempts", startedAt, completedAt: new Date() });
  }
  const page = retry.value;
  const pageResult = integrationAdapterPageSchema.safeParse(page);
  if (!pageResult.success) throw new ApiError({ statusCode: 502, code: "ADAPTER_RESPONSE_INVALID", message: "Adapter returned an invalid page envelope" });
  const validPage = pageResult.data;
  if (validPage.records.length === 0) return repository.createScheduledRun(source.id, claimToken, { status: validPage.hasMore ? "PARTIAL" : "SUCCEEDED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor: validPage.nextCursor ?? null, errorCode: null, errorSummary: null, startedAt, completedAt: new Date() });
  const parsed = integrationIngestSchema.safeParse({ records: validPage.records });
  if (!parsed.success) throw new ApiError({ statusCode: 422, code: "ADAPTER_RECORDS_INVALID", message: "Adapter records failed ingestion validation", details: parsed.error.flatten() });
  return repository.ingestBatch(source.id, parsed.data.records, { cursor: validPage.nextCursor ?? null, status: validPage.hasMore ? "PARTIAL" : "SUCCEEDED", startedAt, claimToken });
}


async function enabledSource(id: number) {
  const source = await repo.get(id);
  if (!source) throw new ApiError({ statusCode: 404, code: "INTEGRATION_NOT_FOUND", message: "Integration source not found" });
  if (!source.enabled) throw new ApiError({ statusCode: 409, code: "INTEGRATION_DISABLED", message: "Integration source is disabled" });
  return source;
}

export async function ingestCsv(id: number, records: import("./integration.schema").IntegrationIngestInput["records"]) {
  const source = await enabledSource(id);
  if (source.transport !== "CSV_UPLOAD") throw new ApiError({ statusCode: 409, code: "INTEGRATION_TRANSPORT_MISMATCH", message: "This source is not configured for CSV uploads" });
  return ingestEnabledSource(id, records);
}

export async function ingestWebhook(id: number, rawBody: Buffer, signature: string | undefined, records: import("./integration.schema").IntegrationIngestInput["records"]) {
  const source = await enabledSource(id);
  if (source.transport !== "WEBHOOK") throw new ApiError({ statusCode: 409, code: "INTEGRATION_TRANSPORT_MISMATCH", message: "This source is not configured for webhooks" });
  if (!source.credentialRef) throw new ApiError({ statusCode: 503, code: "WEBHOOK_SECRET_NOT_CONFIGURED", message: "Webhook secret reference is not configured" });
  const secret = process.env[source.credentialRef];
  if (!secret || Buffer.byteLength(secret) < 32) throw new ApiError({ statusCode: 503, code: "WEBHOOK_SECRET_UNAVAILABLE", message: "Webhook deployment secret is unavailable or too short" });
  const supplied = signature?.match(/^sha256=([a-f0-9]{64})$/i)?.[1];
  if (!supplied) throw new ApiError({ statusCode: 401, code: "WEBHOOK_SIGNATURE_INVALID", message: "A valid X-PMSETU-Signature header is required" });
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(supplied, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new ApiError({ statusCode: 401, code: "WEBHOOK_SIGNATURE_INVALID", message: "Webhook signature verification failed" });
  }
  return ingestEnabledSource(id, records);
}
