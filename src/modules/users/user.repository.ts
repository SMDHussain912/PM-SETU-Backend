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
 *
 * The statements below mirror `sql/users/user_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma
 * sends as bound parameters — never string-concatenate values, never use
 * $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/users/user_queries.sql):
 *   The PM SETU tables do not exist yet. Until the database developer
 *   creates the real schema, these queries fail at runtime and the endpoints
 *   return a 500 error envelope. That is intentional: no fake user records.
 *
 * SECURITY
 *   · Only bcrypt hashes ever reach this layer (the service hashes first).
 *   · password_hash is never selected or returned.
 *   · User creation + role assignment run in ONE transaction; replacing
 *     role assignments is its own single transaction.
 */

interface UserRow {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: UserStatus;
    created_at: Date;
}

/** One row per user→role match (LEFT JOIN — keeps users without roles). */
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

/** Composes the parameterized WHERE clause (sql/users #1/#2). */
function buildFilters(filters: UserListFilters): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];
    if (filters.status !== undefined) {
        conditions.push(Prisma.sql`users.status = ${filters.status}`);
    }
    if (filters.role !== undefined) {
        conditions.push(Prisma.sql`
            EXISTS (
                SELECT 1
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = users.id AND r.code = ${filters.role}
            )`);
    }
    if (filters.search !== undefined) {
        const pattern = `%${filters.search}%`;
        conditions.push(
            Prisma.sql`(users.username ILIKE ${pattern} OR users.full_name ILIKE ${pattern})`,
        );
    }
    return conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;
}

/** GET /admin/users — paginated, filtered list (sql/users #1). */
export async function listUsers(filters: UserListFilters): Promise<User[]> {
    const rows = await prisma.$queryRaw<UserRow[]>(Prisma.sql`
        SELECT id, username, full_name, email, status, created_at
        FROM users
        ${buildFilters(filters)}
        ORDER BY users.id
        LIMIT ${filters.pageSize} OFFSET ${(filters.page - 1) * filters.pageSize}`);
    return rows.map(mapUser);
}

/** GET /admin/users — count for pagination meta (sql/users #2). */
export async function countUsers(filters: UserListFilters): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM users
        ${buildFilters(filters)}`);
    return rows[0]?.total ?? 0;
}

/** GET /admin/users/:id — single user with assigned roles (sql/users #3). */
export async function getUserById(id: number): Promise<UserWithRoles | null> {
    const rows = await prisma.$queryRaw<UserRoleRow[]>(Prisma.sql`
        SELECT
            u.id, u.username, u.full_name, u.email, u.status, u.created_at,
            r.id AS role_id, r.code AS role_code, r.name AS role_name
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r       ON r.id = ur.role_id
        WHERE u.id = ${id}
        ORDER BY r.id`);
    if (rows.length === 0) {
        return null;
    }
    const roles: AssignedRole[] = rows
        .filter((row) => row.role_id !== null)
        .map((row) => ({
            id: row.role_id as number,
            code: row.role_code as string,
            name: row.role_name as string,
        }));
    return mapUserWithRoles(rows[0], roles);
}

/**
 * POST /admin/users — creates the account + role assignments atomically
 * (sql/users #4+#5). Receives a bcrypt hash, never plaintext.
 * Duplicate username/email → Prisma P2002 → 409 DUPLICATE_RECORD.
 */
export async function createUser(input: {
    username: string;
    full_name: string;
    email: string | null;
    password_hash: string;
    role_ids: number[];
}): Promise<number> {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
            INSERT INTO users (username, full_name, email, password_hash, status)
            VALUES (${input.username}, ${input.full_name}, ${input.email}, ${input.password_hash}, 'ACTIVE')
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

/**
 * PATCH /admin/users/:id — composed profile update (sql/users #6).
 * Only supplied columns are written; `email: null` clears the address.
 * `password_hash` is deliberately never updatable here.
 */
export async function updateUser(
    id: number,
    input: { full_name?: string; email?: string | null },
): Promise<void> {
    const updates: Prisma.Sql[] = [];
    if (input.full_name !== undefined) {
        updates.push(Prisma.sql`full_name = ${input.full_name}`);
    }
    if (input.email !== undefined) {
        updates.push(Prisma.sql`email = ${input.email}`);
    }
    if (updates.length === 0) {
        return;
    }
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET ${Prisma.join(updates, ", ")}, updated_at = now()
        WHERE id = ${id}`);
}

/** PATCH /admin/users/:id/status — activate/deactivate (sql/users #7). */
export async function updateStatus(id: number, status: UserStatus): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET status = ${status}, updated_at = now()
        WHERE id = ${id}`);
}

/**
 * PATCH /admin/users/:id/roles — replace all assignments atomically
 * (sql/users #8). Unknown role ids fail with Prisma P2003 → 409
 * RELATION_CONSTRAINT via the central error middleware.
 */
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