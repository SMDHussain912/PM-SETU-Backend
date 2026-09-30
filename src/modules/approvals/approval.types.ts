/**
 * Approvals module types (RoadMap.md §21 "APPROVAL APIs").
 *
 * CONFIRMED from RoadMap §21:
 *   - Approval endpoints: list, detail, and the 5 action endpoints
 *     submit / review / approve / reject / request-revision.
 *   - Content workflow narrative: Content Creator -> Department Reviewer ->
 *     Approving Officer -> Publish -> Archive/Version.
 *   - Transactions need user, time, old value, new value, approval status and
 *     audit metadata.
 *
 * NOT in scope (deferred / not added):
 *   - No CREATE approval endpoint — the owning module creates the approval
 *     record at submit time (TO CONFIRM with DBA/NIC who owns creation).
 *   - No publish endpoint, archive endpoint, delete-approval endpoint.
 *   - No generic configurable workflow engine.
 *   - No speculative versioning system.
 *
 * INFERRED / TO CONFIRM:
 *   - Approval status vocabulary below is a proposal for the approval lifecycle.
 *     It is separate from sips.status (SIP owns its own workflow; see
 *     sql/sips/sip_queries.sql). Must be confirmed with DBA.
 *   - Entity types below (DOCUMENT, NEWS, GALLERY, SIP, BANNER) are proposals
 *     so the approval module can reference other modules' entities. TO CONFIRM
 *     enum vs free text and the full list with DBA/NIC.
 *   - Whether stage/assignee/timestamp columns exist (see
 *     sql/approvals/approval_queries.sql for the proposed schema). Not required
 *     to ship the 5 transitions.
 */

/** INFERRED approval status vocabulary — TO CONFIRM with DBA.
 * This is the approval-layer lifecycle, separate from sips.status.
 * PUBLISHED/ARCHIVED intentionally NOT included (future entity lifecycle states). */
export const APPROVAL_STATUS = {
    PENDING: "PENDING",
    SUBMITTED: "SUBMITTED",
    UNDER_REVIEW: "UNDER_REVIEW",
    REVISION_REQUESTED: "REVISION_REQUESTED",
    RECOMMENDED: "RECOMMENDED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
} as const;

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

/** The 5 documented approval actions (RoadMap §21). */
export const APPROVAL_ACTION = {
    SUBMIT: "SUBMIT",
    REVIEW: "REVIEW",
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    REQUEST_REVISION: "REQUEST_REVISION",
} as const;

export type ApprovalAction = (typeof APPROVAL_ACTION)[keyof typeof APPROVAL_ACTION];

/** INFERRED entity types the approval module may reference — TO CONFIRM. */
export const APPROVAL_ENTITY_TYPE = {
    DOCUMENT: "DOCUMENT",
    NEWS: "NEWS",
    GALLERY: "GALLERY",
    SIP: "SIP",
    BANNER: "BANNER",
} as const;

export type ApprovalEntityType = (typeof APPROVAL_ENTITY_TYPE)[keyof typeof APPROVAL_ENTITY_TYPE];

/** Allowed transition map (INFERRED — TO CONFIRM with spec/DBA).
 * For each current status, which actions are allowed and the resulting status.
 * This is the reusable core of the approval state machine for the 5 documented
 * actions only. Partial maps are intentional — every other action is disallowed. */
export const APPROVAL_TRANSITIONS: Readonly<
    Record<ApprovalStatus, Readonly<Partial<Record<ApprovalAction, ApprovalStatus>>>>
> = {
    [APPROVAL_STATUS.PENDING]: {
        [APPROVAL_ACTION.SUBMIT]: APPROVAL_STATUS.SUBMITTED,
    },
    [APPROVAL_STATUS.SUBMITTED]: {
        [APPROVAL_ACTION.REVIEW]: APPROVAL_STATUS.UNDER_REVIEW,
    },
    [APPROVAL_STATUS.UNDER_REVIEW]: {
        [APPROVAL_ACTION.APPROVE]: APPROVAL_STATUS.APPROVED,
        [APPROVAL_ACTION.REJECT]: APPROVAL_STATUS.REJECTED,
        [APPROVAL_ACTION.REQUEST_REVISION]: APPROVAL_STATUS.REVISION_REQUESTED,
    },
    [APPROVAL_STATUS.REVISION_REQUESTED]: {
        [APPROVAL_ACTION.SUBMIT]: APPROVAL_STATUS.SUBMITTED,
    },
    [APPROVAL_STATUS.RECOMMENDED]: {
        [APPROVAL_ACTION.APPROVE]: APPROVAL_STATUS.APPROVED,
        [APPROVAL_ACTION.REJECT]: APPROVAL_STATUS.REJECTED,
    },
    [APPROVAL_STATUS.APPROVED]: {},
    [APPROVAL_STATUS.REJECTED]: {},
};

/** Returns the next status for an action given the current status, or null. */
export function nextApprovalStatus(
    current: ApprovalStatus,
    action: ApprovalAction,
): ApprovalStatus | null {
    return APPROVAL_TRANSITIONS[current]?.[action] ?? null;
}

/** Actor info resolved for an approval record (ids + optional readable names). */
export interface ApprovalActor {
    id: string | null;
    name: string | null;
}

/** Embedded entity reference returned with every approval record. */
export interface ApprovalEntityRef {
    type: ApprovalEntityType;
    id: number;
}

/** Public approval record shape. */
export interface Approval {
    id: number;
    entity_type: ApprovalEntityType;
    entity_id: number;
    status: ApprovalStatus;
    /** INFERRED — TO CONFIRM whether this column exists. */
    stage: string | null;
    /** INFERRED — TO CONFIRM whether this column exists. */
    assigned_to: string | null;
    submitted_by: ApprovalActor;
    reviewed_by: ApprovalActor | null;
    approved_by: ApprovalActor | null;
    /** INFERRED — TO CONFIRM. Populated on submit. */
    submitted_at: string | null;
    /** INFERRED — TO CONFIRM. Populated on review. */
    reviewed_at: string | null;
    /** INFERRED — TO CONFIRM. Populated on approve/reject/request-revision. */
    decision_at: string | null;
    remarks: string | null;
    created_at: string;
    updated_at: string;
}

/** Filters for the list endpoint. Pagination is confirmed; the rest are INFERRED value-add. */
export interface ApprovalListFilters {
    entity_type?: ApprovalEntityType;
    entity_id?: number;
    status?: ApprovalStatus;
    submitted_by?: string;
    reviewed_by?: string;
    approved_by?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
}

/** Shaped result returned by a successful transition. */
export interface ApprovalTransitionResult {
    approval: Approval;
    action: ApprovalAction;
    previous_status: ApprovalStatus;
    new_status: ApprovalStatus;
}

 