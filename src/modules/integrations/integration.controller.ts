import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import * as service from "./integration.service";
import type { IntegrationSourceInput } from "./integration.schema";
function actor(req: Request) { const id = Number(req.user?.id); if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" }); return id; }
export async function list(req: Request, res: Response) { actor(req); const { query } = getValidated<unknown, { enabled?: string; system?: string }>(res); return sendSuccess(res, await service.list({ enabled: query.enabled === undefined ? undefined : query.enabled === "true", system: query.system })); }
export async function create(req: Request, res: Response) { actor(req); const { body } = getValidated<IntegrationSourceInput>(res); return sendCreated(res, await service.create(body)); }
export async function enable(req: Request, res: Response) { actor(req); const { params, body } = getValidated<{ enabled: boolean }, unknown, { id: number }>(res); return sendSuccess(res, await service.setEnabled(params.id, body.enabled)); }
export async function runs(req: Request, res: Response) { actor(req); const { params } = getValidated<unknown, unknown, { id: number }>(res); return sendSuccess(res, await service.runs(params.id)); }

export async function ingest(req: Request, res: Response) { actor(req); const { params, body } = getValidated<import("./integration.schema").IntegrationIngestInput, unknown, { id: number }>(res); return sendSuccess(res, await service.ingest(params.id, body.records)); }
