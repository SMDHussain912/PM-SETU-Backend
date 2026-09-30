import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendSuccess } from "../../utils/response";
import type { ChangePasswordInput, LoginInput } from "./auth.schema";
import * as authService from "./auth.service";

/**
 * Auth module — controller layer (RoadMap.md §18).
 *
 * Thin HTTP adapters: read validated request data, delegate to the service,
 * shape the response with the shared success envelope. No SQL, no business
 * logic. Express 5 forwards rejected async handlers to the central error
 * middleware, so no try/catch is needed.
 *
 * Implemented endpoints: login, me, change-password. logout / refresh /
 * forgot-password / reset-password are deferred (TO CONFIRM).
 */

/** POST /api/v1/auth/login — public, IP-rate-limited (authLimiter). */
export async function login(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<LoginInput>(res);
    const result = await authService.login(body);
    return sendSuccess(res, result);
}

/** GET /api/v1/auth/me — protected by requireAuth (req.user guaranteed). */
export async function getMe(req: Request, res: Response): Promise<Response> {
    const userId = authService.requireUserId(req.user?.id);
    const profile = await authService.getMe(userId);
    return sendSuccess(res, profile);
}

/** POST /api/v1/auth/change-password — protected by requireAuth. */
export async function changePassword(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<ChangePasswordInput>(res);
    const userId = authService.requireUserId(req.user?.id);
    const result = await authService.changePassword(userId, body);
    return sendSuccess(res, result);
}

export { ApiError };
