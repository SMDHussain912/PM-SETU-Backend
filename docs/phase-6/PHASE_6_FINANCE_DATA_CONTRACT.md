# Phase 6 — Finance Management

**Branch:** `main`  
**Status:** Requirements mapped; implementation foundation in progress  
**Source baseline:** PM SETU Phase 0 Dashboard KPI Source Mapping workbook, Finance KPI rows FIN-01 through FIN-05; PM SETU Functional, Content & Technical Architecture, §20–22.

## 1. Scope

Phase 6 establishes a trustworthy financial data foundation for the PM-SETU financial progress view. The five required financial indicators are:

1. Approved outlay
2. Funds released
3. Expenditure
4. Utilisation percentage
5. Balance

Required drill-down: State → Cluster → ITI / Project. Reporting context: financial year and as-of date.

## 2. Existing implementation evidence

The current `GET /api/v1/dashboard/finance` endpoint aggregates:
- AIP `investment_amount`
- SIP `proposed_investment`
- SIP contribution fields (infrastructure, equipment, training, industry, government)

These are planning/registry indicators only. They are not evidence of formally approved outlay, actual fund releases, or accepted expenditure. The existing endpoint must not relabel these proxy values as the five official financial progress KPIs.

## 3. Required financial records

### 3.1 Approved outlay / sanction

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Sanction/order reference
- Sanction date
- Approved amount (INR)
- Financial year
- Scope attribution: State, Cluster, ITI and/or Project
- Source system and stable source record ID
- Created/updated audit metadata

### 3.2 Fund release

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Release order/reference
- Release date
- Released amount (INR)
- Recipient / implementing entity
- Link to the approved sanction/outlay record
- Financial year and scope attribution
- Source system and stable source record ID

### 3.3 Expenditure

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Voucher / bill / transaction reference
- Transaction date
- Amount (INR)
- Recipient / payee or implementing entity
- Link to sanction/outlay and, where applicable, release record
- Financial year and scope attribution
- Verification evidence/reference
- Source system and stable source record ID

The authoritative accounting basis is unresolved: booked, paid, certified, or another Finance-approved definition. Do not treat an unverified submitted claim as accepted expenditure.

## 4. Derived indicators — approval required

The official source names utilisation percentage and balance but does not define their formulas.

Candidate formulas for Finance owner approval only:
- Utilisation % = accepted expenditure ÷ funds released × 100
- Balance = funds released − accepted expenditure

Before implementation, approve:
- The numerator and denominator for utilisation
- Zero-release behaviour
- Whether balance means unreleased allocation, unspent released funds, or total available balance
- Treatment of reversals, refunds, cancelled releases, adjustments and restatements
- Financial-year boundaries and as-of/snapshot semantics

Until approved, these derived indicators must remain unavailable (not zero and not calculated).

## 5. Integration and data integrity

The architecture requires Source Systems → Integration / ETL → PM-SETU Data Repository → Dashboard API. External Financial Management System access must be through approved APIs or file contracts; no external system receives direct production database access.

Ingestion must preserve stable external IDs, source system, source timestamps, reconciliation status and audit history. Duplicate delivery must be idempotent. Corrections must be traceable; financial records must not be silently overwritten.

## 6. Security and authorization

Finance write permissions, maker-checker separation, approval authority, visibility of sensitive finance data, and public-vs-internal dashboard policy require confirmation from Finance / DET / State PMU. Do not invent role grants or expose financial ledgers publicly by default.

## 7. Open decisions / external dependencies

| Decision | Owner | Required before |
|---|---|---|
| System of record and official FMS interface / export contract | Finance / DET / NIC | Live ingestion |
| Approved outlay definition, grain and sanction evidence | Finance / Approving Authority | Outlay ledger acceptance |
| Release event definition, recipient and sanction linkage | Finance / DET | Release ledger acceptance |
| Expenditure basis: booked, paid, certified, or other | Finance / FMS owner | Expenditure acceptance |
| Utilisation and balance formulas, reversals and zero-denominator rules | Finance / DET | Derived KPI activation |
| Financial year and historical restatement policy | Finance / State PMU | Reporting |
| State / Cluster / ITI / Project attribution rules | DET / Finance | Drill-down |
| Maker-checker, roles and public/internal visibility | Finance / State PMU / NIC | Write API and publication |

## 8. Acceptance criteria

