import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type {
    ApprovalIdParams,
    ApprovalListQuery,
    ApprovalTransitionBody,
} from "./approval.schema";
import * as approvalService from "./approval.service";

/**
 * Approvals module — HTTP layer (RoadMap.md §21 "APPROVAL APIs").
 *
 * Thin HTTP adapters: read validated input, delegate to the service, return the
 * standard envelope. No SQL, no business logic. Express 5 forwards rejected
 * async handlers to the central error middleware.
 *
 * Endpoints (RoadMap §21):
 *   GET  /admin/approvals                  — list + INFERRED filters
 *   GET  /admin/approvals/:id              — detail
 *   POST /admin/approvals/:id/submit       — submit
 *   POST /admin/approvals/:id/review       — review
 *   POST /admin/approvals/:id/approve      — approve
 *   POST /admin/approvals/:id/reject       — reject
 *   POST /admin/approvals/:id/request-revision — request-revision
 *
 * Auth + RBAC are enforced in approval.routes.ts (requireAuth +
 * requireRoles(...APPROVAL_READ_ROLES / APPROVAL_WRITE_ROLES)). No publish/archive/
 * delete/generic-engine endpoints exist in this module.
 */
export async function listApprovals(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, ApprovalListQuery>(res);
    const result = await approvalService.listApprovals(query);
    return sendSuccess(res, result.items, result.meta);
}

export async function getApprovalById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, ApprovalIdParams>(res);
    const approval = await approvalService.getApprovalById(params.id);
    return sendSuccess(res, approval);
}

export async function submitApproval(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<
        ApprovalTransitionBody,
        unknown,
        ApprovalIdParams
    >(res);
    const context = buildCallerContext(req);
    const result = await approvalService.submitApproval(params.id, body, context);
    return sendSuccess(res, result.approval);
}

export async function reviewApproval(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<
        ApprovalTransitionBody,
        unknown,
        ApprovalIdParams
    >(res);
    const context = buildCallerContext(req);
    const result = await approvalService.reviewApproval(params.id, body, context);
    return sendSuccess(res, result.approval);
}

export async function approveApproval(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<
        ApprovalTransitionBody,
        unknown,
        ApprovalIdParams
    >(res);
    const context = buildCallerContext(req);
    const result = await approvalService.approveApproval(params.id, body, context);
    return sendSuccess(res, result.approval);
}

export async function rejectApproval(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<
        ApprovalTransitionBody,
        unknown,
        ApprovalIdParams
    >(res);
    const context = buildCallerContext(req);
    const result = await approvalService.rejectApproval(params.id, body, context);
    return sendSuccess(res, result.approval);
}

export async function requestRevisionApproval(
    req: Request,
    res: Response,
): Promise<Response> {
    const { params, body } = getValidated<
        ApprovalTransitionBody,
        unknown,
        ApprovalIdParams
    >(res);
    const context = buildCallerContext(req);
    const result = await approvalService.requestRevisionApproval(
        params.id,
        body,
        context,
    );
    return sendSuccess(res, result.approval);
}

/**
 * Build the service-side caller context from the Express request.
 * Extracts only audit-safe fields: the authenticated user id, IP, user-agent
 * and path. Does not touch credentials/tokens.
 */
function buildCallerContext(req: Request): Parameters<typeof approvalService.submitApproval>[2] {
    return {
        userId: req.user?.id ?? "",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        path: req.originalUrl,
    };
}

