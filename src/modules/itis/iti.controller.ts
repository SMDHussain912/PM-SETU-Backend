import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type { ClusterIdParams, CreateItiBody, ItiIdParams, ItiListQuery, UpdateItiBody } from "./iti.schema";
import * as itiService from "./iti.service";

/**
 * ITI module — HTTP layer (RoadMap.md §7).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/** GET /api/v1/itis — filterable, paginated ITI list. */
export async function listItis(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, ItiListQuery>(res);
    const { items, meta } = await itiService.listItis(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/itis/:id — single ITI (404 via service when absent). */
export async function getItiById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ItiIdParams>(res);
    const iti = await itiService.getItiById(params.id);
    return sendSuccess(res, iti);
}

/** GET /api/v1/clusters/:clusterId/itis — ITIs of one cluster. */
export async function listClusterItis(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const items = await itiService.listClusterItis(params.clusterId);
    return sendSuccess(res, items);
}


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

export async function createIti(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateItiBody>(res);
    const item = await itiService.createIti(body, getActorId(req), getAuditContext(req));
    return sendCreated(res, item);
}

export async function updateIti(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateItiBody, unknown, ItiIdParams>(res);
    const item = await itiService.updateIti(params.id, body, getActorId(req), getAuditContext(req));
    return sendSuccess(res, item);
}

export async function deleteIti(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ItiIdParams>(res);
    await itiService.deleteIti(params.id, getActorId(req), getAuditContext(req));
    return sendSuccess(res, { id: params.id });
}
