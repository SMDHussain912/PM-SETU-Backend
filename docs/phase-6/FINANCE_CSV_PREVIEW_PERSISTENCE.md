# Finance CSV preview persistence

## Purpose

The internal `persistFinanceCsvPreview` workflow converts a parsed finance CSV preview into validated technical batch metadata and persists the batch with its row outcomes.

## Behaviour

1. The caller parses and maps the CSV with `previewFinanceCsv`.
2. The caller supplies the SHA-256 digest of the original uploaded bytes, a UUID idempotency key for this import attempt, and optional actor metadata. Generate the UUID once when the user starts an attempt; retain and reuse it for transport retries. Generate a new UUID for a deliberate re-import.
3. The workflow projects the preview through `buildFinanceImportBatchInput`.
4. The batch repository validates the projection and atomically persists the batch plus row outcomes.
5. The repository inserts the batch with conflict-safe `createMany(skipDuplicates: true)` against a unique `idempotency_key`, then reads the canonical batch. If the same key is reused with a different record kind or file hash, it fails with `FINANCE_IMPORT_IDEMPOTENCY_KEY_CONFLICT`. Existing row diagnostics are not rewritten on retries.
6. The workflow returns the repository result.

## Safety boundaries

- This workflow is preview-only. It does not call the finance row execution handlers.
- It accepts no raw CSV payload and stores no normalized financial values.
- A structurally valid row is only marked `VALID`; it is not approved, reconciled, or posted.
- Invalid row diagnostics are retained as bounded technical metadata.
- The repository transaction covers the batch and its row outcomes, not any external financial system.
- No HTTP route, permission, maker-checker, accounting approval, or source-system authority is introduced.
- Execution remains a separate operation because each current row handler owns its transaction and partial commits are possible.


## Idempotency contract

- `idempotency_key` is a caller-generated UUID scoped to one user-initiated import attempt.
- Reuse the exact key for retries caused by timeouts, dropped connections, or repeated delivery of the same request.
- Use a fresh key for an intentional re-upload/re-import, even when the uploaded file bytes are identical.
- The key is unique in PostgreSQL. Concurrent requests using the same key converge on one persisted batch; only the winning transaction writes row diagnostics.
- The file SHA-256 remains non-unique. It identifies file bytes, not an import attempt.
- Existing batches are backfilled with distinct UUIDs by the migration; no historical records are merged.
- The API/workflow caller must persist the key across retry attempts. Generating a fresh UUID for every HTTP retry defeats idempotency.
