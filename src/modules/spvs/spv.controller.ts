import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { ClusterIdParams, SpvIdParams, SpvListQuery } from "./spv.schema";
import * as spvService from "./spv.service";

/**
 * SPV module — HTTP layer (RoadMap.md §9).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/** GET /api/v1/spvs — paginated SPV list (no spec'd filters). */
export async function listSpvs(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, SpvListQuery>(res);
    const { items, meta } = await spvService.listSpvs(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/spvs/:id — single SPV (404 via service when absent). */
export async function getSpvById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SpvIdParams>(res);
    const spv = await spvService.getSpvById(params.id);
    return sendSuccess(res, spv);
}

/** GET /api/v1/clusters/:clusterId/spv — SPVs of one cluster. */
export async function listClusterSpvs(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const items = await spvService.listClusterSpvs(params.clusterId);
    return sendSuccess(res, items);
}