- Every financial amount is traceable to a source record and stable reference.
- Amounts are stored as exact decimal values, not floating-point values.
- Duplicate source records cannot create duplicate financial events.
- Outlay, releases and expenditure are separately represented.
- Scope and financial-year filters are deterministic.
- State and cluster aggregates reconcile to the underlying accepted records.
- Unavailable source data is represented as unavailable, never fabricated as zero.
- Utilisation and balance are not published until their formulas are approved.
- Write access is restricted by an approved Finance authorization matrix.
- Automated tests cover idempotency, validation, reconciliation, scope filtering, auditability and arithmetic boundaries.

## 9. Delivery boundary

This document establishes the Phase 6 engineering contract from the evidence currently available. It does not claim that a Finance-approved ledger schema, accounting policy, FMS interface, permission matrix or production financial dataset has been supplied. Those decisions are explicit gates, not assumptions to hide in code.


## Implementation boundary review (2026-11-05)

Repository inspection confirms the following constraints:

- `GET /api/v1/dashboard/finance` is part of the intentionally public, read-only dashboard router. Finance ledger writes MUST NOT be added to this router.
- The existing dashboard aggregates AIP investment and SIP proposed contribution fields. These remain planning/registry indicators and must not be relabelled as approved outlay, released funds, or expenditure.
- The audit module exposes an internal `recordAuditEntry` hook and supports a transaction client, but audit-write failure semantics are explicitly unresolved. A finance write service must not claim atomic audit guarantees until this policy is decided and tested.
- Existing role/permission mappings are documented as inferred / TO CONFIRM. No finance-specific permission matrix is approved in the inspected repository.
- The current Prisma schema has no authoritative finance ledger models.

### Safe implementation boundary

1. Keep the existing public finance dashboard read-only and preserve its current fields.
2. Implement future finance write/read operations behind a separate authenticated, permission-guarded finance module.
3. Store monetary values as fixed-precision decimal values; do not use floating-point storage for ledger amounts.
4. Preserve source references and record provenance so imported or manually captured financial records can be reconciled.
5. Do not expose official KPI totals until authoritative records and Finance-approved calculation rules exist.
6. Do not permit silent destructive edits to financial history. The final correction/reversal model must be approved before write APIs are exposed.
7. Do not claim audit atomicity until audit failure behavior is formally decided.

### Decisions required before enabling ledger writes

| Decision | Why it blocks production write behavior |
| --- | --- |
| Authoritative source system and source ownership | Determines whether records are entered in PM-SETU or imported from an FMS, and how reconciliation works. |
| Expenditure recognition basis | Finance must define whether expenditure means booked, paid, certified, or another officially accepted basis. |
| Finance access matrix | Determines who may create, view, correct, reconcile, and approve records. |
| Correction/reversal policy | Financial history must remain traceable; permitted correction behavior cannot be guessed. |
| Utilisation and balance formulas | FIN-04 and FIN-05 formulas are not approved; no calculated values may be published before sign-off. |
| Audit failure semantics | Determines whether a financial write and its audit entry must succeed or fail together. |

### Next engineering sequence

- Add finance-specific schema and migration only after confirming the minimum record contract and correction policy.
- Add repository/service validation and transactional audit behavior.
- Add guarded finance routes, using the approved permission matrix.
- Add integration tests for scope, provenance, decimal precision, audit behavior, duplicate source references, and dashboard non-substitution.
- Connect the authoritative source and publish KPI calculations only after Finance sign-off.


## SQL contract milestone (2026-11-05)

Added `sql/finance/finance_queries.sql` as a design-only SQL contract. It records the proposed logical entities for approved outlays, fund releases and expenditures; exact-decimal storage; source-key idempotency; scope attribution through the outlay relationship; read-query expectations; and required acceptance tests.

This is intentionally NOT a deployable migration. The SQL is clearly marked proposed / TO CONFIRM because the official Finance/FMS schema, expenditure recognition basis, scope rules, correction policy and authorization matrix remain outstanding. No finance tables or write APIs were created by this milestone.


## Prisma ledger foundation milestone (2026-11-05)

Added three Prisma models and a matching PostgreSQL migration:

- `FinanceApprovedOutlay` → `finance_approved_outlays`
- `FinanceFundRelease` → `finance_fund_releases`
- `FinanceExpenditure` → `finance_expenditures`

