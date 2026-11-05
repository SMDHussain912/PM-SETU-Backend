# PM-SETU Backend — Phases, Status & Continuation Guide

> **Purpose:** This is the hand-off document for continuing PM-SETU Backend work in a fresh ChatGPT/Cline session. Read this file before making changes. Update it whenever a phase, milestone, acceptance decision, or next action changes.
>
> **Repository:** [SMDHussain912/PM-SETU-Backend](https://github.com/SMDHussain912/PM-SETU-Backend)  
> **Working branch:** `main`  
> **Last documented:** 2026-11-05

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
| 6 | Finance | <strong>In progress</strong> |
| 7 | State PMU dashboard & analytics | <strong>Not started</strong> |
| 8 | Integrations & public portal | <strong>Not started</strong> |
| 9 | Security, testing & production readiness | <strong>Not started</strong> |

**Progress summary:** Phases 0–3 are complete, Phase 4's implementation is complete but external/operational acceptance remains, Phase 5 implementation is complete, and Phase 6 is active. Phases 7–9 remain after Phase 6.

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
**Status: IN PROGRESS**

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
- Opt-in protected recovery HTTP route factory, its initial tests, and documentation.

Latest route work:
- `src/modules/finance/finance.import-batch.recovery.routes.ts`
- `tests/finance-import-batch-recovery-routes.test.ts`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_HTTP_ROUTE.md`

The route factory is intentionally **not mounted** in `src/routes/index.ts`. It requires injected authorization and report resolution. Do not mount it until the Finance/DET access matrix and permission policy are approved.

#### Current active work — next task

Add meaningful HTTP-level integration tests for the recovery route factory:
1. Authorization denial (401/403 as supplied by the injected middleware) must prevent report resolution.
2. Successful authorized request returns the JSON report and expected download/cache headers.
3. Missing report returns 404.
4. Invalid batch ID returns 400.
5. Errors from the resolver are forwarded to Express error handling.

First inspect `package.json`, the existing route factory, and test conventions. Prefer existing dependencies or Node built-ins; do not add a dependency without need. Keep the router unmounted until access approval. Update the route tests and phase-6 documentation, then update this tracker.

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
- SIP proposed contribution is only a partial proxy for FIN-01 until sanction/outlay records are available.

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
- `docs/phase-6/FINANCE_CSV_PREVIEW_PERSISTENCE.md`
- `docs/phase-6/FINANCE_IMPORT_BATCH_ROW_PAGINATION.md`
- `docs/phase-6/FINANCE_IMPORT_EXECUTION_RECONCILIATION.md`
- `docs/phase-6/FINANCE_IMPORT_OPERATIONAL_RECOVERY.md`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_EVIDENCE_CHECKLIST.md`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_REPORT.md`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_REPORT_JSON_EXPORT.md`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_REPORT_DELIVERY.md`
- `docs/phase-6/FINANCE_IMPORT_RECOVERY_HTTP_ROUTE.md`

### Phase 7 — State PMU dashboard & analytics
**Status: NOT STARTED**

Purpose:
- Build state-level PMU dashboard and analytical reporting on top of validated source modules.
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
| 2026-11-05 | 6 | Finance import-batch lifecycle, validation, preview, diagnostics, reconciliation, recovery, JSON report delivery, and opt-in route factory implemented in successive commits | See Git history and `docs/phase-6/`. User reported the preceding milestone test suite passed; the latest route-factory HTTP integration coverage is still the next task. |

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
