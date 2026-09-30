import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { Permission, Role, RoleWithPermissions } from "./role.types";

/**
 * Roles module — database access layer.
 *
 * The statements below mirror `sql/roles/role_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma
 * sends as bound parameters — never string-concatenate values into these
 * queries, and never use $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/roles/role_queries.sql):
 *   The PM SETU tables do not exist yet. Until the database developer
 *   creates the real schema, these queries fail at runtime and the endpoints
 *   return a 500 error envelope. That is intentional: no fake role records.
 *
 * Transactions: create/update flows that write BOTH the role and its
 * role_permissions rows run inside prisma.$transaction so a partial write
 * is never observable.
 */

interface RoleRow {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_system: boolean;
}

/** One row per role→permission match (LEFT JOIN — retains roles without permissions). */
interface RolePermissionRow extends RoleRow {
    permission_code: string | null;
}

interface PermissionRow {
    id: number;
    code: string;
    name: string | null;
}

export async function listRoles(): Promise<Role[]> {
    const rows = await prisma.$queryRaw<RoleRow[]>(Prisma.sql`
        SELECT id, code, name, description, is_system
        FROM roles
        ORDER BY id`);
    return rows;
}

export async function getRoleById(id: number): Promise<RoleWithPermissions | null> {
    const rows = await prisma.$queryRaw<RolePermissionRow[]>(Prisma.sql`
        SELECT
            r.id, r.code, r.name, r.description, r.is_system,
            p.code AS permission_code
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p       ON p.id = rp.permission_id
        WHERE r.id = ${id}`);
    if (rows.length === 0) {
        return null;
    }
    const first = rows[0];
    return {
        id: first.id,
        code: first.code,
        name: first.name,
        description: first.description,
        is_system: first.is_system,
        permissions: rows
            .map((row) => row.permission_code)
            .filter((code): code is string => code !== null),
    };
}

export async function listPermissions(): Promise<Permission[]> {
    const rows = await prisma.$queryRaw<PermissionRow[]>(Prisma.sql`
        SELECT id, code, name
        FROM permissions
        ORDER BY id`);
    return rows;
}

/** Creates the role + its permission mappings atomically (sql/roles #4+#5). */
export async function createRole(input: {
    code: string;
    name: string;
    description: string | null;
    permission_ids: number[];
}): Promise<number> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
            INSERT INTO roles (code, name, description, is_system)
            VALUES (${input.code}, ${input.name}, ${input.description}, FALSE)
            RETURNING id`);
        const roleId = rows[0].id;
        for (const permissionId of input.permission_ids) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (${roleId}, ${permissionId})
                ON CONFLICT DO NOTHING`);
        }
        return roleId;
    });
}

/**
 * Updates the role row (composed SET — only supplied columns) and, when
 * `permission_ids` is provided, replaces the mappings — all in one
 * transaction (sql/roles #6+#7). `code` and `is_system` are never updated.
 */
export async function updateRole(
    id: number,
    input: {
        name?: string;
        description?: string | null;
        permission_ids?: number[];
    },
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const updates: Prisma.Sql[] = [];
        if (input.name !== undefined) {
            updates.push(Prisma.sql`name = ${input.name}`);
        }
        if (input.description !== undefined) {
            updates.push(Prisma.sql`description = ${input.description}`);
        }
        if (updates.length > 0) {
            await tx.$executeRaw(Prisma.sql`
                UPDATE roles
                SET ${Prisma.join(updates, ", ")}
                WHERE id = ${id}`);
        }
        if (input.permission_ids !== undefined) {
            await tx.$executeRaw(
                Prisma.sql`DELETE FROM role_permissions WHERE role_id = ${id}`,
            );
            for (const permissionId of input.permission_ids) {
                await tx.$executeRaw(Prisma.sql`
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (${id}, ${permissionId})
                    ON CONFLICT DO NOTHING`);
            }
        }
    });
}

/**
 * Deletes only non-system roles (sql/roles #8). The service layer checks
 * existence + is_system BEFORE calling this, so a successful call means the
 * row is gone.
 */
export async function deleteRole(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        DELETE FROM roles
        WHERE id = ${id} AND is_system = FALSE`);
}