The migration uses `DECIMAL(18,2)`, non-negative amount constraints, stable unique source-system/source-record keys, financial-year indexes, and restrictive foreign keys to preserve referenced financial records. Cluster and ITI scope is attached to the approved outlay; releases and expenditures inherit it through that relationship.

This milestone creates storage only. No finance HTTP routes, permissions, seed data, official KPI calculations, or write operations have been enabled. The schema does not decide whether expenditure is booked, paid, or certified; `recognition_basis` is captured as source metadata and cannot be treated as an accepted-expenditure filter without Finance approval.

Before deployment, run Prisma validation/client generation and the full project verification suite. Before production writes, Finance must approve source ownership, correction/reversal policy, scope rules, and the authorization matrix.


## Internal ingestion layer milestone (2026-11-05)

Added an internal finance repository and service layer for the three ledger entities. The service currently provides:
- Source-key duplicate detection and immutable duplicate handling (existing source records are returned, not overwritten).
- Exact decimal validation and valid-date checks before persistence.
- Cluster/ITI existence checks and ITI-to-cluster consistency validation for approved outlays.
- Required approved-outlay linkage for releases and expenditures.
- Validation that an expenditure's optional release belongs to the same outlay.
- Transaction-wrapped persistence for each ingestion operation.

These functions are internal code only. No finance HTTP routes or permission grants were added. Audit writes are intentionally not claimed or performed by this milestone because the finance audit failure policy and authoritative audit-table deployment status still require confirmation. Concurrent unique-key conflicts return a conflict response; callers may retry to retrieve the already-ingested source record.

This milestone is implementation scaffolding, not production Finance approval. It does not calculate FIN-01 through FIN-05, apply a recognition-basis policy, implement corrections/reversals, or establish maker-checker controls. The Prisma migration and generated client still require local validation and the full test/build suite after pulling these commits.


## Read-only ledger query milestone (2026-11-05)

Added an internal read repository and service for approved outlays, fund releases and expenditure source records. Queries support financial-year filtering, optional cluster/ITI/project scope, as-of-date filtering, deterministic newest-first ordering and bounded pagination.

The read layer returns source records and pagination metadata only. It does not aggregate financial amounts, classify expenditure as accepted, or calculate utilisation/balance. It is not mounted as an HTTP route and does not introduce finance permissions. Query validation is covered by focused unit tests for required financial year, pagination bounds, scope identifiers, project references and as-of dates.

The read layer remains subject to local typecheck/test/build verification after pulling. Production exposure still requires the approved Finance authorization matrix and source-system policy.


## Reconciliation diagnostics milestone (2026-11-05)

Added an internal read-only reconciliation service that scans scoped finance records for review conditions:
- Release financial year differs from its linked approved outlay.
- Release date precedes the linked sanction date.
- Expenditure financial year differs from its linked outlay or release.
- Expenditure date precedes the linked sanction or linked release date.
- The ITI's current cluster assignment differs from the cluster attributed to the outlay.

Findings are warnings only. They do not mutate records, block ingestion, or assert that a source record is legally or financially invalid. The ITI check uses the current registry assignment and may not represent historical assignment at sanction time. Financial-year/date discrepancies are surfaced for owner review because official accounting and year-boundary rules remain to be confirmed.

The service reports scan counts and findings, not monetary totals. It does not classify expenditure as accepted and does not calculate FIN-01 through FIN-05. Focused unit tests cover clean records, chronology/year warnings, current ITI-cluster mismatch, and the deliberate absence of financial arithmetic.

No HTTP route or finance permission was added. Run the full local validation/typecheck/test/build suite after pulling before treating this milestone as verified.


## Reconciliation reporting milestone (2026-11-05)

Extended the internal read-only reconciliation service with an operational report projection:

- Warning counts grouped by reconciliation code and source record type.
- Stable finding identifiers derived from warning code, source record type, source record ID and related record ID.
- Paginated finding drill-down. Summary counts cover the full scoped scan; pagination applies only to the finding list.
- CSV export for the current page of warning metadata, with CSV quoting and spreadsheet-formula prefix neutralization.

The export intentionally excludes monetary amounts and full ledger payloads. Findings remain warnings, not confirmed accounting errors. No review acknowledgement, approval status, write route, permission grant, or reviewer identity has been introduced. Those workflows remain blocked on Finance/DET approval of ownership, authorization and audit policy.

