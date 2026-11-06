# Phase 7.2 — PostgreSQL training reporting reconciliation test

**Scope:** Opt-in database integration coverage for `GET /api/v1/dashboard/training/reporting`.

## What the test exercises

`tests/dashboard/training-reporting-postgres.integration.test.ts` runs the actual repository SQL against a dedicated migrated PostgreSQL test database. It creates uniquely named fixtures and compares the report before and after insertion, so pre-existing test fixtures do not invalidate the assertions.

The fixture set covers:
- Two non-sample ITIs in a reportable cluster, including a genuine numeric zero.
- A non-sample ITI with a null capacity.
- A non-sample ITI with no cluster.
- A non-sample ITI attached to a sample cluster.
- A sample ITI attached to a reportable cluster.
- A reportable cluster with no populated capacity.

The assertions verify that:
- Sample ITIs and sample clusters do not contribute to reportable totals.
- The state aggregate includes non-sample ITIs even when they have no reportable cluster.
- Cluster totals plus capacity outside reportable clusters reconcile to the state total.
- Null capacity remains unavailable while numeric zero remains available.
- Coverage counts reconcile independently of capacity values.

## Run

Use only the dedicated test database:

```bash
NODE_ENV=test \
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pm_setu_test?schema=public" \
PM_SETU_TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pm_setu_test?schema=public" \
npx tsx --test tests/dashboard/training-reporting-postgres.integration.test.ts
```

The test skips when `PM_SETU_TEST_DATABASE_URL` is absent. A skipped test is not PostgreSQL verification. It checks that both test URL variables point to the same dedicated test database and deletes only fixture IDs created by that test.

No reporting-period filter or as-of date is introduced: the underlying ITI capacity source still has no approved period semantics.
