-- PM SETU development fixture entry point.
-- This file is intentionally a psql script, not production migration SQL.
-- It delegates to the existing Prisma fixture loader so relations, required
-- columns, generated IDs, and is_sample flags stay aligned with schema.prisma.
--
-- Run from the backend repository root:
--   npm run db:seed:demo
--
-- Or use the shell wrapper:
--   npm run dev
--
-- Safety: prisma/seed.ts refuses NODE_ENV=production, removes ONLY rows with
-- is_sample=TRUE, and inserts fictional DEMO records. Do not run against a
-- production database.
\echo 'PM SETU demo fixtures are managed by prisma/seed.ts.'
\echo 'Run: npm run db:seed:demo'
