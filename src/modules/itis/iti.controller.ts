import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { ClusterIdParams, ItiIdParams, ItiListQuery } from "./iti.schema";
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
