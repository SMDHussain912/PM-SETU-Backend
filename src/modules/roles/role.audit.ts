import type { RoleWithPermissions } from "./role.types";

/** Explicit allowlist for role audit snapshots. */
export function toRoleAuditValue(role: RoleWithPermissions) {
    return {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        is_system: role.is_system,
        permissions: [...role.permissions].sort(),
    };
}
