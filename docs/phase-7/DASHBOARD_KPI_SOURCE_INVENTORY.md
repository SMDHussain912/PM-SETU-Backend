# Phase 7 — Dashboard KPI and source inventory

**Status:** Initial source inventory; implementation contract not yet approved  
**Working branch:** `main`  
**Purpose:** Establish an evidence-based dashboard baseline before adding new aggregations or public response fields.

This document records what the current backend actually reads, what it labels, and which data gaps remain. It does not create new KPI definitions or certify the accuracy of production data.

## 1. Existing dashboard API surface

The current public, read-only dashboard router exposes:

| Endpoint | Current output area | Current implementation |
|---|---|---|
| `GET /api/v1/dashboard/state` | State overview | Counts registry entities and sums AIP investment registry values |
| `GET /api/v1/dashboard/clusters` | Cluster summaries | Per-cluster ITI/AIP/SPV counts and AIP investment registry values |
| `GET /api/v1/dashboard/clusters/:id` | Cluster detail | Cluster registry metrics, ITI list, AIP list, SIP submitted/approved counts |
| `GET /api/v1/dashboard/finance` | Finance overview | AIP/SIP planning and registry indicators; official finance progress is explicitly unavailable |
| `GET /api/v1/dashboard/training` | Training overview | ITI `student_strength` capacity only |
| `GET /api/v1/dashboard/placements` | Placement overview | Informative source-not-established response |

These routes are intentionally public and read-only under the current project decision. Do not add write operations or expose finance ledgers through this router.

## 1A. Versioned reporting contract

The additive public endpoint `GET /api/v1/dashboard/contract` returns contract version `1.0.0` and a catalogue of metric identifiers, labels, classifications, units, source descriptions, availability states, supported aggregation levels, notes, and official finance KPI codes where applicable.

Important interpretation:
- `generated_at` is the time the catalogue response was generated; it is **not** a data as-of timestamp.
- `reporting_context.data_as_of` and `reporting_period` are null because source systems do not yet provide a common approved reporting timestamp/period.
- `source_freshness = NOT_TRACKED` explicitly means freshness is not currently measurable by this contract.
- `AVAILABLE` means the backend has a defined current source/query for the measure; it does not certify production completeness or accuracy.
- `NOT_AVAILABLE`, `SOURCE_NOT_CONNECTED`, and `DEFINITION_PENDING` are not zero values.
- Technical `metric_id` values are stable implementation identifiers, not new official KPI codes. Only FIN-01 through FIN-05 are marked with official KPI codes.

This catalogue is descriptive. It does not calculate metric values or change the existing dashboard response payloads.

## 2. Current source inventory

| Displayed field / measure | Current source | Interpretation and limitation |
|---|---|---|
| Cluster count | `clusters` | Registry count excluding `is_sample = TRUE` |
| Hub ITI count | `itis` where type = HUB | Registry count excluding sample rows |
| Spoke ITI count | `itis` where type = SPOKE | Registry count excluding sample rows |
| AIP count | `aips` | Registry count excluding sample rows; no unapproved status filter |
| SPV count | `spvs` | Registry count excluding sample rows |
| SIP submitted / approved | `sips.status` | Counts for the exact SUBMITTED / APPROVED statuses |
| Investment | `aips.investment_amount` | AIP registry/planning indicator, not approved outlay or expenditure |
| SIP proposed and contribution categories | SIP proposal/contribution fields | Planning indicators, not actual release or expenditure |
| Student capacity | `itis.student_strength` | Capacity/strength field; not trainees trained, assessed, or placed |
| Industries engaged | No established source in current dashboard query | Unavailable; do not infer from AIP count |
| Trainees | No established source in current dashboard query | Unavailable; do not infer from ITI capacity |
| Placements | No established source in current dashboard module | Unavailable; do not return fabricated zero |
| Official finance progress | Finance-approved source not connected | FIN-01..FIN-05 remain unavailable; do not substitute AIP/SIP values |

All registry queries currently exclude sample rows. This source inventory does not certify that the underlying production records are complete, current, or reconciled.

## 3. Finance reporting boundary

The official source mapping identifies FIN-01 through FIN-05:

- FIN-01 — Approved outlay
- FIN-02 — Funds released
- FIN-03 — Expenditure
- FIN-04 — Utilisation percentage
- FIN-05 — Balance

Required drilldown: State → Cluster → ITI / Project. Reporting context: financial year and as-of date.

Phase 6 provides internal ledger and ingestion foundations, but Finance/DET decisions are still required for authoritative source ownership, expenditure recognition, utilisation/balance formulas, correction/reversal handling, access control, audit semantics, and retention. The dashboard must continue to report official financial progress as unavailable until those decisions and authoritative data are approved.

Existing AIP investment and SIP proposed contribution values may remain visible only with their correct planning/registry labels. They must not be relabelled as FIN-01, FIN-02, or FIN-03.

## 4. Reporting contract requirements for future work

Before adding or changing a dashboard metric, record:

1. Metric identifier and exact display label.
2. Authoritative source table/system and source owner.
3. Inclusion/exclusion rules, including sample/test data handling.
4. Aggregation grain and hierarchy (State, Cluster, ITI, Project).
5. Reporting period and as-of-date semantics.
6. Null/unavailable behaviour and coverage limitations.
7. Whether the value is a count, capacity, planning indicator, verified outcome, or official KPI.
8. Reconciliation and acceptance evidence.
9. Public/internal visibility decision.

Do not turn missing data into zero unless the source contract explicitly establishes that zero is the correct value. Do not create a formula merely because the dashboard needs a number.

