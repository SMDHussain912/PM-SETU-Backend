/**
 * Roles module — the single source of truth for the PM SETU RBAC vocabulary.
 *
 * The role names below are documented VERBATIM in RoadMap.md §20 (never
 * renamed). The database-safe codes are an INFERRED slug mapping —
 * documented for the DBA in sql/roles/role_queries.sql and TO CONFIRM.
 * JWT role claims and src/middleware/rbac.middleware.ts operate on these
 * codes.
 *
 * Permission codes are a minimal INFERRED initial set (TO CONFIRM) so that
 * requirePermissions() is usable; every future module adds its own codes
 * (cms.*, dashboard.read, approval.*, audit.read, ...) when built.
 */

export const ROLE_CODES = {
    SUPER_ADMIN: "super_admin",
    STATE_PMU_ADMIN: "state_pmu_admin",
    DET_CONTENT_ADMIN: "det_content_admin",
    CLUSTER_ADMIN: "cluster_admin",
    HUB_ITI_USER: "hub_iti_user",
    SPOKE_ITI_USER: "spoke_iti_user",
    AIP_USER: "aip_user",
    SPV_USER: "spv_user",
    DASHBOARD_VIEWER: "dashboard_viewer",
    APPROVING_AUTHORITY: "approving_authority",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const PERMISSION_CODES = {
    USER_READ: "user.read",
    USER_WRITE: "user.write",
    ROLE_READ: "role.read",
    ROLE_WRITE: "role.write",

    /** INFERRED / TO CONFIRM — approvals module (RoadMap §21). */
    APPROVAL_READ: "approval.read",
    APPROVAL_WRITE: "approval.write",

    /** INFERRED / TO CONFIRM — audit module (RoadMap §22). */
    AUDIT_READ: "audit.read",

    /** INFERRED / TO CONFIRM — contact module (RoadMap §23). */
    CONTACT_READ: "contact.read",
    CONTACT_WRITE: "contact.write",

    /** INFERRED / TO CONFIRM — banners module (RoadMap §15). */
    BANNER_WRITE: "banner.write",

    /** INFERRED / TO CONFIRM — CMS admin CRUD (RoadMap §§12–14). */
    DOCUMENT_WRITE: "document.write",
    NEWS_WRITE: "news.write",
    GALLERY_WRITE: "gallery.write",
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

/**
 * Middleware guards used by the users and roles routers.
 * INFERRED defaults — TO CONFIRM with the portal owner.
 */
export const USER_READ_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
];

export const USER_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
];

export const ROLE_READ_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
];
export const ROLE_WRITE_ROLES: readonly string[] = [ROLE_CODES.SUPER_ADMIN];

/**
 * Approvals module guards (RoadMap §21).
 * INFERRED defaults — TO CONFIRM with the portal owner. The approval
 * transition endpoints are protected by RBAC at the route layer; these arrays
 * are a convenience for route guards, not a hardcoded final matrix.
 *
 * Transition-specific role expectations are INFERRED from the content workflow
 * narrative (Content Creator -> Department Reviewer -> Approving Officer) and
 * the documented role names — the exact mapping must be confirmed.
 */
export const APPROVAL_READ_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.APPROVING_AUTHORITY,
];

export const APPROVAL_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
    ROLE_CODES.APPROVING_AUTHORITY,
];

/**
 * Audit module guards (RoadMap §22).
 * INFERRED defaults — TO CONFIRM with the portal owner. Audit logs are
 * sensitive operational data; by default only super admin + approving authority
 * may read them until confirmed otherwise.
 */
export const AUDIT_READ_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.APPROVING_AUTHORITY,
];

/**
 * Contact module guards (RoadMap §23).
 * INFERRED defaults — TO CONFIRM with the portal owner. Reads cover the
 * admin message list/detail; writes cover triage PATCH. No final matrix.
 */
export const CONTACT_READ_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
];

export const CONTACT_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
];

/**
 * Banner admin guard (RoadMap §15 + §24).
 * INFERRED default — TO CONFIRM with the portal owner. Only a WRITE guard
 * is added because §15 defines no admin reads (GET /admin/banners and
 * GET /admin/banners/:id are deferred); all 5 admin write endpoints plus
 * the images upload use it. No final matrix.
 */
export const BANNER_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
];

/**
 * CMS admin guards — Documents (§12), News (§13), Gallery (§14).
 * INFERRED defaults — TO CONFIRM with the portal owner. Each covers that
 * module's admin CRUD + publish/archive/version + upload endpoints. Only
 * WRITE guards are added because §§12–14 define no admin reads. No final
 * matrix.
 */
export const DOCUMENT_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
];

export const NEWS_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
];

export const GALLERY_WRITE_ROLES: readonly string[] = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
];
