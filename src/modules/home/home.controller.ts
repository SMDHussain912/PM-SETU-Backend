import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/response";
import * as homeService from "./home.service";

/**
 * GET /api/v1/home/kpis — homepage KPI/counter data (public, no request
 * input — see home.schema.ts).
 *
 * Thin HTTP adapter only: calls the service and shapes the response with the
 * shared success envelope. No SQL and no business logic here. Express 5
 * forwards rejected async handlers to the central error middleware
 * (src/middleware/error.middleware.ts), so no try/catch is needed.
 */
export async function getHomeKpis(_req: Request, res: Response): Promise<Response> {
    const kpis = await homeService.getHomeKpis();
    return sendSuccess(res, kpis);
}
