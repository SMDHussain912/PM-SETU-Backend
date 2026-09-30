import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { ClusterIdParams } from "./dashboard.schema";
import * as dashboardService from "./dashboard.service";

/**
 * Dashboard module — controller layer.
 *
 * Thin HTTP adapters: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function getStateDashboard(_req: Request, res: Response): Promise<Response> {
    const data = await dashboardService.getStateMetrics();
    return sendSuccess(res, data);
}

export async function getClustersDashboard(_req: Request, res: Response): Promise<Response> {
    const data = await dashboardService.getClustersDashboard();
    return sendSuccess(res, data);
}

export async function getClusterDashboard(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ClusterIdParams>(res);
    const data = await dashboardService.getClusterDashboard(params.id);
    return sendSuccess(res, data);
}

export async function getFinanceDashboard(_req: Request, res: Response): Promise<Response> {
    const data = await dashboardService.getFinanceMetrics();
    return sendSuccess(res, data);
}

export async function getTrainingDashboard(_req: Request, res: Response): Promise<Response> {
    const data = await dashboardService.getTrainingMetrics();
    return sendSuccess(res, data);
}

export async function getPlacementsDashboard(_req: Request, res: Response): Promise<Response> {
    const data = await dashboardService.getPlacementMetrics();
    return sendSuccess(res, data);
}
