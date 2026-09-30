/**
 * Home module request schemas (zod).
 *
 * The only endpoint in this module so far is GET /api/v1/home/kpis, which
 * takes no path params, no query string and no body — so there is nothing to
 * validate and no schema is defined here on purpose.
 *
 * If a future Home endpoint introduces request input, define its zod schema
 * here and wire it in home.routes.ts via the shared `validate()` middleware
 * (src/middleware/validate.middleware.ts).
 */
export {};
