import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { AipIdParams, AipListQuery } from "./aip.schema";
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
