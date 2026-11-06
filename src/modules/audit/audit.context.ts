import type { Request } from "express";
import type { AuditContext } from "./audit.types";

export function getAuditContext(req: Request): AuditContext {
    return {
        userId: req.user?.id,
        ipAddress: req.ip || undefined,
        userAgent: req.get("user-agent") ?? undefined,
        path: req.originalUrl,
    };
}
