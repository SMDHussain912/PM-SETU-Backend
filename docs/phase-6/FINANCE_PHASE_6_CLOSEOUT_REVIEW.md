# Phase 6 Finance — engineering close-out review

**Review date:** 2026-11-06  
**Branch:** `main`  
**Status:** Engineering foundations implemented; formal acceptance remains blocked by external policy/source decisions and verification evidence.

## 1. Scope reviewed

This review inspected the current finance repository, ledger schema, ingestion functions, import-batch persistence/reconciliation, ledger reconciliation diagnostics, and the Phase 6 finance data contract.

The review is an engineering assessment. It is not a Finance/DET approval, accounting certification, security sign-off, or production acceptance.

## 2. Integrity controls present

### Ledger source identity

- Approved outlay, fund release, and expenditure each have a database unique constraint on `(sourceSystem, sourceRecordId)`.
- Ingestion uses conflict-safe `createMany({ skipDuplicates: true })` followed by a canonical read.
- Duplicate source identity returns the persisted row and does not overwrite its financial values.
- The ingestion unit tests simulate the duplicate-race branch.
- Opt-in PostgreSQL concurrency coverage now exists in `tests/finance-ledger-postgres-concurrency.test.ts`.

### Import attempt identity

- Finance import batches have a unique UUID idempotency key.
- Same-key replay resolves to the canonical batch and does not rewrite row diagnostics.
- Reusing the key for a different record kind or file hash is rejected.
- Opt-in PostgreSQL concurrency coverage exists in `tests/finance-import-batch-postgres-concurrency.test.ts`.
- Deliberate re-imports must use a new idempotency key.

### Import execution and recovery

- Execution metadata is reconciled against persisted counters and row-level diagnostics.
- Missing or mismatched metadata becomes an investigation case.
- Automatic retry is always disabled because row handlers may have committed independently.
- Recovery reporting is read-only and does not itself authorize correction or replay.
- The recovery HTTP route factory remains unmounted pending approved authorization policy.

### Ledger reconciliation

- Reconciliation emits warning-only findings for selected date, financial-year, and current ITI/cluster attribution inconsistencies.
- It does not calculate monetary totals, accepted expenditure, utilisation, or balance.
- Current ITI-to-cluster assignment may differ from historical assignment at sanction time; this is explicitly disclosed as a limitation.
- CSV export includes warning metadata only and neutralizes spreadsheet formula prefixes.

## 3. Reconciliation scope correction

The close-out review identified a query-selection gap: filtering release and expenditure rows only by their own financial year could omit a record whose linked outlay or release belonged to the requested financial year. That could hide the very cross-year inconsistency the reconciliation diagnostic is intended to flag.

The reconciliation predicates now include:
- releases whose own financial year **or linked outlay financial year** matches the requested year;
- expenditures whose own financial year, linked outlay year, **or linked release year** matches the requested year.

Scope and as-of-date filters remain applied. Pure predicate tests cover the cross-year inclusion and optional filters in `tests/finance-reconciliation-query.test.ts`.

## 4. Exact decimal boundary safeguard

The ledger columns use PostgreSQL `DECIMAL(18,2)`, which permits at most 16 integer digits and 2 fractional digits. Validation now applies that same boundary in both CSV mapping and the internal ingestion services:
- CSV values are checked as strings; no floating-point conversion is used for monetary validation.
- Direct service inputs use Decimal.js operations to reject non-finite, negative, over-scale, and out-of-range amounts before persistence.
- Boundary tests cover zero, the maximum accepted amount, excess fractional precision, negative values, and values beyond the integer limit.

Implementation: `src/modules/finance/finance.amount.validation.ts`; tests: `tests/finance-amount-validation.test.ts` and `tests/finance-csv-amount-boundaries.test.ts`.

## 5. Import metadata reconciliation safeguard

A further edge-case review found that persisted import-batch validation checked the row-diagnostic count against valid + invalid counters, but did not independently assert that the batch's declared total row count matched those counters. It also relied on persistence constraints rather than validating duplicate/invalid CSV row positions at the validation boundary.

