# Finance import-batch PostgreSQL concurrency test

## Purpose

Verify that two concurrent calls to `createFinanceImportBatch` using the same UUID idempotency key converge on one canonical persisted batch and create row diagnostics only once.

The deterministic unit tests in `tests/finance-import-batch-repository.test.ts` remain useful, but they do not exercise PostgreSQL's unique constraint or concurrent transactions. This test covers that database boundary.

## Safety

The test is opt-in. It reads only `PM_SETU_TEST_DATABASE_URL`; it does not fall back to `DATABASE_URL`. Use a dedicated, disposable PostgreSQL test database with the current Prisma migrations already applied. **Never point this variable at production, staging, or a shared database.** The test inserts a uniquely keyed batch and deletes that exact batch in cleanup.

## Run

Set the dedicated test connection string in your shell, then run:

```bash
export PM_SETU_TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/pm_setu_test?schema=public'
npx tsx --test tests/finance-import-batch-postgres-concurrency.test.ts
```

To run the full project checks with the integration test enabled:

```bash
export PM_SETU_TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/pm_setu_test?schema=public'
npm run typecheck
npm test
npm run build
```

Without the dedicated variable, Node's test runner reports this test as skipped. A skipped test is not evidence of live PostgreSQL concurrency verification.

## Assertions

- Both concurrent calls return the same persisted batch ID.
- Exactly one batch exists for the generated idempotency key.
- Exactly one row diagnostic exists for that batch.
- The persisted diagnostic retains the expected row number and outcome.

The test does not prove multi-host/network fault behaviour, nor does it change the existing finance access, audit, retention, or correction-policy guardrails.