## 5. Next implementation sequence

1. Confirm source definitions and ownership for physical, academic/training, industry/employment, and finance metrics.
2. Define a versioned dashboard response contract that carries metric identity, reporting context, source freshness, and availability/coverage status without changing existing fields prematurely.
3. Add focused tests for null/unavailable versus genuine zero, sample-row exclusion, scope aggregation, and reporting-period boundaries.
4. Add only those aggregations supported by approved sources and definitions.
5. Keep the existing public dashboard read-only and preserve the Finance guardrails from Phase 6.

## 6. Explicit non-goals

- No new finance formulas.
- No use of AIP/SIP planning values as official financial performance.
- No inferred trainees, industries-engaged, or placement totals.
- No invented KPI targets, thresholds, or traffic-light statuses.
- No new public finance write or recovery endpoints.
- No claim of production data reconciliation or stakeholder acceptance.

## 7. Phase 7.2 — source-backed ITI reporting scope

Added the read-only endpoint `GET /api/v1/dashboard/training/itis/:id`.

- Scope: one non-sample ITI, identified by a positive integer registry ID.
- Current supported metric: `academic.student_capacity`, sourced directly from `itis.student_strength`.
- Parent context: ITI code/name/type/district and its cluster reference.
- If `student_strength` is null, the metric value remains null and availability is `NOT_AVAILABLE`; it is not coerced to zero.
- A missing or sample ITI returns the standard 404 response.
- The response explicitly retains `data_as_of: null`, `reporting_period: null`, and `source_freshness: NOT_TRACKED`.
- The endpoint does not claim enrolment, trainees trained, assessment, placements, or any time-bounded outcome.

This extends the existing State → Cluster → ITI reporting hierarchy only for the capacity metric whose source exists. It does not imply that every metric in the catalogue is available at ITI scope.

Financial-year filtering is intentionally not implemented: the ITI capacity source has no approved effective-date/reporting-period semantics. Finance KPIs remain gated by the Phase 6 Finance approvals.

## 8. Phase 7.2 — state and cluster capacity aggregation with coverage

Added the read-only endpoint `GET /api/v1/dashboard/training/reporting`.

The endpoint aggregates only the existing `itis.student_strength` capacity field and returns:
- State-level capacity and coverage.
- Cluster-level capacity and coverage.
- `total_itis`: number of non-sample ITI registry rows in scope.
- `itis_with_capacity`: number of rows with a non-null `student_strength`.
- `itis_without_capacity`: number of rows with a null `student_strength`.
- State-level `itis_without_reportable_cluster`: non-sample ITI rows with no cluster assignment or assigned only to a sample cluster.
- A separate `without_reportable_cluster` capacity and coverage breakdown exposes the capacity amount/counts excluded from cluster rows, allowing the state total to reconcile without silently dropping those ITIs.

Aggregation semantics:
- `SUM(student_strength)` is intentionally nullable. If no source rows have a capacity value, the aggregate is null and availability is `NOT_AVAILABLE`.
- A genuine numeric zero remains zero and is distinguishable through coverage counts.
- Cluster aggregation uses a left join so a non-sample cluster with no ITI records remains represented with zero coverage counts and a null capacity value.
- Sample ITIs and sample clusters are excluded.
- ITIs without a cluster are included in the state aggregate and surfaced in `itis_without_reportable_cluster`; they cannot be assigned to a cluster total without a source relationship.
- Reporting period, data-as-of timestamp, and source freshness remain explicitly untracked.

This endpoint is additive; existing `/training` and `/training/itis/:id` payloads are unchanged. It does not calculate trainees trained, enrolled students, or official academic outcomes.


## 9. Phase 7 — physical progress source-readiness audit

The repository audit is recorded in `docs/phase-7/PHYSICAL_PROGRESS_REPORTING_READINESS.md`.

- `iti_submissions` supports generic `INFRASTRUCTURE` and `MONTHLY_PROGRESS` report types with a generic JSON payload and submission workflow. It does not define typed physical KPI facts.
- `itis.infrastructure` and `itis.lab_details` are free-text profile fields, not structured progress/inventory sources.
- No dedicated civil works, equipment lifecycle, lab inventory, or smart-classroom reporting models/migrations were found.
- PHY-01 through PHY-04 therefore remain unavailable for dashboard aggregation. Generic submission counts, profile text, workflow approval state, AIP/SIP planning values, and fabricated zeroes are not acceptable substitutes.
- Implementation is gated on authoritative source ownership, metric/grain/unit definitions, lifecycle and operational criteria, evidence/review policy, reporting period/freshness, hierarchy, visibility, and acceptance evidence.


## 10. Phase 7 — academic and industry outcome readiness

The repository evidence and implementation gates are recorded in `docs/phase-7/ACADEMIC_INDUSTRY_OUTCOME_READINESS.md`.

- Academic source intake exists for ACD-01..ACD-05. `ACCEPTED` is an intake/review state, not proof that a record qualifies for an official academic KPI.
- Industry outcome intake exists for apprenticeship, OJT, industry exposure, placement, and employer participation record types. `VERIFIED` is an operational review state, not automatic KPI qualification.
- The existing academic summary and industry outcome summary are intake workflow counts, not official KPI aggregations.
- ACD KPI source/definition gaps and IND counting-grain, identity, evidence, period and placement-rate denominator gaps remain unresolved.
- No academic or industry KPI dashboard aggregation was added. Capacity remains separate from academic outcomes; placement percentage remains blocked on approved numerator/denominator and cohort rules.