Validation now rejects:
- `total_rows` values that differ from `valid_rows + invalid_rows`;
- duplicate row numbers within one batch;
- row numbers that are not safe integers or are before the first data row (row 2).

The same review exposed a related preview edge case: when required CSV headers were missing, mapping stopped at the header errors and left data rows unclassified. The mapper now emits a row-level unmappable diagnostic for every data row, so preview projection can account for all rows as invalid rather than creating a batch whose total row count disagrees with its outcome counters. Regression coverage is in `tests/finance-csv-mapping.test.ts` and `tests/finance-import-batch-lifecycle.test.ts`.

Regression coverage is in `tests/finance-import-batch-validation.test.ts`. This is import metadata integrity only; it does not change execution or accounting acceptance policy.

## 6. PostgreSQL import metadata constraints

The migration `20261106130000_finance_import_batch_integrity_constraints` adds database-level defense in depth for import metadata:
- allowed record-kind, lifecycle, and row-outcome vocabularies;
- non-negative batch counters;
- `total_rows = valid_rows + invalid_rows`;
- `attempted_rows = created_rows + duplicate_rows + rejected_rows`;
- CSV diagnostic row numbers start at row 2, after the header.

The migration performs a preflight check and aborts rather than silently rewriting any pre-existing inconsistent metadata. The repository boundary now also rejects row number 1, matching the lifecycle validator. These constraints protect technical import metadata only; they do not represent accounting acceptance.

## 7. Review conclusions and limitations

1. **No source correction/reversal workflow is approved.** The present duplicate behaviour is intentionally immutable; it is not a substitute for an approved correction, reversal, refund, or restatement process.
2. **No authoritative FMS/source contract is confirmed.** Production ingestion cannot be treated as live until Finance/DET confirms source ownership, interface, mapping, and source evidence.
3. **Expenditure recognition remains unresolved.** The stored recognition basis is source metadata only and must not be used as an accepted-expenditure rule without approval.
4. **FIN-04 and FIN-05 remain disabled.** Utilisation and balance formulas, denominator behaviour, and treatment of reversals are not approved.
5. **Finance access policy remains unresolved.** Do not mount finance write/recovery routes or expose ledgers publicly without the approved role/permission and visibility matrix.
6. **Audit failure semantics remain unresolved.** Do not claim financial write and audit entry are atomic until the required failure policy is decided and verified.
7. **Import execution may partially commit.** Handlers own their transactions; batch-level all-or-nothing semantics are not guaranteed.
8. **Retention is unresolved.** Raw CSV content and normalized financial row payloads are deliberately not retained by the import-batch metadata design.
9. **PostgreSQL concurrency test evidence must be recorded from the actual target environment.** The tests are opt-in and skipped when `PM_SETU_TEST_DATABASE_URL` is absent. A successful ordinary test run with the variable absent does not prove database concurrency behaviour.

## 7. Required acceptance evidence before Phase 6 can be called operationally accepted

- Finance/DET-approved authoritative source system and FMS interface/export contract.
- Approved outlay, release, and expenditure definitions and evidence requirements.
- Approved expenditure recognition basis.
- Approved utilisation and balance formulas, zero-denominator behaviour, and reversal/refund treatment.
- Approved financial-year, as-of-date, attribution, and historical restatement semantics.
- Approved correction/reversal and maker-checker process.
- Approved Finance access matrix, audit failure semantics, and public/internal visibility.
- Approved data-retention policy.
- Successful execution evidence for both opt-in PostgreSQL concurrency tests against a dedicated migrated test database.
- Reconciliation of representative source extracts against authoritative Finance records.
- Operational owner acceptance and recorded sign-off.

## 8. Next engineering action

After the user confirms the PostgreSQL test output from the dedicated test database, perform a final source-level review of:
- scope/as-of-date filtering in reconciliation queries;
- duplicate and mismatch behaviour in import reconciliation;
- exact decimal handling and amount boundary validation;
- test evidence and migration status.

Do not invent missing policy decisions to force Phase 6 to appear complete. Once the technical review and external acceptance gates are resolved, Phase 7 dashboard and analytics work can proceed using only approved KPI definitions and sources.
