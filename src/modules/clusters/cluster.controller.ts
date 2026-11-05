import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendCreated, sendSuccess } from "../../utils/response";
import type {
    ClusterIdParams,
    ClusterListQuery,
    CreateClusterBody,
    UpdateClusterBody,
} from "./cluster.schema";
import * as clusterService from "./cluster.service";

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

export async function listClusters(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, ClusterListQuery>(res);
    const { items, meta } = await clusterService.listClusters(query);
    return sendSuccess(res, items, meta);
}

export async function getClusterById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const cluster = await clusterService.getClusterById(params.id);
    return sendSuccess(res, cluster);
}

export async function createCluster(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateClusterBody>(res);
    const cluster = await clusterService.createCluster(body, getActorId(req), getAuditContext(req));
    return sendCreated(res, cluster);
}

export async function updateCluster(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UpdateClusterBody, unknown, ClusterIdParams>(res);
    const cluster = await clusterService.updateCluster(params.id, body, getActorId(req), getAuditContext(req));
    return sendSuccess(res, cluster);
}

export async function deleteCluster(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    await clusterService.deleteCluster(params.id, getActorId(req), getAuditContext(req));
    return sendSuccess(res, { id: params.id });
}
