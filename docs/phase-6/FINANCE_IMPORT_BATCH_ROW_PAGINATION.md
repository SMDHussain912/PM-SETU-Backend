# Finance import batch row pagination

## Purpose

Finance import batches can contain many row-level diagnostics. The row query provides bounded pagination without loading the entire batch into memory.

## Contract

The internal query accepts:
- `batch_id`: positive safe integer identifying an existing batch
- `page`: positive, 1-based page number
- `page_size`: integer from 1 through 100

Rows are ordered deterministically by row number and then row ID. The response includes the selected items, total row count, page, page size, and total pages. A missing batch returns `FINANCE_IMPORT_BATCH_NOT_FOUND`.

## Safety boundaries

- Read-only metadata query; it does not expose raw CSV contents or normalized financial values.
- Does not change lifecycle, retry rows, or execute financial writes.
- No HTTP route or access policy is introduced; callers must remain behind the approved internal access boundary.
