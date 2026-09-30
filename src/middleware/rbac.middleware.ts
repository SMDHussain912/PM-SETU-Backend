import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/response";

/**
 * Generic RBAC infrastructure — attach after requireAuth.
 * Concrete role/permission names are defined by the roles/users modules
 * later; nothing PM SETU-specific lives here.
 */
export function requireRoles(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(
                new ApiError({
                    message: "Authentication required",
                    statusCode: 401,
                    code: "UNAUTHENTICATED",
                }),
            );
            return;
        }
        const userRoles = req.user.roles ?? [];
        const allowed = roles.some((role) => userRoles.includes(role));
        if (!allowed) {
            next(
                new ApiError({
                    message: "Insufficient role",
                    statusCode: 403,
                    code: "FORBIDDEN",
                }),
            );
            return;
        }
        next();
    };
}

export function requirePermissions(...permissions: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(
                new ApiError({
                    message: "Authentication required",
                    statusCode: 401,
                    code: "UNAUTHENTICATED",
                }),
            );
            return;
        }
        const userPermissions = req.user.permissions ?? [];
        const allowed = permissions.every((permission) =>
            userPermissions.includes(permission),
        );
        if (!allowed) {
            next(
                new ApiError({
                    message: "Insufficient permissions",
                    statusCode: 403,
                    code: "FORBIDDEN",
                }),
            );
            return;
        }
        next();
    };
}
