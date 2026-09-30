import { ApiError } from "../../utils/response";
import { buildPaginationMeta } from "../../utils/pagination";
import * as approvalRepository from "./approval.repository";
import * as auditService from "../audit/audit.service";
import { APPROVAL_ACTION, APPROVAL_STATUS } from "./approval.types";
import type {
    Approval,
    ApprovalAction,
    ApprovalListFilters,
    ApprovalStatus,
    ApprovalTransitionResult,
} from "./approval.types";
import { nextApprovalStatus } from "./approval.types";
import type {
    ApprovalListQuery,
    ApprovalTransitionBody,
} from "./approval.schema";
import type { AuditAction, AuditEntity } from "../audit/audit.types";

/**
 * Approvals module — service layer (RoadMap.md §21 "APPROVAL APIs").
 *
 * Owns the business rules:
 *   - list/detail with INFERRED filters
 *   - transition validation: only allowed status transitions are permitted
 *     (see APPROVAL_TRANSITIONS in approval.types.ts)
 *   - optimistic concurrency guard in the repository (UPDATE ... WHERE status
 *     = :expectedStatus) so concurrent transitions can't both succeed
 *   - audit entry creation after each successful transition via
 *     auditService.recordAuditEntry()
 *
 * Auth/RBAC is enforced at the route layer. This service validates transition
 * semantics and writes audit records; it does not itself check roles.
 *
 * Audit-write-failure semantics: see audit.service.recordAuditEntry() TO CONFIRM
 * note. Here, if the audit write throws, the error propagates to the caller
 * (the HTTP layer). The transition is NOT committed independently of the audit
 * write today — the repository UPDATE runs first inside the service, then the
 * audit write runs. If the audit write fails, the transition has already been
 * persisted; the audit record is missing. This is the current behavior and is
 * NOT a finalized policy (TO CONFIRM with DBA/NIC). The seam is isolated so the
 * policy can be changed in one place later.
 *
 * No publish/archive/delete/generic-engine logic exists in this module. SIP owns
 * its own workflow (sips.status) — see sql/sips/sip_queries.sql.
 */

/** Map an ApprovalAction to the corresponding audit action code. INFERRED. */
function auditActionFor(approvalAction: ApprovalAction): AuditAction {
    switch (approvalAction) {
        case APPROVAL_ACTION.SUBMIT:
            return "SUBMIT";
        case APPROVAL_ACTION.REVIEW:
            return "REVIEW";
        case APPROVAL_ACTION.APPROVE:
            return "APPROVE";
        case APPROVAL_ACTION.REJECT:
            return "REJECT";
        case APPROVAL_ACTION.REQUEST_REVISION:
            return "REQUEST_REVISION";
        default:
            return "UPDATE";
    }
}

/**
 * Build the audit context from the request-level auth + metadata that the
 * controller passes in. This is a service-side extraction helper; it does not
 * touch credentials. Only audit-safe fields are captured.
 */
export interface CallerContext {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    path?: string;
}

/**
 * List approvals with INFERRED filters (RoadMap §21 documents no filters).
 */
export interface ApprovalListResult {
    items: Approval[];
    meta: ReturnType<typeof buildPaginationMeta>;
}

export async function listApprovals(
    query: Parameters<typeof approvalRepository.listApprovals>[0],
): Promise<ApprovalListResult> {
    const filters: ApprovalListFilters = {
        entity_type: query.entity_type,
        entity_id: query.entity_id,
        status: query.status,
        submitted_by: query.submitted_by,
        reviewed_by: query.reviewed_by,
        approved_by: query.approved_by,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
    };

    const [items, total] = await Promise.all([
        approvalRepository.listApprovals(filters),
        approvalRepository.countApprovals(filters),
    ]);

    return {
        items,
        meta: buildPaginationMeta(total, query.page, query.pageSize),
    };
}

export async function getApprovalById(id: number): Promise<Approval> {
    const approval = await approvalRepository.getApprovalById(id);
    if (!approval) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Approval record not found",
        });
    }
    return approval;
}

