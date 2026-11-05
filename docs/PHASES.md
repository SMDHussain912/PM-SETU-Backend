# PM-SETU Backend — Phases, Status & Continuation Guide

> **Purpose:** This is the hand-off document for continuing PM-SETU Backend work in a fresh ChatGPT/Cline session. Read this file before making changes. Update it whenever a phase, milestone, acceptance decision, or next action changes.
>
> **Repository:** [SMDHussain912/PM-SETU-Backend](https://github.com/SMDHussain912/PM-SETU-Backend)  
> **Working branch:** `main`  
> **Last documented:** 2026-11-06

---

## 1. How to resume in a new session

1. Clone or pull the repository:
   ```bash
   git clone https://github.com/SMDHussain912/PM-SETU-Backend.git
   cd PM-SETU-Backend
   # If already cloned:
   git pull origin main
   ```
2. Read this file completely: `docs/PHASES.md`.
3. Read the relevant phase documentation under `docs/phase-*/` before changing that phase.
4. Inspect the current code and Git history. Do not assume this document replaces code inspection.
5. Continue from **Current active work** below. Do not restart completed work or recreate existing models/modules.
6. Work directly on `main` unless the repository owner explicitly changes that instruction.
7. After implementation, run:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```
   Run migrations in the appropriate environment when a schema change requires them. Report actual command results; never claim checks passed without running them.

### Continuation prompt for Cline / a fresh assistant

> You are continuing the PM-SETU Backend project. First read `docs/PHASES.md`, `RoadMap.md`, and the relevant phase documents. Inspect the current `main` branch and recent commits before coding. Follow the phase statuses and guardrails in `docs/PHASES.md`. Continue the next unfinished task under **Current active work**; do not redo completed work, invent official requirements, or silently change approved contracts. Work directly on `main`. Implement in small, testable milestones, update documentation, and update `docs/PHASES.md` after each meaningful milestone. Run typecheck, tests, and build and report their real results.

---

## 2. Overall project status

This repository uses an **extended 10-phase implementation roadmap (Phases 0–9)** maintained during project delivery. The original NIC-oriented `RoadMap.md` also contains an earlier backend sequencing proposal (Phases 1–7). These are different planning views; do not confuse their phase numbers. This file is the current delivery status tracker.

| Phase | Workstream | Status |
|---|---|---|
| 0 | Requirements, source audit & foundation/access baseline | <strong>Complete</strong> |
| 1 | Foundation & access implementation | <strong>Complete</strong> |
| 2 | Organisation & operational workflows | <strong>Complete</strong> |
| 3 | Physical progress monitoring | <strong>Complete</strong> |
| 4 | Academic & training monitoring | <strong>Implementation complete; acceptance pending</strong> |
| 5 | Industry & employment | <strong>Implementation complete</strong> |
| 6 | Finance | <strong>Engineering implementation complete; operational acceptance pending</strong> |
| 7 | State PMU dashboard & analytics | <strong>In progress — source inventory and reporting contract baseline</strong> |
| 8 | Integrations & public portal | <strong>Not started</strong> |
| 9 | Security, testing & production readiness | <strong>Not started</strong> |

**Progress summary:** Phases 0–3 are complete, Phase 4's implementation is complete but external/operational acceptance remains, Phase 5 implementation is complete. Phase 6 engineering foundations are implemented; operational acceptance remains gated by Finance/DET decisions and evidence. Phase 7 has started with a source inventory and reporting-contract baseline; metric implementation remains dependent on approved sources and definitions. Phases 8–9 remain.

A phase marked implementation-complete is not automatically government-approved, production-accepted, or operationally verified.

---

## 3. Phase details

### Phase 0 — Requirements, source audit & foundation/access baseline
**Status: COMPLETE**

Purpose:
- Establish the project scope and trace requirements to the available PM-SETU/NIC source material.
- Audit the existing repository, data model, API surface, gaps, and implementation dependencies.
- Establish KPI/source mapping and a prioritised backlog.
- Identify assumptions, unresolved decisions, external dependencies, and acceptance evidence.

Key outputs:
- Requirements and architecture baseline.
- Gap register and implementation backlog.
- Dashboard KPI/source mapping.
- Explicit separation of source-backed requirements from proposed implementation details.

Completion note: The source audit and planning baseline are treated as complete. Continue to respect unresolved source ownership, KPI definitions, permissions, and operational approvals recorded in the project documents.

### Phase 1 — Foundation & access
**Status: COMPLETE**

Purpose:
- Establish the backend foundation, persistence conventions, API structure, authentication/access foundations, validation, and shared infrastructure.
- Keep implementation aligned with the repository's existing TypeScript, Express, Prisma, and PostgreSQL stack.
- Maintain testable module boundaries and consistent error/response handling.

Completion note: The foundation/access milestone is treated as complete in the project tracker. Inspect the actual code before altering auth, role, permission, or middleware behaviour.

### Phase 2 — Organisation & operational workflows
**Status: COMPLETE**

Purpose:
- Implement the organisation hierarchy and operational entities/workflows required by the programme.
- Support scoped data access and organisation-level operations.
- Preserve workflow transitions, validation, and auditability.

Completion note: The organisation and workflow implementation milestone is complete. Existing models, routes, services, and workflow contracts must be reused rather than recreated.

### Phase 3 — Physical progress monitoring
**Status: COMPLETE**

Purpose:
- Support physical implementation/progress monitoring and its reporting needs.
- Maintain traceable progress data and organisation-level drilldowns.
- Provide the backend foundations needed by later dashboards.

Completion note: Implementation is marked complete. Preserve the existing source definitions and progress semantics when extending reporting.

### Phase 4 — Academic & training monitoring
**Status: IMPLEMENTATION COMPLETE; ACCEPTANCE PENDING**

Purpose:
- Support academic, trainee, training, and related monitoring workflows.
- Provide the data and reporting foundations for training-related KPIs.

Outstanding acceptance dependencies:
- External DET/MIS/KPI/source approvals.
- Confirmation of authoritative source definitions and operational verification.
- Any outstanding acceptance evidence required by the programme stakeholders.

Important: Do not mark this phase fully accepted merely because code is implemented. Record the approving authority, evidence, and date when acceptance is obtained.

### Phase 5 — Industry & employment
**Status: IMPLEMENTATION COMPLETE**

Purpose:
- Support industry engagement, industry-linked programme records, and employment/placement outcome tracking.
- Provide structured backend data for industry and employment reporting.

Completion note: Implementation is marked complete in the project tracker. Continue to distinguish recorded programme data from verified external outcomes where source evidence is required.

### Phase 6 — Finance
**Status: ENGINEERING IMPLEMENTATION COMPLETE; OPERATIONAL ACCEPTANCE PENDING**

Purpose:
- Build safe finance data contracts and ingestion foundations.
- Track import batches, validation, preview, execution evidence, diagnostics, reconciliation, recovery, and controlled report delivery.
- Prepare the backend for finance reporting without presenting unverified planning data as actual financial performance.

Implemented milestones on `main` include:
- Finance import-batch metadata model and migration.
- Import-batch repository and query validation.
- Safe retry planning and selective CSV retry execution.
- Batch lifecycle projection and lifecycle tests.
- Batch validation and repository validation.
- Execution evidence requirements for executed batches.
- Finance CSV preview persistence workflow.
- Paginated import-batch row diagnostics.
- Execution reconciliation.
- Operational recovery planning and recovery evidence.
- Recovery report generation and JSON export.
- Recovery report delivery descriptor.
- Opt-in protected recovery HTTP route factory with HTTP-level integration coverage for authorization denial, successful download headers/body, missing reports, invalid IDs, and resolver error forwarding.

Latest route work:
- `src/modules/finance/finance.import-batch.recovery.routes.ts`
- `tests/finance-import-batch-recovery-routes.test.ts`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_HTTP_ROUTE.md`

The route factory is intentionally **not mounted** in `src/routes/index.ts`. It requires injected authorization and report resolution. Do not mount it until the Finance/DET access matrix and permission policy are approved.

#### Completed concurrency safeguard — source identity ingestion

The three finance ledger ingestion functions now use database conflict-safe insertion against their existing composite source identity constraints:
- `ingestApprovedOutlay()`
- `ingestFundRelease()`
- `ingestExpenditure()`

A successful insert returns `CREATED`; a concurrent source-identity conflict returns `DUPLICATE` with the canonical persisted row. Existing rows are not overwritten. Unit tests simulate the conflict outcome for all three record kinds. An opt-in PostgreSQL concurrency test has been added at `tests/finance-ledger-postgres-concurrency.test.ts`. It exercises concurrent same-source submissions for all three ledgers using only `PM_SETU_TEST_DATABASE_URL`; execution against a dedicated migrated test database remains to be confirmed by the user.

Commits:
- Implementation: `382debacaaeb049b2e232702b60c46d6163b95c3`
- Tests: `56b2e1602907d072df04f0038e7be423db31397b`
- Documentation: `5efdfe92c5cb7a728ddc3bb1ed26f385d6ecbd46`

#### Completed — finance import-batch concurrency audit

The repository/schema audit is documented in `docs/phase-6/FINANCE_IMPORT_BATCH_CONCURRENCY_AUDIT.md`. It confirmed transactional parent/row persistence, row-number uniqueness within a batch, no mutable lifecycle update path, and the missing attempt-level idempotency contract.

#### Implemented — import-attempt idempotency

The batch repository now requires a caller-generated UUID `idempotency_key`. It uses PostgreSQL conflict-safe insertion and reads the canonical batch by that key. Concurrent/repeated submissions using the same key converge on one batch; only the winning transaction persists row diagnostics. Reusing a key with any changed immutable request content (record kind, file hash, lifecycle, counters, actor/completion metadata, or row diagnostics) fails with `FINANCE_IMPORT_IDEMPOTENCY_KEY_CONFLICT`. The file hash remains non-unique so deliberate re-imports are allowed.

Schema/migration: `FinanceImportBatch.idempotencyKey` is unique; existing rows receive distinct backfilled UUIDs. The preview projection and persistence contract carry the key. Callers must generate it once per user-initiated attempt, retain it across transport retries, and generate a new one for deliberate re-imports.

Documentation: `docs/phase-6/FINANCE_CSV_PREVIEW_PERSISTENCE.md`.

**Verification update:** The user reports that local typecheck, tests, and build pass, including the repository-level same-key replay and mismatch tests. A separate opt-in PostgreSQL concurrency test has now been added at `tests/finance-import-batch-postgres-concurrency.test.ts`. It uses only the explicitly supplied `PM_SETU_TEST_DATABASE_URL`, generates a unique UUID per run, and cleans up that exact batch. It is skipped when the variable is absent; a skipped run is not live database verification. See `docs/phase-6/FINANCE_IMPORT_BATCH_POSTGRES_CONCURRENCY_TEST.md`.

**Application integration finding:** A repository-wide inspection of the finance module and route index found no current application/API caller of `persistFinanceCsvPreview`; the workflow is presently internal-only. No upload route is being introduced because Finance permissions, audit semantics, and correction/reversal policy remain unapproved. UUID generation/retention must be integrated when an approved orchestration surface is defined, rather than inventing a route now.

#### Latest lifecycle correction — selective execution

Selective retry batches now receive explicit lifecycle labels rather than being marked fully executed while valid rows remain unattempted. The lifecycle vocabulary distinguishes complete execution, complete execution with rejections, partial execution, and partial execution with rejections. Application validation and a database CHECK constraint enforce the expanded vocabulary and prevent complete-execution labels when valid rows remain. Migration: `20261106140000_finance_partial_execution_lifecycle`. Tests were updated to assert that selective retry is `PARTIALLY_EXECUTED`. Commits: `a2bbf924`, `636c5b33`, `611888cc`, `9378a25d`, `7a1f1e51`, `f9621860`, `e88e50ec`, `1f9adf4f`, and `5f3fe011`. User verification is required; do not claim this milestone passed until typecheck, tests, build, and migration deployment are verified.

#### Current active work — next task

Phase 6 engineering foundations are implemented, and the user reports that the latest typecheck/test/build checks passed. The migration deployment result is also user-confirmed as successful in the current conversation. The opt-in PostgreSQL concurrency tests still require explicit evidence that they ran with `PM_SETU_TEST_DATABASE_URL` pointing to a dedicated migrated test database; a skipped test is not live concurrency verification. Finance/DET source, accounting, permissions, audit, correction/reversal, and retention approvals remain external acceptance gates. Do not mount finance write/recovery routes or activate official derived KPIs until those gates are resolved.

Phase 7 has begun with `docs/phase-7/DASHBOARD_KPI_SOURCE_INVENTORY.md`. The current dashboard source inventory identifies registry counts, AIP investment planning values, SIP proposal/contribution values, ITI student capacity, and unavailable trainees/industry/placement/official-finance measures. Implemented: additive public `GET /api/v1/dashboard/contract` returns version `1.0.0` metric definitions, source descriptions, classifications, units, availability, supported aggregation levels, and official FIN-01..FIN-05 identifiers. It explicitly reports `data_as_of: null`, `reporting_period: null`, and `source_freshness: NOT_TRACKED`; `generated_at` is catalogue generation time only. Existing dashboard payloads remain unchanged. Unit and OpenAPI contract tests were added; user verification is pending. Next task: review and verify the endpoint locally, then add source-backed reporting context and scope/period filters only after authoritative period and ownership rules are approved. Add focused tests for unavailable versus genuine zero, sample-row exclusion, scope aggregation, and period boundaries. Do not invent KPI formulas, targets, or source completeness.

#### Finance data and policy guardrails

Official finance KPIs identified in the source mapping:
- FIN-01: Approved outlay.
- FIN-02: Funds released.
- FIN-03: Expenditure.
- FIN-04: Utilisation percentage.
- FIN-05: Balance.

Required drilldown: **State → Cluster → ITI / Project**. Reporting period: financial year / as-of date.

Do not misrepresent existing planning fields:
- AIP `investment_amount` and SIP `proposed_investment` / contribution fields are planning or registry indicators.
- They are **not** authoritative approved outlay, released funds, or expenditure.

Authoritative records still required or to be confirmed:
- Approved outlay: sanction/outlay reference, amount, date, and scope.
- Funds released: release order/reference, date, amount, and recipient.
- Expenditure: authoritative expenditure records or Finance Management System (FMS) source; clarify booked vs paid vs certified.
- Utilisation formula: expenditure ÷ funds released is only a candidate; Finance must approve formula and zero-release behaviour.
- Balance formula: Finance must clarify whether this means unreleased allocation, unspent release, or total available balance.

Other non-negotiable guardrails:
- Do not calculate or publish FIN-04 or FIN-05 until definitions are approved.
- Do not invent finance roles, permission codes, maker-checker rules, or access matrices.
- Do not enable public or HTTP finance write APIs before Finance approves source ownership, permissions, audit semantics, and correction/reversal policy.
- Do not silently destructively edit financial records. Correction/reversal policy is not yet approved.
- Use exact decimal handling for monetary amounts, stable source identifiers, and idempotent ingestion.
- Do not persist raw CSV payloads or normalized finance rows without an approved retention policy.
- Existing `IntegrationSource`, `IntegrationSyncRun`, and `IntegrationRecord` models already exist. Do not recreate them.
- CSV execution currently processes sequentially through injected handlers; each handler owns its transaction. Partial batch commits are therefore possible. Do not claim batch-level all-or-nothing semantics.
- Audit transaction/failure guarantees remain subject to the approved audit policy. Do not claim atomic audit guarantees without evidence.

Related documentation:
- `docs/phase-6/PHASE_6_FINANCE_DATA_CONTRACT.md`
- `docs/phase-6/FINANCE_PHASE_6_CLOSEOUT_REVIEW.md`
- `docs/phase-7/DASHBOARD_KPI_SOURCE_INVENTORY.md`

### Phase 7 — State PMU dashboard & analytics
**Status: IN PROGRESS — REPORTING CONTRACT AND ITI CAPACITY SCOPE IMPLEMENTED**

Implemented milestone 7.2 increment: added public read-only `GET /api/v1/dashboard/training/itis/:id` for the source-backed ITI student-capacity measure. It preserves null capacity as `NOT_AVAILABLE`, excludes sample ITIs, returns 404 for absent/sample IDs, and explicitly leaves reporting period and source freshness untracked. API schema, OpenAPI, source inventory, and identifier validation tests were added. Local typecheck/test/build verification is pending. — SOURCE INVENTORY AND REPORTING CONTRACT BASELINE**

Purpose:
- Build state-level PMU dashboard and analytical reporting on top of validated source modules.

Initial deliverable:
- `docs/phase-7/DASHBOARD_KPI_SOURCE_INVENTORY.md` records the current public dashboard endpoints, actual query sources, planning-versus-official KPI boundaries, unavailable data, and requirements for future metric contracts.
- This is a source inventory, not approval of KPI definitions or a claim that production data is complete.
- Provide the approved State → Cluster → ITI / Project drilldown.
- Consolidate physical, academic/training, industry/employment, and finance reporting where authoritative source definitions exist.
- Include reporting periods, as-of dates, source freshness, and data-quality/coverage context where required.

Dependencies:
- KPI definitions and source ownership must be confirmed.
- Finance KPIs must follow the Phase 6 guardrails.
- Dashboard figures must be derived from authoritative/approved data, not convenient proxy fields.
- Do not invent KPI formulas or imply source completeness.

### Phase 8 — Integrations & public portal
**Status: NOT STARTED**

Purpose:
- Implement approved external system integrations and data exchange.
- Complete public-facing portal APIs/content exposure as required by the approved scope.
- Use the existing integration architecture and ingestion records.
- Apply authentication, validation, idempotency, error handling, observability, and source-specific mapping.

Dependencies:
- Confirm system owners, API/file contracts, credentials/secrets handling, sync frequency, retry policy, and data retention.
- Confirm which records/fields are approved for public visibility.
- Do not connect directly to external production databases where the agreed architecture requires an integration/ETL boundary.

### Phase 9 — Security, testing & production readiness
**Status: NOT STARTED**

Purpose:
- Complete security and access-control review across all modules.
- Verify validation, authentication, authorization, audit behaviour, data handling, and error paths.
- Run unit, integration, migration, typecheck, build, and appropriate end-to-end tests.
- Verify operational configuration, deployment, monitoring, backup/recovery, and release readiness.
- Resolve critical/high findings and document residual risks.

Completion evidence should include:
- Test and build outputs from the target commit.
- Migration/deployment verification.
- Security findings and remediation evidence.
- Approved access matrix and operational ownership.
- Backup/restore and recovery verification.
- Production acceptance/sign-off where required.

---

## 4. Working agreements

- **Main branch:** Continue directly on `main`, as requested. Do not create feature branches unless explicitly asked.
- **Small milestones:** Implement one coherent change at a time; add or update tests and docs with it.
- **No duplicate foundations:** Inspect the schema, modules, routes, and integration layer before adding anything.
- **No invented policy:** If a government/Finance/DET decision is missing, document it as an open dependency rather than guessing.
- **Evidence-based status:** “Implemented”, “tested”, “operationally verified”, and “officially accepted” are different states.
- **Migrations:** Review generated SQL and migration ordering; never run a destructive production migration without explicit approval and a backup/recovery plan.
- **Security:** Do not expose internal finance recovery/report routes publicly or mount unapproved routes.
- **Documentation:** Every meaningful milestone should leave a short focused document in the relevant `docs/phase-N/` folder and update this tracker.
- **Tests:** User-reported test results should be recorded with the commit and commands only when the user provides the output.

## 5. Milestone log

| Date | Phase | Milestone | Evidence / note |
|---|---|---|---|
| 2026-11-06 | 7 | Added versioned dashboard reporting contract endpoint and metric catalogue | Commits `c61f988b`, `a598ffa1`, `44a48863`, `b655ba77`, `eab15c61`, `5e018100`, `efa9e90d`, `f32f1ed1`, `54c514b8`, `2fa5e5f4`, and `3383c525`. Contract/OpenAPI tests added; local verification pending. |
| 2026-11-06 | 7 | Started dashboard source inventory and reporting-contract baseline | Commit `e8d059f6`; records existing endpoint sources and data gaps without inventing KPI formulas or claiming production completeness. |
| 2026-11-06 | 6 | Bound finance import idempotency keys to the complete immutable request, not only file hash and record kind | Commits `386e1a12`, `16bc2690`, and `02597409`. Identical retries return the canonical batch; altered metadata or row diagnostics now conflict. User verification required. |
| 2026-11-06 | 6 | Enforced canonical evidence checklist semantics in recovery report JSON validation | Commits `4c80b7c2`, `1546d398`, and `f9ca6d49`. User verification required. |
| 2026-11-06 | 6 | Tightened recovery report export validation for status/batch consistency, duplicate references, and required evidence fields | Commits `6dba3d6f`, `f497bb28`, `fa593deb`, and `a22217f2`. User verification required. |
| 2026-11-06 | 6 | Added row-scoped discrepancy codes for duplicate and invalid row positions, allowing recovery cases to identify affected rows | Commits `ffdde680`, `6a0b7620`, `b35a1d8d`, and `8a65c646`. User verification required. |
| 2026-11-05 | 6 | Added HTTP-level integration tests for the opt-in finance recovery route factory | Commit `98aab40329205024b33f804e5c3f2a5475935ee5`; user reported the suite passed. Route remains intentionally unmounted pending Finance/DET access approval. |
| 2026-11-06 | 6 | Made outlay, release, and expenditure source-identity inserts conflict-safe; added duplicate-race unit coverage | Commits `382debac`, `56b2e160`, and `5efdfe92`. Live PostgreSQL multi-connection verification remains outstanding. |
| 2026-11-06 | 6 | Added caller-keyed finance import-batch idempotency, unique schema constraint, historical UUID backfill migration, and retry contract docs | Commits `2c1cee5`, `cdb7659`, `03e9c1e`, `7837bea`, `ded8215`, `72fbb92`, `ba6c180`, `0441961`, and `07033a4`. User reports local verification passes; real PostgreSQL multi-connection verification remains outstanding. |
| 2026-11-06 | 6 | Added opt-in PostgreSQL concurrent same-key import-batch test and dedicated test-database instructions | Commits `65e3600` and `3340144`. Test uses only `PM_SETU_TEST_DATABASE_URL`, unique UUIDs, and exact-key cleanup; user reports tests completed. |
| 2026-11-06 | 6 | Added opt-in PostgreSQL concurrent source-identity tests for outlay, release, and expenditure ledgers | Commits `1042a9e`, `ec49f40`, and `ba82b36`. User reports latest tests passed; confirm whether opt-in DB tests were executed with the dedicated test URL. |
| 2026-11-06 | 6 | Completed engineering close-out review of finance integrity, reconciliation, import recovery, and policy gates | Commit `fe84e28`; review records implemented controls, limitations, and acceptance evidence required before operational sign-off. |
| 2026-11-06 | 6 | Fixed cross-financial-year reconciliation selection and added predicate regression tests | Commits `abe06d3`, `f14c485`, `01b60ac`, and `f518b4f`. Latest changes require user verification. |
| 2026-11-06 | 6 | Tightened import batch row-count and CSV row-position integrity validation | Commits `48699fe` and `708533e`; latest local typecheck/test/build verification pending. |
| 2026-11-06 | 6 | Aligned selective retry row validation with CSV data-row numbering | Commits `f1ce59e` and `7beaeec`. The retry executor now explicitly rejects row 1; regression test added. User verification is pending. |
| 2026-11-06 | 6 | Added PostgreSQL defense-in-depth constraints for finance import-batch metadata and aligned repository row-position validation | Commits `40e882f`, `12dfd3d`, `b1d6f26`, `1a77cd6`, and `f766804`. Migration preflights existing metadata and aborts on inconsistent rows; local migration/typecheck/test/build verification is pending. |
| 2026-11-06 | 6 | Classified data rows when required CSV headers are missing, preserving consistent batch outcome counters | Commits `fab6fef`, `1d77aa2`, `3f507b4`, and `13ff2ec`; latest local typecheck/test/build verification pending. |\n| 2026-11-06 | 6 | Added an injectable transaction boundary and repository tests for same-key replay, immutable row diagnostics on replay, and key reuse conflicts | Commits `dc80e56` and `3c6d96a`. New tests still require local typecheck/test/build verification; they simulate transaction behaviour and are not a live PostgreSQL race test. |
| 2026-11-06 | 6 | Enforced exact `DECIMAL(18,2)` limits in CSV and service ingestion with boundary tests | Commits `94bbc9d`, `3ba0c18`, `4f6bda7`, `800de74`, `fe91b0e`, `aaba116`, and `5d5268c`. Latest local verification is pending; monetary validation avoids JavaScript floating-point conversion. |

---

## 6. Update checklist for future sessions

Whenever work progresses, update:
- [ ] Overall phase status table.
- [ ] Active phase's implemented milestones.
- [ ] Current active work / exact next task.
- [ ] Open approvals, risks, and external dependencies.
- [ ] Milestone log with date and commit SHA when available.
- [ ] Test/typecheck/build status only when supported by actual output.

**This file is the continuation anchor.** If the chat or plan limit interrupts work, clone/pull the repository, read this file, inspect the latest code, and continue from the next task listed above.

#### Verification follow-up — caller fixture correction

The first local verification after the idempotency migration confirmed that all three migrations applied and Prisma Client generated successfully. Typecheck emitted no error in the supplied log. The test run reported 196 passing and 2 failing: both failures were preview-persistence tests that had not been updated to supply the newly required UUID `idempotency_key`. Their fixtures are now updated in commit `a697b37`. The supplied output does not establish a successful full test run or completed build; rerun both before treating this milestone as verified.
