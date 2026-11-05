# Finance ledger PostgreSQL concurrency test

## Purpose

Exercise the real PostgreSQL unique source-identity constraints used by:
- approved outlay ingestion;
- fund release ingestion;
- expenditure ingestion.

For each ledger, two concurrent calls submit the same source system and source record ID. The expected outcomes are one `CREATED` and one `DUPLICATE`, both referring to the same canonical row, with exactly one row persisted.

## Safety

The test is opt-in and uses only `PM_SETU_TEST_DATABASE_URL`. It never falls back to `DATABASE_URL`. Use a dedicated, disposable PostgreSQL database with the repository's migrations applied. Never point it at production, staging, or a shared database.

The test creates unique source identifiers using a random UUID. Cleanup deletes only the test expenditure, release, and outlay rows identified by those exact generated IDs, in foreign-key-safe order.

## Run

```bash
export PM_SETU_TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/pm_setu_test?schema=public'
npx tsx --test tests/finance-ledger-postgres-concurrency.test.ts
```

Run all checks with both PostgreSQL concurrency tests enabled:

```bash
export PM_SETU_TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/pm_setu_test?schema=public'
npm run typecheck
npm test
npm run build
```

Without the variable, the test is skipped. A skipped run is not live database verification.

## Assertions and limits

For each ledger, the test asserts one created outcome, one duplicate outcome, identical returned row IDs, and exactly one persisted source-identity row. It also verifies that release and expenditure relationships can be satisfied by the persisted parent records.

This is an application-level PostgreSQL concurrency test, not a multi-host fault-injection test. It does not authorize finance API exposure, alter financial correction policy, or establish official finance KPI definitions.