/**
 * Shared transition logic for the 5 documented approval actions.
 *
 * Steps:
 *   1. Load the approval record (404 if missing).
 *   2. Validate the transition is allowed from current status to next status.
 *   3. Persist the transition via the repository (optimistic status guard).
 *   4. Write an audit entry via auditService.recordAuditEntry().
 *
 * TO CONFIRM — audit-write failure semantics:
 *   - Today: the repository UPDATE runs first, then the audit write runs. If the
 *     audit write throws, the transition is already persisted and the error
 *     propagates to the HTTP layer. This is NOT a finalized policy; it exists
 *     only so the foundation can be wired up. The policy must be confirmed with
 *     DBA/NIC (fail-closed vs best-effort) and applied in one place later.
 *   - Failures are never silently swallowed.
 */
async function performTransition(
    id: number,
    action: ApprovalAction,
    currentStatusForGuard: ApprovalStatus,
    body:ApprovalTransitionBody,
    context: CallerContext,
): Promise<ApprovalTransitionResult> {
    const approval = await approvalRepository.getApprovalById(id);
    if (!approval) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Approval record not found",
        });
    }

    const newStatus = nextApprovalStatus(approval.status, action);
    if (newStatus === null) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_APPROVAL_TRANSITION",
            message: `Cannot perform ${action} on an approval in status ${approval.status}`,
        });
    }

    // Repository-level optimistic guard: only update if status matches the
    // current observed status. On zero updated rows, someone else moved it.
    const updated = await approvalRepository.updateApprovalStatus(
        id,
        currentStatusForGuard,
        newStatus,
        body.remarks,
        action,
        context.userId,
    );

    if (!updated) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_APPROVAL_TRANSITION",
            message: `Approval ${id} is no longer in status ${currentStatusForGuard} (concurrent modification)`,
        });
    }

    // Write the audit entry (TO CONFIRM failure semantics — see module note).
    await auditService.recordAuditEntry({
        userId: context.userId,
        action: auditActionFor(action),
        entity: "APPROVAL",
        entityId: id,
        oldValue: { status: approval.status },
        newValue: { status: newStatus },
        approvalStatus: newStatus,
        context: {
            userId: context.userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            path: context.path,
        },
    });

    const refreshed = await approvalRepository.getApprovalById(id);
    if (!refreshed) {
        throw new ApiError({
            statusCode: 500,
            code: "INTERNAL_ERROR",
            message: "Approval record disappeared after transition",
        });
    }

    return {
        approval: refreshed,
        action,
        previous_status: approval.status,
        new_status: newStatus,
    };
}

export async function submitApproval(
    id: number,
    body: ApprovalTransitionBody,
    context: CallerContext,
): Promise<ApprovalTransitionResult> {
    return performTransition(
        id,
        APPROVAL_ACTION.SUBMIT,
        APPROVAL_STATUS.PENDING,
        body,
        context,
    );
}

export async function reviewApproval(
    id: number,
    body: ApprovalTransitionBody,
    context: CallerContext,
): Promise<ApprovalTransitionResult> {
    return performTransition(
        id,
        APPROVAL_ACTION.REVIEW,
        APPROVAL_STATUS.SUBMITTED,
        body,
        context,
    );
}

export async function approveApproval(
    id: number,
    body: ApprovalTransitionBody,
    context: CallerContext,
): Promise<ApprovalTransitionResult> {
    return performTransition(
        id,
        APPROVAL_ACTION.APPROVE,
        APPROVAL_STATUS.UNDER_REVIEW,
        body,
        context,
    );
}

export async function rejectApproval(
    id: number,
    body: ApprovalTransitionBody,
  context: CallerContext,
): Promise<ApprovalTransitionResult> {
    return performTransition(
        id,
        APPROVAL_ACTION.REJECT,
        APPROVAL_STATUS.UNDER_REVIEW,
        body,
        context,
    );
}

export async function requestRevisionApproval(
    id: number,
    body: ApprovalTransitionBody,
    context: CallerContext,
): Promise<ApprovalTransitionResult> {
    return performTransition(
        id,
        APPROVAL_ACTION.REQUEST_REVISION,
        APPROVAL_STATUS.UNDER_REVIEW,
        body,
        context,
    );
}

