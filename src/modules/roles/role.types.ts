/**
 * Roles module types — RoadMap.md §20 "ROLE / PERMISSION APIs" and §25
 * "DATABASE MODELS" (Role / Permission / RolePermission / UserRole).
 *
 * `code` is the database-safe slug (see role.constants.ts); `name` stores
 * the documented role title (e.g. "Super Administrator") verbatim.
 * Response/`permissions` values use permission codes (matching the JWT
 * `permissions` claim consumed by requirePermissions()).
 */

export interface Role {
    id: number;
    code: string;
    name: string;
    description: string | null;
    /** TRUE for the ten seeded RoadMap §20 roles — protected from DELETE. */
    is_system: boolean;
}

export interface RoleWithPermissions extends Role {
    /** Permission codes assigned to the role (`role_permissions` join). */
    permissions: string[];
}

export interface Permission {
    id: number;
    code: string;
    name: string | null;
}
