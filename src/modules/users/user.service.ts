import { buildPaginationMeta, type PaginationMeta } from "../../utils/pagination";
import { ApiError } from "../../utils/response";
import { hashPassword } from "../../utils/password";
import type {
    CreateUserInput,
    UpdateUserInput,
    UpdateUserRolesInput,
    UpdateUserStatusInput,
    UserListQuery,
} from "./user.schema";
import * as userRepository from "./user.repository";
import type { UserStatus, UserWithRoles } from "./user.types";
import { ROLE_CODES } from "../roles/role.constants";

/**
 * Users module — service layer (RoadMap.md §19).
 *
 * Owns business rules (password hashing, not-found handling, soft delete)
 * and delegates all data access to the repository. No SQL here.
 * There is intentionally NO self-registration — users are created by admins.
 */

const PRIVILEGED_ROLE_CODES = [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN];

function forbid(message: string): never {
    throw new ApiError({ statusCode: 403, code: "FORBIDDEN", message });
}

async function assertRoleAssignmentAllowed(roleIds: number[], actorRoles: string[]): Promise<void> {
    const codes = await userRepository.getRoleCodesByIds([...new Set(roleIds)]);
    if (codes.length !== new Set(roleIds).size) {
        throw new ApiError({
            statusCode: 422,
            code: "INVALID_ROLE_ASSIGNMENT",
            message: "One or more selected roles do not exist",
        });
    }
    if (!actorRoles.includes(ROLE_CODES.SUPER_ADMIN) &&
        codes.some((code) => PRIVILEGED_ROLE_CODES.includes(code as typeof PRIVILEGED_ROLE_CODES[number]))) {
        forbid("Only a Super Administrator can assign Super Admin or State PMU Admin roles");
    }
}

async function assertPrivilegedTargetRequiresSuperAdmin(targetId: number, actorRoles: string[]): Promise<void> {
    const target = await getUserById(targetId);
    const targetIsPrivileged = target.roles.some((role) => PRIVILEGED_ROLE_CODES.includes(role.code as typeof PRIVILEGED_ROLE_CODES[number]));
    if (targetIsPrivileged && !actorRoles.includes(ROLE_CODES.SUPER_ADMIN)) {
        forbid("Only a Super Administrator can manage privileged administrator accounts");
    }
}

async function assertTargetManageable(targetId: number, actorId: string, actorRoles: string[]): Promise<UserWithRoles> {
    if (String(targetId) === actorId) {
        forbid("You cannot change your own administrative status or role assignments");
    }
    const target = await getUserById(targetId);
    const targetIsPrivileged = target.roles.some((role) => PRIVILEGED_ROLE_CODES.includes(role.code as typeof PRIVILEGED_ROLE_CODES[number]));
    if (targetIsPrivileged && !actorRoles.includes(ROLE_CODES.SUPER_ADMIN)) {
        forbid("Only a Super Administrator can manage privileged administrator accounts");
    }
    return target;
}

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

export async function createUser(input: CreateUserInput, actorRoles: string[]): Promise<UserWithRoles> {
    await assertRoleAssignmentAllowed(input.role_ids, actorRoles);
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
    actorRoles: string[],
): Promise<UserWithRoles> {
    // Profile changes to privileged administrator accounts are Super Admin only.
    await assertPrivilegedTargetRequiresSuperAdmin(id, actorRoles);
    await userRepository.updateUser(id, {
        full_name: input.full_name,
        email: input.email,
    });
    return getUserById(id);
}

export async function updateUserStatus(
    id: number,
    input: UpdateUserStatusInput,
    actorId: string,
    actorRoles: string[],
): Promise<UserWithRoles> {
    await assertTargetManageable(id, actorId, actorRoles);
    await userRepository.updateStatus(id, input.status);
    return getUserById(id);
}

export async function updateUserRoles(
    id: number,
    input: UpdateUserRolesInput,
    actorId: string,
    actorRoles: string[],
): Promise<UserWithRoles> {
    await assertTargetManageable(id, actorId, actorRoles);
    await assertRoleAssignmentAllowed(input.role_ids, actorRoles);
    await userRepository.replaceUserRoles(id, input.role_ids);
    return getUserById(id);
}

/**
 * DELETE /admin/users/:id — SOFT delete (deactivate). Hard deletion is
 * TO CONFIRM; soft keeps historical approval/audit references resolving
 * (RoadMap §21/§22). See sql/users/user_queries.sql #9.
 */
export async function deactivateUser(id: number, actorId: string, actorRoles: string[]): Promise<UserWithRoles> {
    await assertTargetManageable(id, actorId, actorRoles);
    await userRepository.updateStatus(id, "INACTIVE");
    return getUserById(id);
}
