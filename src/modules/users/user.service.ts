import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { hashPassword } from "../../utils/password";
import type {
    CreateUserInput,
    UpdateUserInput,
    UpdateUserRolesInput,
    UpdateUserStatusInput,
    UserListQuery,
    UserScopesInput,
} from "./user.schema";
import * as userRepository from "./user.repository";
import type { UserStatus, UserWithRoles } from "./user.types";

/**
 * Users module — service layer (RoadMap.md §19).
 *
 * Owns business rules (password hashing, not-found handling, soft delete)
 * and delegates all data access to the repository. No SQL here.
 * There is intentionally NO self-registration — users are created by admins.
 */

export interface UserListResult {
    items: UserWithRoles[];
    meta: PaginationMeta;
}

export async function listUsers(query: UserListQuery): Promise<UserListResult> {
    const filters = {
        status: query.status,
        role: query.role,
        search: query.search,
        page: query.page,
        pageSize: query.pageSize,
    };
    const [items, total] = await Promise.all([
        userRepository.listUsers(filters),
        userRepository.countUsers(filters),
    ]);
    return { items, meta: buildPaginationMeta(total, query.page, query.pageSize) };
}

export async function getUserById(id: number): Promise<UserWithRoles> {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "User not found",
        });
    }
    return user;
}

export async function createUser(input: CreateUserInput): Promise<UserWithRoles> {
    // The password is hashed HERE so only the bcrypt hash ever reaches the
    // repository/SQL layer. No plaintext is persisted or returned.
    const password_hash = await hashPassword(input.password);
    const userId = await userRepository.createUser({
        username: input.username,
        full_name: input.full_name,
        email: input.email ?? null,
        password_hash,
        role_ids: input.role_ids,
    });
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new ApiError({
            statusCode: 500,
            code: "INTERNAL_ERROR",
            message: "Created user could not be read back",
        });
    }
    return user;
}

export async function updateUser(
    id: number,
    input: UpdateUserInput,
): Promise<UserWithRoles> {
    // Existence check also documents that password_hash is never updated here.
    await getUserById(id);
    await userRepository.updateUser(id, {
        full_name: input.full_name,
        email: input.email,
    });
    return getUserById(id);
}

export async function updateUserStatus(
    id: number,
    input: UpdateUserStatusInput,
): Promise<UserWithRoles> {
    await getUserById(id);
    await userRepository.updateStatus(id, input.status);
    return getUserById(id);
}

export async function updateUserRoles(
    id: number,
    input: UpdateUserRolesInput,
): Promise<UserWithRoles> {
    await getUserById(id);
    await userRepository.replaceUserRoles(id, input.role_ids);
    return getUserById(id);
}

/**
 * DELETE /admin/users/:id — SOFT delete (deactivate). Hard deletion is
 * TO CONFIRM; soft keeps historical approval/audit references resolving
 * (RoadMap §21/§22). See sql/users/user_queries.sql #9.
 */
export async function deactivateUser(id: number): Promise<UserWithRoles> {
    await getUserById(id);
    await userRepository.updateStatus(id, "INACTIVE");
    return getUserById(id);
}


const SCOPE_ROLE_REQUIREMENTS = [
    { role: ROLE_CODES.CLUSTER_ADMIN, scope: "CLUSTER" },
    { role: ROLE_CODES.HUB_ITI_USER, scope: "ITI", itiType: "HUB" },
    { role: ROLE_CODES.SPOKE_ITI_USER, scope: "ITI", itiType: "SPOKE" },
    { role: ROLE_CODES.AIP_USER, scope: "AIP" },
    { role: ROLE_CODES.SPV_USER, scope: "SPV" },
] as const;

export async function getUserScopes(id: number) {
    await getUserById(id);
    return userRepository.listUserScopes(id);
}