The report remains an internal service and is not exposed through the public dashboard. It does not calculate financial KPIs or change ingestion behaviour. Run the full local validation, typecheck, test and build suite after pulling this milestone.


## CSV import preparation milestone (2026-11-05)

Added a bounded, pure CSV parser for preparing finance source imports. It supports quoted fields, commas and escaped quotes, CRLF/LF line endings, UTF-8 BOM removal, required-header checks, duplicate/empty-header rejection, row/column consistency checks, and configurable byte/row limits. It rejects malformed quoting and NUL characters and preserves source row numbers for actionable validation feedback.

This is a parsing utility only. It does not map untrusted CSV strings into Prisma decimals/dates, persist finance records, overwrite existing source identities, or establish an import endpoint. Record-kind-specific mapping, row-level domain validation, import batch persistence, authorization and audit semantics remain separate implementation gates. The parser is covered by focused tests.


## Finance CSV mapping and preview milestone (2026-11-05)

Added record-kind-specific CSV mapping for approved outlays, fund releases and expenditure. The mapper checks required columns and values, non-negative fixed-scale decimal strings (up to two fractional digits), real ISO calendar dates, positive safe integer linkage IDs, and duplicate source identities within the same file. Valid rows retain source row numbers and normalized string values; invalid rows receive field-level error codes/messages.

Added a non-persistent preview orchestrator that combines bounded CSV parsing and row mapping. It reports total, valid and invalid row counts, row-level diagnostics, and file-level parse failures. Its `accepted_for_review` flag means only that the file passed structural validation; it is not an accounting approval, authorization to post, or proof of source authority.

No import batch tables, finance write endpoint, automatic persistence, source-system authority, or correction workflow were introduced. Cross-record checks against existing database IDs and final decimal/date conversion remain for a separately authorized import execution stage.


## Internal CSV execution coordinator (2026-11-05)

Added an internal coordinator that consumes a validated CSV preview, converts row strings into typed finance ingestion inputs, and dispatches rows through explicitly injected persistence handlers. It returns per-row CREATED, DUPLICATE or REJECTED outcomes with source row numbers and record IDs where available. Invalid preview rows are not dispatched.

Execution is sequential and each handler owns its transaction. Earlier successful rows are not rolled back when a later row fails; the result explicitly reports that partial commit is possible. This is not an HTTP endpoint and does not grant permissions or create a batch table. Structural validation is not Finance approval. Operational exposure remains blocked on Finance approval of source ownership, access control and audit policy, including the acceptable batch transaction model.

## Import batch tracking milestone (2026-11-05)

Added finance-specific batch and row-outcome storage for the CSV ingestion workflow:

- A batch records the record kind, SHA-256 file fingerprint, technical lifecycle, row counters, creator reference and timestamps.
- Per-row records preserve source row number, technical outcome, optional target ledger record ID, and bounded error details.
- Database constraints enforce positive row numbers and unique row positions within a batch.
- This is operational tracking only. Lifecycle/outcome values do not represent Finance review, approval, or accounting acceptance.

**Data-retention boundary:** uploaded CSV bytes and normalized financial row payloads are not persisted. This avoids silently introducing a retention policy for sensitive financial source data. Consequently, retrying rejected rows from stored batch data is not supported yet; it requires an approved secure payload-retention policy or re-upload workflow.

No HTTP endpoints, permission grants, audit guarantees, automatic ledger execution, or official KPI calculations are added by this milestone. Validate the Prisma schema/client and full test/build suite locally after pulling.

## Import history and safe re-upload milestone (2026-11-05)

Added an internal paginated batch-history query with filters for record kind, technical lifecycle and creation-date range. Batch detail retrieval returns ordered row outcomes. Pagination is bounded to 100 rows per page, with deterministic newest-first ordering.

Added a pure retry planner for re-uploaded CSV files. It requires the SHA-256 fingerprint of the new upload to match the original batch exactly, validates the new preview, and selects only rows previously marked REJECTED that are still structurally valid. Previously created, duplicate, invalid, and other rows are skipped. A changed file is rejected to prevent row-number drift from replaying the wrong financial record.

**Execution boundary:** this milestone produces a retry plan only; it does not execute rows, reconstruct missing payloads, or add an HTTP route. The caller must re-upload the exact original file. Finance authorization, audit failure semantics and a secure retained-payload policy remain unresolved. Rejected rows that are not valid in the re-uploaded preview are not retried.
