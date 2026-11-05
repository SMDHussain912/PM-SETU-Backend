# Finance import execution reconciliation

## Purpose

Execution handlers commit rows independently. A later failure to persist batch metadata must not be interpreted as proof that the financial writes did not happen.

The reconciliation helper compares an execution summary with a persisted technical batch snapshot and reports whether the metadata matches. Persisted row diagnostics cover every preview data row, whereas an execution summary contains only rows attempted in that execution. For selective retries, unattempted `VALID` rows and structurally `INVALID` rows are expected to remain in the persisted snapshot; only terminal execution outcomes (`CREATED`, `DUPLICATE`, `REJECTED`) must match execution results. The helper also checks preview valid/invalid counters and full persisted row coverage. It validates execution-summary counters against the row outcomes, rejects invalid data-row positions, and verifies persisted outcome totals against the preview's valid/invalid counters. Duplicate row positions and invalid positive row positions also produce row-scoped discrepancy codes (for example, `ROW_2_DUPLICATE` and `ROW_1_INVALID_POSITION`) so the recovery plan can identify the affected positions instead of reporting only a batch-wide integrity flag.

## Outcomes

- `MATCHED`: record kind, preview/attempt counters, full row coverage, attempted row outcomes, and target IDs match. Unattempted `VALID` and `INVALID` preview rows are permitted.
- `MISMATCHED`: one or more metadata differences are returned for investigation.
- `METADATA_MISSING`: execution evidence exists but no persisted batch snapshot was supplied.

## Safety rules

- Reconciliation is read-only and deterministic.
- It never reruns financial handlers or automatically retries rows.
- `automatic_retry_allowed` is always false because independently committed rows may already exist.
- A mismatch or missing batch requires controlled operational investigation and source-system reconciliation.
- This is technical metadata reconciliation, not accounting approval or acceptance.

## Source identity concurrency

Finance outlay, release, and expenditure ingestion now use the database's composite source identity unique constraint as the final idempotency authority. Each operation performs an insert with duplicate skipping, then reads the canonical row by `(sourceSystem, sourceRecordId)`.

- A successful insert is reported as `CREATED`.
- A conflict with an already-present source identity is reported as `DUPLICATE` and returns the canonical persisted row.
- The database unique constraint remains essential; the preliminary lookup is only a fast path and is not treated as a lock.
- No existing financial row is overwritten when a duplicate source identity is received.

The unit tests simulate the race outcome for all three record kinds. They validate the losing worker's duplicate classification, but do not replace a live PostgreSQL multi-connection concurrency test. Such an integration test remains a production-readiness verification item.
