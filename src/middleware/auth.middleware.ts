import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/response";
import type { AuthUser } from "../types/express";

export function extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return null;
    }
    const token = header.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
}

function verifyAccessToken(token: string): AuthUser {
    // The signing secret is required here (at use time), not at boot, so the
    // server can start before auth credentials are configured.
    if (!env.jwtAccessSecret) {
        throw new ApiError({
            message: "JWT_ACCESS_SECRET is not configured",
            statusCode: 500,
            code: "AUTH_NOT_CONFIGURED",
        });
    }

    let payload: string | jwt.JwtPayload;
    try {
        // Pin the algorithm — reject tokens signed with anything but HS256.
        payload = jwt.verify(token, env.jwtAccessSecret, {
            algorithms: ["HS256"],
        });
    } catch {
        throw new ApiError({
            message: "Invalid or expired token",
            statusCode: 401,
            code: "INVALID_TOKEN",
        });
    }

    if (typeof payload === "string") {
        throw new ApiError({
            message: "Invalid authentication token",
            statusCode: 401,
            code: "INVALID_TOKEN",
        });
    }

    const subject = payload.sub;
    if (typeof subject !== "string" || subject.length === 0) {
        throw new ApiError({
            message: "Invalid authentication token",
            statusCode: 401,
            code: "INVALID_TOKEN",
        });
    }

    const { role, roles, permissions } = payload as jwt.JwtPayload & {
        role?: unknown;
        roles?: unknown;
        permissions?: unknown;
    };

    return {
        id: subject,
        roles: Array.isArray(roles)
            ? roles.map(String)
            : typeof role === "string"
              ? [role]
              : undefined,
        permissions: Array.isArray(permissions)
            ? permissions.map(String)
            : undefined,
    };
}

/**
 * Requires a valid Bearer token and attaches the decoded claims to req.user.
 * Generic infrastructure only — no PM SETU-specific authorization rules.
 */
export function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const token = extractBearerToken(req);
    if (!token) {
        next(
            new ApiError({
                message: "Authentication required",
                statusCode: 401,
                code: "UNAUTHENTICATED",
            }),
        );
        return;
    }
    try {
        req.user = verifyAccessToken(token);
    } catch (error) {
        next(error);
        return;
    }
    next();
}

/** Attaches req.user when a valid Bearer token is present; never rejects. */
export function optionalAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    const token = extractBearerToken(req);
    if (token) {
        try {
            req.user = verifyAccessToken(token);
        } catch {
            // Stay anonymous — each route decides whether that is acceptable.
        }
    }
    next();
}
