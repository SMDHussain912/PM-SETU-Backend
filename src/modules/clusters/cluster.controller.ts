import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { ClusterIdParams, ClusterListQuery } from "./cluster.schema";
import * as clusterService from "./cluster.service";

/**
 * Cluster module — HTTP layer (RoadMap.md §6).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/** GET /api/v1/clusters — filterable, paginated cluster list. */
export async function listClusters(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, ClusterListQuery>(res);
    const { items, meta } = await clusterService.listClusters(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/clusters/:id — single cluster (404 via service when absent). */
export async function getClusterById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const cluster = await clusterService.getClusterById(params.id);
    return sendSuccess(res, cluster);
}