export async function replaceUserScopes(
    id: number,
    input: UserScopesInput,
    actorId: string,
    actorRoles: string[],
) {
    if (String(id) === actorId) forbid("You cannot change your own organisation scope assignments");
    if (!actorRoles.some((role) => [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN].includes(role as typeof ROLE_CODES.SUPER_ADMIN | typeof ROLE_CODES.STATE_PMU_ADMIN))) {
        forbid("Only Super Admin or State PMU Admin can assign organisation scopes");
    }

    const target = await getUserById(id);
    if (target.status !== "ACTIVE") {
        throw new ApiError({ statusCode: 409, code: "INACTIVE_ACCOUNT", message: "Activate the account before assigning organisation scopes" });
    }
    const targetIsPrivileged = target.roles.some((role) => PRIVILEGED_ROLE_CODES.includes(role.code as typeof PRIVILEGED_ROLE_CODES[number]));
    if (targetIsPrivileged && !actorRoles.includes(ROLE_CODES.SUPER_ADMIN)) {
        forbid("Only a Super Administrator can change privileged administrator assignments");
    }

    const unique = new Set(input.scopes.map((scope) => `${scope.scope_type}:${scope.scope_id}`));
    if (unique.size !== input.scopes.length) {
        throw new ApiError({ statusCode: 422, code: "DUPLICATE_SCOPE", message: "Duplicate scope assignments are not allowed" });
    }

    for (const requirement of SCOPE_ROLE_REQUIREMENTS) {
        const hasRole = target.roles.some((role) => role.code === requirement.role);
        const matchingScopes = input.scopes.filter((scope) => scope.scope_type === requirement.scope);
        if (requirement.scope !== "ITI") {
            if (hasRole && matchingScopes.length === 0) {
                throw new ApiError({
                    statusCode: 422,
                    code: "MISSING_REQUIRED_SCOPE",
                    message: `The assigned ${requirement.role} role requires at least one ${requirement.scope} scope`,
                });
            }
            if (!hasRole && matchingScopes.length > 0) {
                throw new ApiError({
                    statusCode: 422,
                    code: "SCOPE_ROLE_MISMATCH",
                    message: `The user must have the matching role before a ${requirement.scope} scope can be assigned`,
                });
            }
        } else {
            const itiScopes = matchingScopes;
            const hasMatchingItiRole = target.roles.some((role) => role.code === ROLE_CODES.HUB_ITI_USER || role.code === ROLE_CODES.SPOKE_ITI_USER);
            if (itiScopes.length > 0 && !hasMatchingItiRole) {
                throw new ApiError({ statusCode: 422, code: "SCOPE_ROLE_MISMATCH", message: "ITI scopes require a Hub ITI User or Spoke ITI User role" });
            }
            for (const scope of itiScopes) {
                const actualType = await userRepository.getItiTypeById(scope.scope_id);
                const matchingRole = actualType === "HUB" ? ROLE_CODES.HUB_ITI_USER
                    : actualType === "SPOKE" ? ROLE_CODES.SPOKE_ITI_USER : null;
                if (!matchingRole || !target.roles.some((role) => role.code === matchingRole)) {
                    throw new ApiError({
                        statusCode: 422,
                        code: "ITI_SCOPE_ROLE_MISMATCH",
                        message: "Each ITI assignment must match an assigned Hub or Spoke ITI role",
                    });
                }
            }
            for (const itiRole of [ROLE_CODES.HUB_ITI_USER, ROLE_CODES.SPOKE_ITI_USER]) {
                if (target.roles.some((role) => role.code === itiRole)) {
                    const expectedType = itiRole === ROLE_CODES.HUB_ITI_USER ? "HUB" : "SPOKE";
                    let hasExpectedScope = false;
                    for (const scope of itiScopes) {
                        if (await userRepository.getItiTypeById(scope.scope_id) === expectedType) hasExpectedScope = true;
                    }
                    if (!hasExpectedScope) {
                        throw new ApiError({
                            statusCode: 422,
                            code: "MISSING_REQUIRED_SCOPE",
                            message: `The assigned ${itiRole} role requires at least one ${expectedType} ITI scope`,
                        });
                    }
                }
            }
        }
    }

    const allowedTypes = new Set(SCOPE_ROLE_REQUIREMENTS.map((item) => item.scope));
    if (input.scopes.some((scope) => !allowedTypes.has(scope.scope_type as typeof SCOPE_ROLE_REQUIREMENTS[number]["scope"]))) {
        throw new ApiError({ statusCode: 422, code: "INVALID_SCOPE_TYPE", message: "Unsupported organisation scope type" });
    }

    await userRepository.replaceUserScopes(id, input.scopes);
    return userRepository.listUserScopes(id);
}
