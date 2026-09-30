import { rateLimit, type Options } from "express-rate-limit";
import { env } from "../config/env";
import { sendError } from "../utils/response";

const jsonHandler: Options["handler"] = (_req, res) => {
    sendError(res, 429, "Too many requests, please try again later", "RATE_LIMITED");
};

/** General limiter applied to the whole /api/v1 surface in app.ts. */
export const apiLimiter = rateLimit({
    windowMs: env.rateLimit.windowMinutes * 60_000,
    limit: env.rateLimit.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: jsonHandler,
});

/** Stricter limiter for sensitive endpoints (login, password reset, ...). */
export const authLimiter = rateLimit({
    windowMs: env.rateLimit.windowMinutes * 60_000,
    limit: env.rateLimit.authMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: jsonHandler,
});
