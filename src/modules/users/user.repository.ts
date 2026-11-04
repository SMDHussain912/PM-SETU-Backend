import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
    AssignedRole,
    User,
    UserListFilters,
    UserStatus,
    UserWithRoles,
} from "./user.types";

/**
 * Users module — database access layer.
 * All values use parameterized Prisma SQL. Password hashes are never selected
 * or returned. User creation + role assignment run in one transaction.
 */

interface UserRow {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: UserStatus;
    created_at: Date;
}

interface UserRoleRow extends UserRow {
    role_id: number | null;
    role_code: string | null;
    role_name: string | null;
}

function mapUser(row: UserRow): User {
    return {
        id: row.id,
        username: row.username,
        full_name: row.full_name,
        email: row.email,
        status: row.status,
        created_at: row.created_at,
    };
}

function mapUserWithRoles(row: UserRoleRow, roles: AssignedRole[]): UserWithRoles {
    return { ...mapUser(row), roles };
}

function buildFilters(filters: UserListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.status !== undefined) {
        conditions.push(Prisma.sql`u.status = ${filters.status}`);
    }
    if (filters.role !== undefined) {
        conditions.push(Prisma.sql`
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id AND r.code = ${filters.role}
            )`);
    }
    if (filters.search !== undefined) {
        const pattern = `%${filters.search}%`;
        conditions.push(Prisma.sql`(u.username ILIKE ${pattern} OR u.full_name ILIKE ${pattern})`);
    }
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
}

/** GET /admin/users — paginated users with their assigned roles. */
export async function listUsers(filters: UserListFilters): Promise<UserWithRoles[]> {
    const rows = await prisma.$queryRaw<UserRoleRow[]>(Prisma.sql`
        WITH page_users AS (
            SELECT u.id
            FROM users u
            ${buildFilters(filters)}
            ORDER BY u.id
            LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}
        )
        SELECT
            u.id, u.username, u.full_name, u.email, u.status, u.created_at,
            r.id AS role_id, r.code AS role_code, r.name AS role_name
        FROM page_users pu
        JOIN users u ON u.id = pu.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        ORDER BY u.id, r.id`);

    const users = new Map<number, UserWithRoles>();
    for (const row of rows) {
        const existing = users.get(row.id);
        if (existing) {
            if (row.role_id !== null) {
                existing.roles.push({
                    id: row.role_id,
                    code: row.role_code as string,
                    name: row.role_name as string,
                });
            }
        } else {
            const roles: AssignedRole[] = row.role_id === null ? [] : [{
                id: row.role_id,
                code: row.role_code as string,
                name: row.role_name as string,
            }];
            users.set(row.id, mapUserWithRoles(row, roles));
        }
    }
    return [...users.values()];
}

export async function countUsers(filters: UserListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS total FROM users u ${buildFilters(filters)}`);
    return rows[0]?.total ?? 0;
}

export async function getUserById(id: number): Promise<UserWithRoles | null> {
    const rows = await prisma.$queryRaw<UserRoleRow[]>(Prisma.sql`
        SELECT
            u.id, u.username, u.full_name, u.email, u.status, u.created_at,
            r.id AS role_id, r.code AS role_code, r.name AS role_name
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ${id}
        ORDER BY r.id`);
    if (rows.length === 0) return null;
    const roles: AssignedRole[] = rows
        .filter((row) => row.role_id !== null)
        .map((row) => ({
            id: row.role_id as number,
            code: row.role_code as string,
            name: row.role_name as string,
        }));
    return mapUserWithRoles(rows[0], roles);
}

/** Creates the account + role assignments atomically. Receives bcrypt hash only. */
export async function createUser(input: {
    username: string;
    full_name: string;
    email: string | null;
    password_hash: string;
    role_ids: number[];
}): Promise<number> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
            INSERT INTO users (
                username, full_name, email, password_hash, status, updated_at
            )
            VALUES (
                ${input.username}, ${input.full_name}, ${input.email},
                ${input.password_hash}, 'ACTIVE', NOW()
            )
            RETURNING id`);
        const userId = rows[0].id;
        for (const roleId of input.role_ids) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO user_roles (user_id, role_id)
                VALUES (${userId}, ${roleId})
                ON CONFLICT DO NOTHING`);
        }
        return userId;
    });
}

export async function updateUser(
    id: number,
    input: { full_name?: string; email?: string | null },
): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.full_name !== undefined) updates.push(Prisma.sql`full_name = ${input.full_name}`);
    if (input.email !== undefined) updates.push(Prisma.sql`email = ${input.email}`);
    if (updates.length === 0) return;
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

export async function updateStatus(id: number, status: UserStatus): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users SET status = ${status}, updated_at = now() WHERE id = ${id}`);
}

export async function replaceUserRoles(userId: number, roleIds: number[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`DELETE FROM user_roles WHERE user_id = ${userId}`);
        for (const roleId of roleIds) {
            await tx.$executeRaw(Prisma.sql`
                INSERT INTO user_roles (user_id, role_id)
                VALUES (${userId}, ${roleId})
                ON CONFLICT DO NOTHING`);
        }
    });
}
