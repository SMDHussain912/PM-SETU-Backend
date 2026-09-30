import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { ClusterIdParams, SipIdParams, SipListQuery } from "./sip.schema";
import * as sipService from "./sip.service";

/**
 * SIP module — HTTP layer (RoadMap.md §10).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/** GET /api/v1/sips — paginated SIP list (no spec'd filters). */
export async function listSips(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, SipListQuery>(res);
    const { items, meta } = await sipService.listSips(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/sips/:id — single SIP (404 via service when absent). */
export async function getSipById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, SipIdParams>(res);
    const sip = await sipService.getSipById(params.id);
    return sendSuccess(res, sip);
}

/** GET /api/v1/clusters/:clusterId/sip — SIPs of one cluster. */
export async function listClusterSips(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const items = await sipService.listClusterSips(params.clusterId);
    return sendSuccess(res, items);
}
