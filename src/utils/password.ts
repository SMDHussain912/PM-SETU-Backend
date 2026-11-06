import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
const BCRYPT_SHA256_PREFIX = "pm-setu-bcrypt-sha256-v1$";

/**
 * bcrypt only processes the first 72 input bytes. Pre-hash with a
 * domain-separated SHA-256 digest so the full UTF-8 password is represented
 * before bcrypt applies its salt and work factor.
 */
function deriveBcryptInput(plainPassword: string): string {
    return createHash("sha256")
        .update("pm-setu-password-v1\\0", "utf8")
        .update(plainPassword, "utf8")
        .digest("hex");
}

export async function hashPassword(plainPassword: string): Promise<string> {
    const hash = await bcrypt.hash(deriveBcryptInput(plainPassword), SALT_ROUNDS);
    return `${BCRYPT_SHA256_PREFIX}${hash}`;
}

/** Supports legacy raw bcrypt hashes while new hashes use the full-input format. */
export async function verifyPassword(
    plainPassword: string,
    passwordHash: string,
): Promise<boolean> {
    if (passwordHash.startsWith(BCRYPT_SHA256_PREFIX)) {
        return bcrypt.compare(
            deriveBcryptInput(plainPassword),
            passwordHash.slice(BCRYPT_SHA256_PREFIX.length),
        );
    }
    return bcrypt.compare(plainPassword, passwordHash);
}

export function needsPasswordRehash(passwordHash: string): boolean {
    return !passwordHash.startsWith(BCRYPT_SHA256_PREFIX);
}
