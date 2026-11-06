/**
 * Resolve the browser-origin policy.
 *
 * Development/test may use the permissive wildcard default. Production must
 * provide an explicit allowlist so a missing environment variable cannot
 * silently widen the browser trust boundary.
 */
export function resolveCorsOrigins(value: string | undefined, isProduction: boolean): string[] | "*" {
    const configured = value?.trim();

    if (!configured || configured === "*") {
        if (isProduction) {
            throw new Error("CORS_ORIGIN must contain an explicit comma-separated origin allowlist in production");
        }
        return "*";
    }

    const origins = configured.split(",").map((origin) => origin.trim()).filter(Boolean);
    if (origins.length === 0 || origins.includes("*")) {
        throw new Error("CORS_ORIGIN must contain explicit origins and cannot mix wildcard access with an allowlist");
    }

    return [...new Set(origins)];
}
