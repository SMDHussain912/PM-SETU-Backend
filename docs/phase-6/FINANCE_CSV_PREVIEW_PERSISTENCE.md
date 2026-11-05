# Finance CSV preview persistence

## Purpose

The internal `persistFinanceCsvPreview` workflow converts a parsed finance CSV preview into validated technical batch metadata and persists the batch with its row outcomes.

## Behaviour

1. The caller parses and maps the CSV with `previewFinanceCsv`.
2. The caller supplies the SHA-256 digest of the original uploaded bytes and optional actor metadata.
3. The workflow projects the preview through `buildFinanceImportBatchInput`.
4. The batch repository validates the projection and atomically persists the batch plus row outcomes.
5. The workflow returns the repository result.

## Safety boundaries

- This workflow is preview-only. It does not call the finance row execution handlers.
- It accepts no raw CSV payload and stores no normalized financial values.
- A structurally valid row is only marked `VALID`; it is not approved, reconciled, or posted.
- Invalid row diagnostics are retained as bounded technical metadata.
- The repository transaction covers the batch and its row outcomes, not any external financial system.
- No HTTP route, permission, maker-checker, accounting approval, or source-system authority is introduced.
- Execution remains a separate operation because each current row handler owns its transaction and partial commits are possible.
