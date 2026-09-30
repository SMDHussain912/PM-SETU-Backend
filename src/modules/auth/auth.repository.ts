import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { LoginUserRow, RoleAssignment } from "./auth.types";

/**
 * Auth module — database access layer.
 *
 * The statements below mirror `sql/auth/auth_queries.sql`, the
 * DBA-maintained copy of the queries. If a query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer). All
 * user input is passed through tagged-template interpolation, which Prisma
 * sends as bound parameters — never string-concatenate values, never use
 * $queryRawUnsafe.
 *
 * ⚠ STATUS (full details in sql/auth/auth_queries.sql):
 *   The PM SETU tables do not exist yet. Until the database developer
 *   creates the real schema, these queries fail at runtime and the endpoints
 *   return a 500 error envelope. That is intentional: no fake user records.
 *
 * SECURITY
 *   · The password hash is selected ONLY for the in-service bcrypt compare;
 *     it is never exposed through the service/controllers.
 *   · Account-lockout counters live on `users` so they survive restarts.
 */

interface LoginUserDbRow {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: string;
    password_hash: string;
    failed_login_attempts: number;
    locked_until: Date | null;
    last_login_at: Date | null;
}

interface RoleRow {
    id: number;
    code: string;
    name: string;
}

function mapLoginUser(row: LoginUserDbRow): LoginUserRow {
    return { ...row };
}

/** sql/auth #1 — login account lookup by exact username. */
export async function findUserByUsername(username: string): Promise<LoginUserRow | null> {
    const rows = await prisma.$queryRaw<LoginUserDbRow[]>(Prisma.sql`
        SELECT id, username, full_name, email, status,
               password_hash, failed_login_attempts, locked_until, last_login_at
        FROM users
        WHERE username = ${username}`);
    return rows[0] ? mapLoginUser(rows[0]) : null;
}

/** sql/auth #5 — fresh profile lookup by id (GET /auth/me). */
export async function findUserById(id: number): Promise<LoginUserRow | null> {
    const rows = await prisma.$queryRaw<LoginUserDbRow[]>(Prisma.sql`
        SELECT id, username, full_name, email, status,
               password_hash, failed_login_attempts, locked_until, last_login_at
        FROM users
        WHERE id = ${id}`);
    return rows[0] ? mapLoginUser(rows[0]) : null;
}

/** sql/auth #3 — role assignments (id/code/name) for the auth profile. */
export async function findRolesByUserId(userId: number): Promise<RoleAssignment[]> {
    const rows = await prisma.$queryRaw<RoleRow[]>(Prisma.sql`
        SELECT r.id, r.code, r.name
        FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = ${userId}
        ORDER BY r.id`);
    return rows;
}

/** sql/auth #2 — role codes only (JWT claims). */
export async function findRoleCodesByUserId(userId: number): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ code: string }[]>(Prisma.sql`
        SELECT r.code
        FROM roles r
        JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = ${userId}
        ORDER BY r.id`);
    return rows.map((row) => row.code);
}

/** sql/auth #4 — permission codes available to the user (JWT + RBAC). */
export async function findPermissionCodesByUserId(userId: number): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ code: string }[]>(Prisma.sql`
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        JOIN user_roles ur       ON ur.role_id = rp.role_id
        WHERE ur.user_id = ${userId}
        ORDER BY p.code`);
    return rows.map((row) => row.code);
}

/** sql/auth #7 — record an additional failed login attempt. */
export async function recordFailedLogin(id: number, attempts: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET failed_login_attempts = ${attempts}, updated_at = now()
        WHERE id = ${id}`);
}

/** sql/auth #8 — lock the account (and reset the counter for the next cycle). */
export async function applyLockout(id: number, lockedUntil: Date): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET failed_login_attempts = 0, locked_until = ${lockedUntil}, updated_at = now()
        WHERE id = ${id}`);
}

/** sql/auth #9 — successful login: clear lockout, record last_login_at. */
export async function resetFailedLogins(id: number): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL,
            last_login_at = now(), updated_at = now()
        WHERE id = ${id}`);
}

/** sql/auth #10 — POST /auth/change-password: replace the password hash. */
export async function updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = now()
        WHERE id = ${id}`);
}