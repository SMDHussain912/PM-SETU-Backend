import "dotenv/config";

function requirePort(value: string | undefined): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error("Invalid PORT configuration");
    }
    return port;
}

function parseNodeEnv(
    value: string | undefined,
): "development" | "production" | "test" {
    if (!value || value.trim() === "") {
        return "development";
    }
    if (value === "development" || value === "production" || value === "test") {
        return value;
    }
    throw new Error(
        'Invalid NODE_ENV configuration. Expected "development", "production" or "test".',
    );
}

function parseOrigins(value: string | undefined): string[] | "*" {
    if (!value || value.trim() === "" || value.trim() === "*") {
        return "*";
    }
    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

function parsePositiveInt(value: string | undefined): number | undefined {
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);

/**
 * Typed application configuration.
 *
 * Only PORT is strictly required at boot. Everything else is optional and
 * validated (with a clear error) at the point where it is actually used —
 * e.g. DATABASE_URL is only needed once the Prisma client is created, and
 * JWT_ACCESS_SECRET only once the auth middleware runs.
 */
export const env = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: requirePort(process.env.PORT),

    // Database (optional until the Prisma client is actually created)
    databaseUrl: process.env.DATABASE_URL,

    // CORS — comma-separated list of origins, or "*" to allow all
    corsOrigins: parseOrigins(process.env.CORS_ORIGIN),

    // Auth (optional until the auth middleware is actually used)
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,

    // JWT lifetime (jsonwebtoken expiresIn format — "8h", "30m", "1d").
    // No refresh-token infrastructure exists yet (TO CONFIRM, RoadMap §18).
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "8h",

    // Account lockout (NIC security requirement — RoadMap.md §27).
    // Counters live on `users` so they survive server restarts; IP-based
    // express-rate-limit windows do not. Values INFERRED / TO CONFIRM.
    accountLock: {
        maxAttempts: parsePositiveInt(process.env.ACCOUNT_LOCK_MAX_ATTEMPTS) ?? 5,
        lockMinutes: parsePositiveInt(process.env.ACCOUNT_LOCK_MINUTES) ?? 15,
    },

    // Logging — debug | info | warn | error
    logLevel: process.env.LOG_LEVEL,

    // Rate limiting (requests per window)
    rateLimit: {
        windowMinutes: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MINUTES) ?? 15,
        max: parsePositiveInt(process.env.RATE_LIMIT_MAX) ?? 300,
        authMax: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX) ?? 20,
    },

    // File uploads
    upload: {
        dir: process.env.UPLOAD_DIR ?? "uploads",
        maxFileSizeMb: parsePositiveInt(process.env.UPLOAD_MAX_FILE_SIZE_MB) ?? 10,
    },
} as const;

export type Env = typeof env;
