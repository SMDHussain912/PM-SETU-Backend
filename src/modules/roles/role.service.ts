import { ApiError } from "../../utils/response";
import { prisma } from "../../config/database";
import * as roleRepository from "./role.repository";
import type { Permission, Role, RoleWithPermissions } from "./role.types";
import type { CreateRoleInput, UpdateRoleInput } from "./role.schema";
import * as auditService from "../audit/audit.service";
import { toRoleAuditValue } from "./role.audit";
import type { AuditContext } from "../audit/audit.types";

/**
 * Roles module — service layer.
 *
 * Every role mutation and its audit event commit in the same PostgreSQL
 * transaction. An audit insert failure therefore rolls back the mutation.
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

export async function createRole(input: CreateRoleInput, actorId: string, context?: AuditContext): Promise<RoleWithPermissions> {
    return prisma.$transaction(async (tx) => {
        const roleId = await roleRepository.createRole({
            code: input.code,
            name: input.name,
            description: input.description ?? null,
            permission_ids: input.permission_ids,
        }, tx);
        const role = await roleRepository.getRoleById(roleId, tx);
        if (!role) {
            throw new ApiError({
                statusCode: 500,
                code: "INTERNAL_ERROR",
                message: "Created role could not be read back",
            });
        }
        await auditService.recordAuditEntry({
            userId: actorId,
            action: "CREATE",
            entity: "ROLE",
            entityId: role.id,
            oldValue: null,
            newValue: toRoleAuditValue(role),
            approvalStatus: null,
            context: context ?? { userId: actorId },
        }, tx);
        return role;
    });
}

export async function updateRole(
    id: number,
    input: UpdateRoleInput,
    actorId: string,
    context?: AuditContext,
): Promise<RoleWithPermissions> {
    return prisma.$transaction(async (tx) => {
        const existing = await roleRepository.getRoleById(id, tx);
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
        }, tx);
        const role = await roleRepository.getRoleById(id, tx);
        if (!role) {
            throw new ApiError({
                statusCode: 404,
                code: "RECORD_NOT_FOUND",
                message: "Role not found",
            });
        }
        await auditService.recordAuditEntry({
            userId: actorId,
            action: "UPDATE",
            entity: "ROLE",
            entityId: id,
            oldValue: toRoleAuditValue(existing),
            newValue: toRoleAuditValue(role),
            approvalStatus: null,
            context: context ?? { userId: actorId },
        }, tx);
        return role;
    });
}

export async function deleteRole(id: number, actorId: string, context?: AuditContext): Promise<RoleWithPermissions> {
    return prisma.$transaction(async (tx) => {
        const role = await roleRepository.getRoleById(id, tx);
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
        await roleRepository.deleteRole(id, tx);
        await auditService.recordAuditEntry({
            userId: actorId,
            action: "DELETE",
            entity: "ROLE",
            entityId: id,
            oldValue: toRoleAuditValue(role),
            newValue: null,
            approvalStatus: null,
            context: context ?? { userId: actorId },
        }, tx);
        return role;
    });
}

export async function listPermissions(): Promise<Permission[]> {
    return roleRepository.listPermissions();
}
