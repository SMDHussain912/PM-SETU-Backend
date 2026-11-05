import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import * as service from "./academic.service";
import type { AcademicListQuery, AcademicRecordInput } from "./academic.schema";

function actor(req: Request) { const id = Number(req.user?.id); if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" }); return id; }
function context(req: Request) { return { ipAddress: req.ip, userAgent: req.get("user-agent") ?? undefined, path: req.originalUrl }; }
export async function create(req: Request, res: Response): Promise<Response> { const { body } = getValidated<AcademicRecordInput>(res); return sendCreated(res, await service.create(body, actor(req), context(req))); }
export async function list(req: Request, res: Response): Promise<Response> { const { query } = getValidated<unknown, AcademicListQuery>(res); const result = await service.list(query, actor(req), req.user?.roles ?? []); return sendSuccess(res, result.items, result.meta); }
export async function get(req: Request, res: Response): Promise<Response> { const { params } = getValidated<unknown, unknown, { id: number }>(res); return sendSuccess(res, await service.get(params.id, actor(req), req.user?.roles ?? [])); }
export async function summary(req: Request, res: Response): Promise<Response> { return sendSuccess(res, await service.summary(actor(req), req.user?.roles ?? [])); }
export async function review(req: Request, res: Response): Promise<Response> { const { params, body } = getValidated<{ review_status: "ACCEPTED" | "REJECTED"; review_note?: string | null }, unknown, { id: number }>(res); return sendSuccess(res, await service.review(params.id, body.review_status, body.review_note ?? null, actor(req), req.user?.roles ?? [], context(req))); }
export async function importBatch(req: Request, res: Response): Promise<Response> { const { body } = getValidated<{ records: unknown[] }>(res); return sendSuccess(res, await service.importBatch(body.records, actor(req), context(req))); }
