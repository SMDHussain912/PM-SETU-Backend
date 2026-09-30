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
import type { User, UserStatus, UserWithRoles } from "./user.types";

/**
 * Users module — service layer (RoadMap.md §19).
 *
 * Owns business rules (password hashing, not-found handling, soft delete)
 * and delegates all data access to the repository. No SQL here.
 * There is intentionally NO self-registration — users are created by admins.
 */

export interface UserListResult {
    items: User[];
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
