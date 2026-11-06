import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import * as service from "./integration.service";
import { integrationIngestSchema, type IntegrationSourceInput } from "./integration.schema";
function actor(req: Request) { const id = Number(req.user?.id); if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" }); return id; }
export async function list(req: Request, res: Response) { actor(req); const { query } = getValidated<unknown, { enabled?: string; system?: string }>(res); return sendSuccess(res, await service.list({ enabled: query.enabled === undefined ? undefined : query.enabled === "true", system: query.system })); }
export async function create(req: Request, res: Response) { actor(req); const { body } = getValidated<IntegrationSourceInput>(res); return sendCreated(res, await service.create(body)); }
export async function enable(req: Request, res: Response) { actor(req); const { params, body } = getValidated<{ enabled: boolean }, unknown, { id: number }>(res); return sendSuccess(res, await service.setEnabled(params.id, body.enabled)); }
export async function runs(req: Request, res: Response) { actor(req); const { params } = getValidated<unknown, unknown, { id: number }>(res); return sendSuccess(res, await service.runs(params.id)); }
export async function schedule(req: Request, res: Response) { actor(req); const { params, body } = getValidated<{ sync_interval_seconds: number | null }, unknown, { id: number }>(res); return sendSuccess(res, await service.setSchedule(params.id, body.sync_interval_seconds)); }

export async function ingest(req: Request, res: Response) { actor(req); const { params, body } = getValidated<import("./integration.schema").IntegrationIngestInput, unknown, { id: number }>(res); return sendSuccess(res, await service.ingest(params.id, body.records)); }


import { parseIntegrationCsv } from "./integration.csv";

export async function ingestCsv(req: Request, res: Response) {
  actor(req);
  const { params } = getValidated<unknown, unknown, { id: number }>(res);
  if (typeof req.body !== "string") throw new ApiError({ statusCode: 415, code: "CSV_CONTENT_TYPE_REQUIRED", message: "Send CSV with Content-Type: text/csv" });
  const records = parseIntegrationCsv(req.body);
  const parsed = integrationIngestSchema.safeParse({ records });
  if (!parsed.success) throw new ApiError({ statusCode: 422, code: "CSV_RECORDS_INVALID", message: "CSV records failed ingestion validation", details: parsed.error.flatten() });
  return sendSuccess(res, await service.ingestCsv(params.id, parsed.data.records));
}

export async function webhook(req: Request, res: Response) {
  const { params } = getValidated<unknown, unknown, { id: number }>(res);
  if (!req.rawBody) throw new ApiError({ statusCode: 400, code: "WEBHOOK_RAW_BODY_MISSING", message: "Raw webhook body is unavailable for signature verification" });
  return sendSuccess(res, await service.ingestWebhook(params.id, req.rawBody, req.get("X-PMSETU-Signature"), req.body));
}
