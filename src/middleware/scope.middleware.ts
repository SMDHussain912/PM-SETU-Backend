import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../config/database";
import { ROLE_CODES } from "../modules/roles/role.constants";
import { ApiError } from "../utils/response";

export type ScopedResource = "CLUSTER" | "ITI" | "AIP" | "SPV" | "SIP";

/**
 * Resource-level guard for organisation-scoped operational endpoints.
 * Mount after requireAuth. Global administrators bypass resource assignments;
 * all other users need a direct assignment or an assignment to the parent cluster.
 */
export function requireResourceScope(resource: ScopedResource, paramName = "id") {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        const userId = Number(req.user?.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            next(new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" }));
            return;
        }
        const roles = req.user?.roles ?? [];
        if (roles.includes(ROLE_CODES.SUPER_ADMIN) || roles.includes(ROLE_CODES.STATE_PMU_ADMIN)) {
            next();
            return;
        }
        const resourceId = Number(req.params[paramName]);
        if (!Number.isSafeInteger(resourceId) || resourceId <= 0) {
            next(new ApiError({ statusCode: 400, code: "INVALID_RESOURCE_ID", message: "A valid resource ID is required" }));
            return;
        }
        try {
            let rows: { allowed: boolean }[] = [];
            if (resource === "CLUSTER") {
                rows = await prisma.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS (
                    SELECT 1 FROM user_scope_assignments
                    WHERE user_id = ${userId} AND scope_type = 'CLUSTER' AND scope_id = ${resourceId}
                ) AS allowed`);
            } else if (resource === "ITI") {
                rows = await prisma.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS (
                    SELECT 1 FROM itis r WHERE r.id = ${resourceId} AND (
                        EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'ITI' AND s.scope_id = r.id)
                        OR EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'CLUSTER' AND s.scope_id = r.cluster_id)
                    )
                ) AS allowed`);
            } else if (resource === "AIP") {
                rows = await prisma.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS (
                    SELECT 1 FROM aips r WHERE r.id = ${resourceId} AND (
                        EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'AIP' AND s.scope_id = r.id)
                        OR EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'CLUSTER' AND s.scope_id = r.cluster_id)
                    )
                ) AS allowed`);
            } else if (resource === "SPV") {
                rows = await prisma.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS (
                    SELECT 1 FROM spvs r WHERE r.id = ${resourceId} AND (
                        EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'SPV' AND s.scope_id = r.id)
                        OR EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'CLUSTER' AND s.scope_id = r.cluster_id)
                    )
                ) AS allowed`);
            } else {
                rows = await prisma.$queryRaw<{ allowed: boolean }[]>(Prisma.sql`SELECT EXISTS (
                    SELECT 1 FROM sips r WHERE r.id = ${resourceId} AND (
                        EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'CLUSTER' AND s.scope_id = r.cluster_id)
                        OR EXISTS (SELECT 1 FROM user_scope_assignments s WHERE s.user_id = ${userId} AND s.scope_type = 'AIP' AND s.scope_id = r.aip_id)
                    )
                ) AS allowed`);
            }
            if (rows[0]?.allowed !== true) {
                next(new ApiError({ statusCode: 403, code: "RESOURCE_SCOPE_FORBIDDEN", message: "Your account is not assigned to this organisation record" }));
                return;
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}
