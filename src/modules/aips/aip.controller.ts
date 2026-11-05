import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type { AipIdParams, AipListQuery, CreateAipBody, UpdateAipBody } from "./aip.schema";
import * as aipService from "./aip.service";

/**
 * AIP module — HTTP layer (RoadMap.md §8).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/** GET /api/v1/aips — filterable, paginated AIP list. */
export async function listAips(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, AipListQuery>(res);
    const { items, meta } = await aipService.listAips(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/aips/:id — single AIP (404 via service when absent). */
export async function getAipById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, AipIdParams>(res);
    const aip = await aipService.getAipById(params.id);
    return sendSuccess(res, aip);
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

/** POST /api/v1/admin/aips */
export async function createAip(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateAipBody>(res);
    const item = await aipService.createAip(body, getActorId(req), getAuditContext(req));
    return sendCreated(res, item);
}

/** PATCH /api/v1/admin/aips/:id */
export async function updateAip(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateAipBody, unknown, AipIdParams>(res);
    const item = await aipService.updateAip(params.id, body, getActorId(req), getAuditContext(req));
    return sendSuccess(res, item);
}

/** DELETE /api/v1/admin/aips/:id */
export async function deleteAip(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, AipIdParams>(res);
    await aipService.deleteAip(params.id, getActorId(req), getAuditContext(req));
    return sendSuccess(res, { id: params.id });
}
