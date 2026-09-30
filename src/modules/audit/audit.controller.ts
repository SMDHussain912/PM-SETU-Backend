import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { AuditLogIdParams, AuditLogListQuery } from "./audit.schema";
import * as auditService from "./audit.service";

/**
 * Audit module — HTTP layer (RoadMap.md §22 "AUDIT APIs").
 *
 * Thin HTTP adapters: read validated input, delegate to the service, return the
 * standard envelope. No SQL, no business logic. Express 5 forwards rejected
 * async handlers to the central error middleware.
 *
 * The audit log is APPEND-ONLY. There is no public POST/PATCH/DELETE audit
 * endpoint — audit entries are created internally by trusted services (approval
 * transitions and future CMS CRUD) via audit.service.recordAuditEntry().
 *
 * Auth: every route is behind requireAuth (enforced in audit.routes.ts).
 * Role guard: AUDIT_READ_ROLES (INFERRED / TO CONFIRM) — see audit.routes.ts.
 */
export async function listAuditLogs(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, AuditLogListQuery>(res);
    const result = await auditService.listAuditLogs(query);
    return sendSuccess(res, result.items, result.meta);
}

export async function getAuditLogById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, AuditLogIdParams>(res);
    const entry = await auditService.getAuditLogById(params.id);
    return sendSuccess(res, entry);
}

