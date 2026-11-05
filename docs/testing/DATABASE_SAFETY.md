# Test database safety

The test command sets `NODE_ENV=test`. In that environment the application database
configuration reads **only** `TEST_DATABASE_URL`; it never falls back to
`DATABASE_URL`.

Configure a dedicated PostgreSQL database, for example:

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public"
```

The dashboard registry integration test additionally refuses to run unless:
- `NODE_ENV=test` is active;
- `TEST_DATABASE_URL` is configured and is a valid PostgreSQL URL; and
- the database name ends in `_test` or `-test`.

The integration test inserts fixture rows and deletes those exact rows during cleanup.
Do not use a shared development, staging, or production database for this purpose.
Create and migrate the test database separately before running `npm test`.

Example setup (adjust credentials and host for your environment):

```bash
createdb pm_setu_test
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu_test?schema=public" npx prisma migrate deploy
npm test
```

A passing unit test suite does not prove the PostgreSQL integration tests ran if the
test database was not configured. Treat a skipped or unexecuted database test as
unverified, not passed.
