import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authLimiter } from "../../middleware/rateLimit.middleware";
import { validate } from "../../middleware/validate.middleware";
import * as authController from "./auth.controller";
import { changePasswordBodySchema, loginBodySchema } from "./auth.schema";

/**
 * Auth module — routes (RoadMap.md §18), mounted at /api/v1/auth.
 *
 * Implemented:
 *   POST /api/v1/auth/login              — public; authLimiter (stricter IP
 *                                          rate limit) + account lockout.
 *   GET  /api/v1/auth/me                 — requireAuth.
 *   POST /api/v1/auth/change-password    — requireAuth.
 *
 * Deferred (TO CONFIRM — no server infrastructure established):
 *   POST /api/v1/auth/logout             — stateless JWTs, no denylist yet.
 *   POST /api/v1/auth/refresh            — no refresh-token storage yet.
 *   POST /api/v1/auth/forgot-password    — needs §7 email/SMS integration.
 *   POST /api/v1/auth/reset-password     — needs the above.
 */

const authRouter = Router();

authRouter.post(
    "/login",
    authLimiter,
    validate({ body: loginBodySchema }),
    authController.login,
);

authRouter.get("/me", requireAuth, authController.getMe);

authRouter.post(
    "/change-password",
    requireAuth,
    validate({ body: changePasswordBodySchema }),
    authController.changePassword,
);

export default authRouter;
