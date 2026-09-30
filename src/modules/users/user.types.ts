/**
 * Users module types — RoadMap.md §19 "USER APIs" and §25 "DATABASE MODELS"
 * (User / UserRole).
 *
 * Administrative user management only — there is NO public self-registration.
 * Field sources (documented in sql/users/user_queries.sql):
 *   · username / password_hash — login contract (INFERRED; TO CONFIRM)
 *   · full_name                — display name (INFERRED; TO CONFIRM)
 *   · email                    — needed by future §18 reset flows (TO CONFIRM)
 *   · status                   — §19 PATCH /:id/status
 *   · roles via user_roles     — §19 PATCH /:id/roles
 *
 * `password_hash` NEVER appears in any of these types/response shapes.
 */

export type UserStatus = "ACTIVE" | "INACTIVE";

/** Admin-facing user record (no credentials fields). */
export interface User {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: UserStatus;
    created_at: Date;
}

/** A role assigned to a user (flattened from the user_roles/roles join). */
export interface AssignedRole {
    id: number;
    code: string;
    name: string;
}

export interface UserWithRoles extends User {
    roles: AssignedRole[];
}

/** Accepted list filters for GET /admin/users (§19) + pagination. */
export interface UserListFilters {
    status?: UserStatus;
    /** Role code filter (e.g. "super_admin") — EXISTS over user_roles/roles. */
    role?: string;
    /** Username/full-name ILIKE match. */
    search?: string;
    page: number;
    pageSize: number;
}
