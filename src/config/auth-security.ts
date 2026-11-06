/** Minimum HMAC key size for HS256 access tokens. */
export const MIN_JWT_ACCESS_SECRET_BYTES = 32;

/**
 * A missing or short signing key must fail closed at the point auth is used.
 * Deployments should use a cryptographically random value (the .env.example
 * command generates 48 random bytes), not merely a 32-byte human phrase.
 */
export function hasStrongJwtAccessSecret(
    secret: string | undefined,
): secret is string {
    return typeof secret === "string"
        && Buffer.byteLength(secret, "utf8") >= MIN_JWT_ACCESS_SECRET_BYTES;
}
