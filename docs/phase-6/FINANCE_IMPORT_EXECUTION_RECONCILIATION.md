# Finance import execution reconciliation

## Purpose

Execution handlers commit rows independently. A later failure to persist batch metadata must not be interpreted as proof that the financial writes did not happen.

The reconciliation helper compares an execution summary with a persisted technical batch snapshot and reports whether the metadata matches.

## Outcomes

- `MATCHED`: counters, record kind, total rows, row outcomes, and target IDs match.
- `MISMATCHED`: one or more metadata differences are returned for investigation.
- `METADATA_MISSING`: execution evidence exists but no persisted batch snapshot was supplied.

## Safety rules

- Reconciliation is read-only and deterministic.
- It never reruns financial handlers or automatically retries rows.
- `automatic_retry_allowed` is always false because independently committed rows may already exist.
- A mismatch or missing batch requires controlled operational investigation and source-system reconciliation.
- This is technical metadata reconciliation, not accounting approval or acceptance.
