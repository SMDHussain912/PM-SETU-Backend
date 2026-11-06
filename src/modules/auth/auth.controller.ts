import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { ApiError, sendSuccess } from "../../utils/response";
import type { ChangePasswordInput, LoginInput } from "./auth.schema";
import * as authService from "./auth.service";
import * as userRepository from "../users/user.repository";
import { getAuditContext } from "../audit/audit.context";

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
export async function login(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<LoginInput>(res);
    const result = await authService.login(body, getAuditContext(req));
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
    const result = await authService.changePassword(userId, body, getAuditContext(req));
    return sendSuccess(res, result);
}

export { ApiError };


/** GET /auth/me/scopes — organisation scopes for the current authenticated account. */
export async function getMyScopes(req: Request, res: Response): Promise<Response> {
    const userId = Number(req.user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return sendSuccess(res, []);
    }
    const scopes = await userRepository.listUserScopes(userId);
    return sendSuccess(res, scopes);
}
