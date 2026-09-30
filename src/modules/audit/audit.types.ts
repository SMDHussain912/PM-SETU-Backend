/**
 * Audit module types (RoadMap.md §22 "AUDIT APIs").
 *
 * Field set based on the §22 example record:
 *   user_id, action, entity, entity_id, old_value, new_value, timestamp,
 *   approval_status.
 *
 * The vocabulary below (AuditAction, AuditEntity) and the full column set are
 * INFERRED / TO CONFIRM with DBA/NIC. `user_id` is stored as a string here
 * because req.user.id is a string (JWT `sub`); the §22 example shows a numeric
 * user_id, so the final column type must be confirmed with the DBA (see
 * sql/audit/audit_queries.sql).
 *
 * APPEND-ONLY: audit entries are created only internally by trusted services.
 * There is no public POST/PATCH/DELETE audit endpoint.
 *
 * SECURITY: callers must never include passwords, password hashes, JWTs/tokens,
 * or other credentials in old_value/new_value. The audit contract documents this
 * rule; nothing in the backend auto-strips credentials, so the onus is on the
 * calling service to supply audit-safe payloads.
 */

/** INFERRED action vocabulary — TO CONFIRM enum vs free text with DBA/NIC. */
export const AUDIT_ACTION = {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    SUBMIT: "SUBMIT",
    REVIEW: "REVIEW",
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    REQUEST_REVISION: "REQUEST_REVISION",
    LOGIN: "LOGIN",
    PASSWORD_CHANGE: "PASSWORD_CHANGE",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

/** INFERRED entity vocabulary — TO CONFIRM enum vs free text with DBA/NIC.
 * Add module-specific values (DOCUMENT, NEWS, GALLERY, SIP, BANNER, etc.) as
 * those modules are built and begin writing audit entries. */
export const AUDIT_ENTITY = {
    APPROVAL: "APPROVAL",
    USER: "USER",
    ROLE: "ROLE",
    PERMISSION: "PERMISSION",
} as const;

export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

/**
 * Audit context extracted from the Express request by the calling service.
 * This is a pure extraction helper, NOT middleware — it never touches auth
 * credentials. Only audit-safe fields are captured.
 */
export interface AuditContext {
    userId: string | undefined;
    ipAddress: string | undefined;
    userAgent: string | undefined;
    path: string | undefined;
}

/**
 * Input shape for the internal audit-create hook.
 * Fields map to the §22 example record shape.
 *
 * TO CONFIRM with DBA/NIC:
 *   - exact column names and types
 *   - JSONB vs text storage for old_value/new_value
 *   - whether ip_address/user_agent/path are stored
 *   - user_id type (string vs numeric) — must align with users.id and the JWT
 *     `sub` claim
 */
export interface CreateAuditEntryInput {
    userId: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId: number;
    /** Previous state (nullable for creates). Must be audit-safe. */
    oldValue: unknown;
    /** New state (nullable for deletes). Must be audit-safe. */
    newValue: unknown;
    /** Approval status where relevant (PENDING/APPROVED/REJECTED etc.); nullable otherwise. */
    approvalStatus: string | null;
    /** Extracted from req via audit context helper — not user-supplied. */
    context: AuditContext;
}

export interface AuditEntry {
    id: number;
    user_id: string;
    action: string;
    entity: string;
    entity_id: number;
    old_value: unknown;
    new_value: unknown;
    approval_status: string | null;
    ip_address: string | null;
    user_agent: string | null;
    path: string | null;
    timestamp: string;
}

export interface AuditListFilters {
    entity?: string;
    entity_id?: number;
    action?: string;
    user_id?: string;
    approval_status?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
}

