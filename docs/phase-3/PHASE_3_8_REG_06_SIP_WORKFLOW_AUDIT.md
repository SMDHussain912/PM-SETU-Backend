# Phase 3.8 — REG-06 SIP Workflow Audit & KPI Contract

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Status:** Evidence audit complete; business/NIC confirmation required before REG-06 query changes  
**Depends on:** Phase 3.6 cross-domain readiness; Phase 3.7 registry KPI implementation  
**Scope:** SIP workflow state evidence, submitted/approved counting semantics, and implementation gates for REG-06

> **Approval boundary:** This document records repository evidence and identifies conflicts. It does not declare a new official workflow, approve a KPI formula, change SIP states, or modify dashboard behaviour. No production KPI query, migration, route, or API response is changed by this audit.

## 1. Objective

Prepare REG-06 (SIP submitted / approved) for a safe implementation by reconciling the workflow evidence already present in the repository. The KPI must not be implemented by treating every status string as an approved business definition.

## 2. Evidence inspected on main

| Source | Evidence | Interpretation / limitation |
|---|---|---|
| `prisma/schema.prisma`, `Sip` model | Documents seven states: `DRAFT`, `SUBMITTED`, `UNDER_SCRUTINY`, `REVISION_REQUESTED`, `RECOMMENDED`, `APPROVED`, `IMPLEMENTATION` | This is a repository schema contract, not proof of departmental approval or deployed production vocabulary |
| `src/modules/sips/sip.schema.ts` | `SIP_STATUSES` contains the same seven values | Used for schema validation; not a KPI counting contract |
| `src/modules/sips/sip.types.ts` | Describes the seven-state path and cites RoadMap §10 / Home KPI contract | Also contains a stale comment claiming no Prisma models/migrations exist; current repository has a Prisma model and migrations |
| `src/modules/sips/sip.service.ts` | SIP registry CRUD is separate from workflow transitions; only DRAFT records may be deleted | No dedicated transition service is present in this module |
| `src/modules/sips/sip.repository.ts` | CRUD reads/writes SIP registry data; status is not accepted in generic create/update input | Generic admin CRUD cannot directly change status |
| `tests/sip-schema.test.ts` | Verifies seven known states and rejects caller-supplied status in create/update | Validates input boundary, not transition rules or KPI counts |
| `docs/operational-workflow-contract.md` | Describes transitions including `REJECTED`, and `REVISION_REQUESTED -> SUBMITTED` | Conflicts with the seven-state schema list, which omits `REJECTED`; document labels itself a contract/direction, not completed implementation |
| `sql/sips/sip_queries.sql` | Describes seven states and explicitly defers transition endpoints | Contains stale statements that schema/models/migrations do not exist; do not use those statements as current evidence |

## 3. Material findings

### 3.1 Workflow vocabulary conflict

The schema, Zod status list and SIP type documentation list seven states and do not include `REJECTED`. The operational workflow contract includes `REJECTED` as a possible transition outcome. This is a material contract conflict.

**Do not** add `REJECTED` to the database/check constraint or application enum, or silently remove it from the workflow proposal, until NIC / the authorised workflow owner confirms the canonical vocabulary.

### 3.2 Transition implementation is not evidenced in the SIP module

The current SIP service supports registry CRUD and protects non-DRAFT records from deletion. Its comments explicitly separate workflow transitions from registry administration. No SIP transition controller/service/repository or immutable decision-history implementation was found in the inspected SIP module files.

The presence of a status column and validation enum does not establish that the workflow state machine is implemented.

### 3.3 “Submitted” and “approved” are not yet fully defined as KPI populations

The repository has status values `SUBMITTED` and `APPROVED`, and the dashboard has existing status-count logic. But REG-06 needs decisions on at least:

- Whether submitted means records currently in `SUBMITTED` only, or all records that have ever been submitted.
- Whether approved means currently in `APPROVED` only, or includes downstream `IMPLEMENTATION`.
- Whether a SIP can be revised and resubmitted, and whether the KPI counts SIPs, versions, or submission events.
- Whether rejected, returned, withdrawn, superseded or duplicate submissions are excluded, retained in history, or reported separately.
- Whether counts are current-state snapshots or period-based event counts.
- Whether sample records are excluded, consistent with the registry KPI slice.
- Whether cluster attribution uses the current relationship or the relationship at the time of submission/approval.

These are business decisions, not safe implementation assumptions.

## 4. Proposed decision table for owner confirmation

The following is a decision template, not an approved mapping.

| Decision | Candidate interpretation | Required confirmation |
|---|---|---|
| Submitted current-state count | Current status equals `SUBMITTED` | Confirm whether `UNDER_SCRUTINY`, `REVISION_REQUESTED`, `RECOMMENDED` and later states count as submitted |
| Approved current-state count | Current status equals `APPROVED` | Confirm whether `IMPLEMENTATION` remains included |
| Resubmission | Count one SIP or each submitted version/event | Confirm counting grain and duplicate/version policy |
| Rejection | Separate rejected population or exclude from submitted/approved | Confirm canonical `REJECTED` state and transition path |
| Reporting time | Current snapshot or period event count | Confirm as-of and reporting-period semantics |
| Attribution | Current cluster relationship or historical relationship | Confirm hierarchy attribution and reassignment treatment |
| Sample data | Exclude `is_sample = TRUE` | Confirm consistency with REG-01–REG-05 |
| Empty/unavailable source | Distinguish zero from unavailable | Confirm source freshness and publication behaviour |

## 5. Safe implementation plan after approval

Once the authorised owner supplies the canonical state machine and signed counting rules:

1. Update the SIP workflow contract and schema vocabulary together, only if the approved state list differs from the current seven-state contract.
2. Implement explicit server-side transition commands with current-state preconditions, role/delegation checks, required remarks, immutable decision history and audit events.
3. Add database constraints/migrations only for the approved canonical vocabulary and transition-history design.
4. Implement REG-06 repository aggregation from the approved counting grain and status mapping; exclude sample SIPs if confirmed by the approved KPI contract.
5. Add unit tests for the state mapping and database-backed integration tests for every approved workflow path, resubmission, rejection, sample exclusion and reporting-period boundary.
6. Reconcile representative counts with the workflow owner before marking REG-06 verified or publishing it.

## 6. Explicit non-goals

This audit does not:

- add or remove `REJECTED` from the canonical status list;
- invent transition permissions or approval delegation;
- create workflow-history tables or transition endpoints;
- change the dashboard's existing SIP counts;
- define current-state versus cumulative/event counting;
- claim NIC, DET or departmental approval;
- certify production data, deployment or dashboard access policy.

## 7. Exit status and required input

| Item | Status |
|---|---|
| Repository state vocabulary inspected | Complete |
| SIP CRUD and transition boundary inspected | Complete |
| Workflow documentation conflict identified | Complete — `REJECTED` discrepancy |
| REG-06 counting decisions identified | Complete — owner confirmation pending |
| Canonical workflow state machine approved | Pending NIC / authorised owner |
| Submitted/approved KPI counting contract approved | Pending DET / State PMU / authorised owner |
| REG-06 code implementation | Blocked pending the above approvals |
| Production reconciliation and publication | Not verified; separate G3–G5 gates remain |

**Phase 3.8 exit:** Technical audit complete. The next coding step is intentionally blocked until the canonical SIP workflow and REG-06 counting rules are confirmed. In parallel, work may proceed on unrelated approved tasks; this audit does not block the rest of Phase 3.

---

**End of Phase 3.8 — REG-06 SIP Workflow Audit & KPI Contract**
