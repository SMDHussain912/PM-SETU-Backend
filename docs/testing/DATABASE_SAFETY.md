# Test database safety

The test command sets `NODE_ENV=test`. In that environment the application database
configuration reads **only** `TEST_DATABASE_URL`; it never falls back to
`DATABASE_URL`.

Database-independent unit tests can run without PostgreSQL. The Prisma module uses
an intentionally unreachable loopback test URL only to allow repository modules to
be imported and mocked; it cannot reach a development or production database.
Database integration tests are skipped unless `TEST_DATABASE_URL` is configured.
The PostgreSQL concurrency tests use `PM_SETU_TEST_DATABASE_URL`. Point it at the same
isolated migrated test database when you want the full suite, including concurrency coverage.

Configure a dedicated PostgreSQL database, for example:

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public"
```

All destructive PostgreSQL integration tests refuse to run unless:
- `NODE_ENV=test` is active;
- `TEST_DATABASE_URL` (or `PM_SETU_TEST_DATABASE_URL` for opt-in concurrency tests) is configured and is a valid PostgreSQL URL; and
- the database name ends in `_test` or `-test`.

Integration tests insert fixture rows and delete those exact rows during cleanup. Setup and cleanup hooks are guarded so tests do not open a connection when the dedicated URL is absent.
Do not use a shared development, staging, or production database for this purpose.
Create and migrate the test database separately before running `npm test`. The
database-backed integration tests run only when `TEST_DATABASE_URL` is present, and concurrency tests additionally require `PM_SETU_TEST_DATABASE_URL`;
without it, they are reported as skipped rather than failed or silently redirected.

Example setup (adjust credentials and host for your environment):

```bash
createdb pm_setu_test
NODE_ENV=test TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public" npx prisma migrate deploy
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public" \\
PM_SETU_TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public" npm test
```

A passing unit test suite does not prove the PostgreSQL integration tests ran if the
test database was not configured. Treat a skipped or unexecuted database test as
unverified, not passed.
