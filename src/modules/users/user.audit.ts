import type { UserWithRoles } from "./user.types";

/** Explicit allowlist for user audit snapshots; credentials and lockout state are never copied. */
export function toUserAuditValue(user: UserWithRoles) {
    return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        roles: user.roles.map(({ id, code, name }) => ({ id, code, name })),
    };
}
