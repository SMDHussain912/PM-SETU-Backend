-- PM SETU development demo-data loader (psql script).
-- Run with: npm run db:seed:demo:sql
-- The Prisma fixture loader performs dependency-aware cleanup and inserts
-- fictional rows with is_sample=TRUE. It refuses NODE_ENV=production.
\echo 'Loading PM SETU development fixtures through the Prisma seed script…'
\! npm run db:seed:demo
