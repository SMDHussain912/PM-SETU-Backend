import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { ApiError } from "../../utils/response";
import { hashPassword, verifyPassword } from "../../utils/password";
import * as authRepository from "./auth.repository";
import type { ChangePasswordInput, LoginInput } from "./auth.schema";
import type { AuthUserProfile, LoginResponse, LoginUserRow, RoleAssignment } from "./auth.types";

/**
 * Auth module — service layer (RoadMap.md §18).
 *
 * Owns the login business rules (credential verification, account status,
 * lockout) and JWT issuing. Delegates all data access to the repository.
 * Passwords exist here only transiently for the bcrypt compare/hash — never
 * logged, never stored plaintext, never returned.
 *
 * Error contract mirrors src/middleware/auth.middleware.ts and uses ONLY the
 * shared `sendError` envelope via ApiError (→ central error middleware).
 */

/** Timing equalizer: unknown usernames still run a bcrypt compare so login
 * latency does not reveal whether an account exists. */
let dummyPasswordHash: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
    if (dummyPasswordHash === null) {
        dummyPasswordHash = hashPassword("pm-setu-timing-equalization-sentinel");
    }
    return dummyPasswordHash;
}

function invalidCredentials(): ApiError {
    // Generic even when the account exists — no user enumeration.
    return new ApiError({
        message: "Invalid username or password",
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
    });
}

/** Converts the JWT `sub` string into the numeric user id used by queries. */
export function requireUserId(raw: string | undefined): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ApiError({
            message: "Invalid authentication token",
            statusCode: 401,
            code: "INVALID_TOKEN",
        });
    }
    return id;
}

function signAccessToken(
    userId: number,
    roles: string[],
    permissions: string[],
): string {
    // Same use-time check as the verifying middleware (AUTH_NOT_CONFIGURED).
    if (!env.jwtAccessSecret) {
        throw new ApiError({
            message: "JWT_ACCESS_SECRET is not configured",
            statusCode: 500,
            code: "AUTH_NOT_CONFIGURED",
        });
    }
    return jwt.sign(
        { roles, permissions },
        env.jwtAccessSecret,
        {
            algorithm: "HS256", // pinned — matches verifyAccessToken's whitelist
            subject: String(userId),
            // env value is a `string`; the jsonwebtoken type is a literal
            // union ("8h", "30m", ...), hence the cast.
            expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"],
        },
    );
}

function buildProfile(
    user: LoginUserRow,
    roles: RoleAssignment[],
    permissions: string[],
): AuthUserProfile {
    return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        roles: roles.map(({ code, name }) => ({ code, name })),
        permissions,
    };
}

/** POST /auth/login — verify credentials, enforce lockout, issue the JWT. */
export async function login(input: LoginInput): Promise<LoginResponse> {
    const user = await authRepository.findUserByUsername(input.username);

    if (!user) {
        // Equalize timing with the account-exists path, then fail generically.
        await verifyPassword(input.password, await getDummyHash());
        throw invalidCredentials();
    }

    const now = Date.now();
    if (user.locked_until && user.locked_until.getTime() > now) {
        throw new ApiError({
            message: "Account is locked due to too many failed login attempts",
            statusCode: 423,
            code: "ACCOUNT_LOCKED",
        });
    }
    if (user.status !== "ACTIVE") {
        throw new ApiError({
            message: "Account is not active",
            statusCode: 403,
            code: "ACCOUNT_INACTIVE",
        });
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
        const attempts = user.failed_login_attempts + 1;
        if (attempts >= env.accountLock.maxAttempts) {
            await authRepository.applyLockout(
                user.id,
                new Date(now + env.accountLock.lockMinutes * 60_000),
            );
        } else {
            await authRepository.recordFailedLogin(user.id, attempts);
        }
        throw invalidCredentials();
    }

    await authRepository.resetFailedLogins(user.id);

    const [roles, permissions] = await Promise.all([
        authRepository.findRolesByUserId(user.id),
        authRepository.findPermissionCodesByUserId(user.id),
    ]);
    const token = signAccessToken(user.id, roles.map((role) => role.code), permissions);

    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    const expiresIn = decoded?.exp ? decoded.exp - Math.floor(now / 1000) : 0;

    return {
        token,
        token_type: "Bearer",
        expires_in: expiresIn,
        user: buildProfile(user, roles, permissions),
    };
}

/** GET /auth/me — fresh profile from the database (not just token claims). */
export async function getMe(userId: number): Promise<AuthUserProfile> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
        throw new ApiError({
            message: "Account no longer exists",
            statusCode: 401,
            code: "UNAUTHENTICATED",
        });
    }
    const [roles, permissions] = await Promise.all([
        authRepository.findRolesByUserId(userId),
        authRepository.findPermissionCodesByUserId(userId),
    ]);
    return buildProfile(user, roles, permissions);
}

/** POST /auth/change-password — verify current, hash + persist new. */
export async function changePassword(
    userId: number,
    input: ChangePasswordInput,
): Promise<{ updated: true }> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
        throw new ApiError({
            message: "User not found",
            statusCode: 404,
            code: "RECORD_NOT_FOUND",
        });
    }
    const currentValid = await verifyPassword(input.current_password, user.password_hash);
    if (!currentValid) {
        throw new ApiError({
            message: "Current password is incorrect",
            statusCode: 401,
            code: "INVALID_CREDENTIALS",
        });
    }
    const nextHash = await hashPassword(input.new_password);
    await authRepository.updatePasswordHash(userId, nextHash);
    return { updated: true };
}