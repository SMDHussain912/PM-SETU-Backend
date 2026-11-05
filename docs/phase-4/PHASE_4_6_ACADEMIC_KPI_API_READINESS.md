# Phase 4.6 — Academic KPI Aggregation & API Readiness

**Status:** KPI aggregation blocked; existing capacity endpoint explicitly distinguished from academic outcomes  
**Branch:** `main`  
**Scope:** ACD-01 to ACD-05

## Repository findings

The repository currently has no academic source records or academic KPI aggregation endpoints.

The existing public `GET /api/v1/dashboard/training` endpoint aggregates `itis.student_strength` and returns:
- `total_student_capacity`
- `hub_capacity` / `spoke_capacity`
- per-cluster `student_capacity` and ITI count

This is capacity/profile information only. It is not courses offered, future-skills courses, trainers trained, admissions, enrolments or training completed. The response types and SQL comments already identify this limitation. Do not relabel these values as ACD-01..ACD-05.

## ACD KPI implementation status

| KPI | Verified source in repository | Aggregation/API status |
|---|---|---|
| ACD-01 Courses | None; ITI trade arrays are descriptive only | Not implementable |
| ACD-02 Future skills courses | No approved taxonomy or offering source | Not implementable |
| ACD-03 Trainers trained | No trainer identity/development/completion source | Not implementable |
| ACD-04 Admissions | No Student MIS/admission events; student strength is not admissions | Not implementable |
| ACD-05 Training completed | No enrolment/completion/evidence source | Not implementable |

## API contract requirements before implementation

For each approved KPI, the source owner and DET must confirm:
1. KPI formula and counting grain.
2. Academic year/reporting period and effective-date rules.
3. State → Cluster → ITI → Course / Cohort / Trainer attribution and deduplication.
4. Source identifiers, source status mapping, freshness and reconciliation.
5. Correction/restatement handling and data-quality exclusion rules.
6. Publicly disclosable aggregate fields and operational access boundaries.

Only after these decisions and the approved source feeds exist should the backend add validated academic repositories, aggregation services, response schemas, OpenAPI paths and tests. Do not publish zeroes for missing sources; preserve explicit unavailable/not-yet-integrated semantics.

## Phase 4.6 disposition

No academic KPI endpoint, formula or database query was added because the required source data and approved definitions are absent. Existing capacity reporting remains separate and must be described as capacity, not academic progress.

**Exit:** ACD-01..ACD-05 aggregation is not safely implementable from current repository evidence. Next: Phase 4.7 consolidated verification and submission-readiness report, listing implemented work and external blockers without claiming missing features are complete.
