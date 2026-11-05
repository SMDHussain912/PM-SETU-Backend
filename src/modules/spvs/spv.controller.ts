import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type { ClusterIdParams, SpvIdParams, SpvListQuery, CreateSpvBody, UpdateSpvBody } from "./spv.schema";
import * as spvService from "./spv.service";

function getActorId(req: Request): number {
    const id = Number(req.user?.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    return id;
}
function getAuditContext(req: Request) {
    return { ipAddress: req.ip, userAgent: req.get("user-agent") ?? undefined, path: req.originalUrl };
}
export async function listSpvs(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, SpvListQuery>(res);
    const { items, meta } = await spvService.listSpvs(query);
    return sendSuccess(res, items, meta);
}
export async function getSpvById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SpvIdParams>(res);
    return sendSuccess(res, await spvService.getSpvById(params.id));
}
export async function listClusterSpvs(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    return sendSuccess(res, await spvService.listClusterSpvs(params.clusterId));
}
export async function createSpv(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateSpvBody>(res);
    return sendCreated(res, await spvService.createSpv(body, getActorId(req), getAuditContext(req)));
}
export async function updateSpv(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateSpvBody, unknown, SpvIdParams>(res);
    return sendSuccess(res, await spvService.updateSpv(params.id, body, getActorId(req), getAuditContext(req)));
}
export async function deleteSpv(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SpvIdParams>(res);
    await spvService.deleteSpv(params.id, getActorId(req), getAuditContext(req));
    return sendSuccess(res, { id: params.id });
}
