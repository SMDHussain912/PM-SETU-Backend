import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    ClusterIdParams,
    CreateSipInput,
    SipIdParams,
    SipListQuery,
    UpdateSipInput,
} from "./sip.schema";
import * as sipService from "./sip.service";

/** Extract the authenticated actor used by the transactional audit record. */
function getActorId(req: Request): number {
    const id = Number(req.user?.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" });
    }
    return id;
}

function getAuditContext(req: Request) {
    return {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        path: req.originalUrl,
    };
}

export async function listSips(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, SipListQuery>(res);
    const { items, meta } = await sipService.listSips(query);
    return sendSuccess(res, items, meta);
}

export async function getSipById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SipIdParams>(res);
    return sendSuccess(res, await sipService.getSipById(params.id));
}

export async function listClusterSips(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    return sendSuccess(res, await sipService.listClusterSips(params.clusterId));
}

export async function createSip(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateSipInput>(res);
    const item = await sipService.createSip(body, getActorId(req), getAuditContext(req));
    return sendCreated(res, item);
}

export async function updateSip(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateSipInput, unknown, SipIdParams>(res);
    const item = await sipService.updateSip(params.id, body, getActorId(req), getAuditContext(req));
    return sendSuccess(res, item);
}

export async function deleteSip(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SipIdParams>(res);
    await sipService.deleteSip(params.id, getActorId(req), getAuditContext(req));
    return sendSuccess(res, { id: params.id });
}
