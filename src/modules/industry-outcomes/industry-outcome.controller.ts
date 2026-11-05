import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type { CreateOutcomeBody, OutcomeIdParams, OutcomeListQuery, ReviewOutcomeBody } from "./industry-outcome.schema";
import * as service from "./industry-outcome.service";

function actor(req: Request): number {
    const id = Number(req.user?.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    return id;
}
function context(req: Request) {
    return { ipAddress: req.ip, userAgent: req.get("user-agent") ?? undefined, path: req.originalUrl };
}
export async function summary(_req: Request, res: Response): Promise<Response> {\n    return sendSuccess(res, await service.getOutcomeSummary());\n}\nexport async function list(req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, OutcomeListQuery>(res);
    const result = await service.listOutcomes(query);
    return sendSuccess(res, result.items, result.meta);
}
export async function get(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, OutcomeIdParams>(res);
    return sendSuccess(res, await service.getOutcome(params.id));
}
export async function create(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateOutcomeBody>(res);
    return sendCreated(res, await service.createOutcome(body, actor(req), context(req)));
}
export async function review(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<ReviewOutcomeBody, unknown, OutcomeIdParams>(res);
    return sendSuccess(res, await service.reviewOutcome(params.id, body, actor(req), context(req)));
}
