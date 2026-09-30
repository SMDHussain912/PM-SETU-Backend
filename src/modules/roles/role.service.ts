import { ApiError } from "../../utils/response";
import * as roleRepository from "./role.repository";
import type { Permission, Role, RoleWithPermissions } from "./role.types";
import type { CreateRoleInput, UpdateRoleInput } from "./role.schema";

/**
 * Roles module — service layer.
 *
 * Owns the module's business rules (not-found handling, system-role
 * protection) and delegates all data access to the repository. Controllers
 * never talk to the database directly. The documented RoadMap §20 role rows
 * are seeded by the DBA (sql/roles/role_queries.sql #9), never created here.
 */

export async function listRoles(): Promise<Role[]> {
    return roleRepository.listRoles();
}

export async function getRoleById(id: number): Promise<RoleWithPermissions> {
    const role = await roleRepository.getRoleById(id);
    if (!role) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Role not found",
        });
    }
    return role;
}

export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
    const roleId = await roleRepository.createRole({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        permission_ids: input.permission_ids,
    });
    const role = await roleRepository.getRoleById(roleId);
    if (!role) {
        throw new ApiError({
            statusCode: 500,
            code: "INTERNAL_ERROR",
            message: "Created role could not be read back",
        });
    }
    return role;
}

export async function updateRole(
    id: number,
    input: UpdateRoleInput,
): Promise<RoleWithPermissions> {
    const existing = await roleRepository.getRoleById(id);
    if (!existing) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Role not found",
        });
    }
    await roleRepository.updateRole(id, {
        name: input.name,
        description: input.description,
        permission_ids: input.permission_ids,
    });
    const role = await roleRepository.getRoleById(id);
    if (!role) {
        // Unreachable after the existence check above; guards against a
        // concurrent delete producing a null read-back.
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Role not found",
        });
    }
    return role;
}

export async function deleteRole(id: number): Promise<RoleWithPermissions> {
    const role = await roleRepository.getRoleById(id);
    if (!role) {
        throw new ApiError({
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
            message: "Role not found",
        });
    }
    if (role.is_system) {
        throw new ApiError({
            statusCode: 400,
            code: "SYSTEM_ROLE_PROTECTED",
            message: "System roles cannot be deleted",
        });
    }
    await roleRepository.deleteRole(id);
    return role;
}

export async function listPermissions(): Promise<Permission[]> {
    return roleRepository.listPermissions();
}
