# Finance import-batch persistence concurrency audit

**Date:** 2026-11-06  
**Scope:** Repository and schema audit of finance import-batch creation and lifecycle persistence.

## Findings

### 1. Batch creation is transactionally grouped

`createFinanceImportBatch()` creates the parent `FinanceImportBatch` row and its `FinanceImportBatchRow` diagnostics inside one Prisma interactive transaction. If row persistence fails, the transaction rolls back the parent as well. The row table also has a database unique constraint on `(batch_id, row_number)`, which prevents duplicate row numbers within one batch even if application validation is bypassed.

### 2. No mutable lifecycle update path exists

The inspected finance batch repository exposes creation only. The lifecycle module is a pure projection from preview/execution results; it does not write to the database. No batch update operation was found in the inspected repository modules. Therefore there is currently no repository-level stale lifecycle update race to fix, and no evidence supporting an optimistic-lock/version field or conditional state-transition API.

### 3. Duplicate parent creation is not currently idempotent

The schema has no unique request/idempotency key for `FinanceImportBatch`. `fileSha256` is indexed only indirectly through no uniqueness constraint, and the same file can legitimately be re-uploaded for a retry or a separate operational attempt. Making the file hash unique would therefore conflate file identity with import-attempt identity and could block legitimate attempts.

A client retry after an ambiguous timeout can create a second batch because each call inserts a new parent row. The current contract does not provide a stable attempt identifier with which the repository can safely distinguish a repeated request from a deliberate new attempt.

### 4. Row-level uniqueness does not solve cross-batch duplicate attempts

The `(batch_id, row_number)` constraint protects row identity only within one batch. It does not and should not prevent the same source file or row number from appearing in a distinct batch.

## Decision and guardrails

- Keep batch creation transactionally grouped as implemented.
- Do not add uniqueness to `fileSha256`; file identity is not a proven import-attempt identity.
- Do not add speculative lifecycle updates, optimistic locking, or state transitions when no update contract exists.
- Do not claim end-to-end exactly-once batch creation. Current parent creation is at-least-once under caller retries.
- Financial ledger source identity remains separately protected by its source-system/source-record unique constraints and conflict-safe ingestion.
- No raw CSV or normalized financial row payloads are added to batch metadata.

## Open decision required before idempotent batch creation

The caller/orchestration contract needs a stable import-attempt idempotency key, with a defined scope and reuse policy (for example, one key per user-initiated attempt, retained across transport retries but changed for a deliberate re-import). The owning workflow must define who creates it and whether it is safe to persist. Once confirmed, add a unique database constraint and an insert-or-return-existing repository operation, with PostgreSQL multi-connection integration coverage.

Until that contract is approved, duplicate parent creation on ambiguous caller retries is a documented limitation rather than something safely inferable from the file hash.
