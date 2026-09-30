/**
 * Auth module types — RoadMap.md §18 "AUTH APIs".
 *
 * Only login, me and change-password are implemented in this task. The
 * §18 logout/refresh/forgot-password/reset-password endpoints are deferred
 * (TO CONFIRM) because they require infrastructure the project has not
 * established (token denylist/refresh storage, email/SMS delivery).
 *
 * SECURITY NOTE: password_hash NEVER appears in any response shape. JWT
 * payloads carry only sub (user id), roles and permissions — never secrets.
 */

/** Full user row needed by the login flow (includes credentials fields —
 * used ONLY inside the service; never serialized). */
export interface LoginUserRow {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: string;
    password_hash: string;
    failed_login_attempts: number;
    locked_until: Date | null;
    last_login_at: Date | null;
}

/** A role assigned to the authenticated user (join of user_roles/roles). */
export interface RoleAssignment {
    id: number;
    code: string;
    name: string;
}

/** Safe authenticated-user profile returned by /auth/login and /auth/me. */
export interface AuthUserProfile {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: string;
    /** Role codes + display names (JWT carries the codes). */
    roles: { code: string; name: string }[];
    /** Permission codes available to the user (JWT carries the codes). */
    permissions: string[];
}

/** POST /auth/login response envelope data. */
export interface LoginResponse {
    token: string;
    token_type: "Bearer";
    /** Seconds until the access token expires (from the signed exp claim). */
    expires_in: number;
    user: AuthUserProfile;
}
