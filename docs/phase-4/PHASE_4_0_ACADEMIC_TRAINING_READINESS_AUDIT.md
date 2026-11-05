# Phase 4.0 — Academic & Training Monitoring Readiness Audit

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Status:** Source audit committed; domain definitions and source-owner approvals remain open  
**Scope:** ACD-01 through ACD-05  
**Depends on:** Phase 2 organisation/operational data foundation; Phase 3 academic progress design and dashboard data audit

## 1. Objective

Establish the evidence-backed starting point for Phase 4 before adding academic/training tables, APIs, status vocabularies or KPI formulas. This phase implements the agreed academic and training monitoring workstream:

1. Courses introduced / offered
2. Future-skills courses
3. Trainers trained
4. Student admissions
5. Training completed

The wider programme also names apprenticeships and on-the-job training (OJT). In the Phase 0 KPI map these are industry outcomes (IND-01 / IND-02), not academic KPI IDs ACD-01 to ACD-05. They remain outside this Phase 4 academic slice and must be handled in the industry-outcomes workstream.

## 2. Source baseline

The Phase 0 KPI source-mapping workbook identifies the five academic measures and explicitly records that their formulas, taxonomies, cohort rules and source systems are incomplete. The Phase 3.3 academic design document expands those gaps into a conceptual design, but explicitly states it is a proposal rather than an approved data model.

The official architecture lists the academic dashboard labels:
- Courses Introduced
- Future Skills Courses
- Trainers Trained
- Admissions
- Training Completed

The source documents do not supply all operational definitions needed to safely implement these as verified KPIs.

## 3. Repository evidence inspected

### Existing ITI fields

The current `Iti` Prisma model contains:
- `existingTrades`
- `proposedTrades`
- `studentStrength`

These are ITI profile fields. They do not establish approved/current course delivery, a future-skills classification, admissions, trainee enrolment, or training completion.

### Existing model coverage

The inspected Prisma schema contains organisation, registry, SIP, CMS, user/RBAC, approval and audit models, including `Cluster`, `Iti`, `Aip`, `Spv`, `Sip`, `User`, `Role`, `Permission`, `Approval` and `AuditLog`.

No dedicated models were found for:
- canonical course/trade catalogue and versioned future-skills taxonomy;
- ITI course offerings or course delivery instances/cohorts;
- trainer identity references or trainer development/completion;
- academic years/cohorts and student admission events;
- student training enrolments, progress or verified completion;
- academic evidence and source-system reconciliation batches.

This is a source-repository audit only. It does not prove that no external Student/Training MIS exists or that no data exists in production systems.

## 4. KPI readiness matrix

| KPI | Official label | Repository evidence | Readiness |
|---|---|---|---|
| ACD-01 | Courses | Existing/proposed trade profile arrays only | Partial descriptive data; no verified offering KPI |
| ACD-02 | Future skills courses | No dedicated model or approved taxonomy evidenced | Not available |
| ACD-03 | Trainers trained | No trainer development/completion records evidenced | Not available |
| ACD-04 | Admissions | `studentStrength` is profile/capacity data, not admissions | Not available |
| ACD-05 | Training completed | No trainee enrolment/completion records evidenced | Not available |

Do not derive ACD-04 or ACD-05 from `studentStrength`. Do not count existing/proposed trade labels as approved, active or running courses.

## 5. Required decisions before operational schema/API implementation

| Decision | Required authority / owner (proposed) | Current status |
|---|---|---|
| Canonical course/trade source, codes and taxonomy | DET / academic MIS owner | Open |
| Meaning of courses offered: approved, active or actually running | DET / ITIs | Open |
| Future-skills qualifying taxonomy and versioning | DET | Open |
| Trainer identity source and duplicate resolution | DET / ITI personnel source owner | Open |
| What qualifies as trainer trained; evidence and period/cumulative grain | DET | Open |
| Authoritative Student MIS and privacy-preserving student identifier | DET / Student MIS owner | Open |
| Academic-year boundaries, admission state, cancellation/transfer/re-admission rules | DET / Student MIS owner | Open |
| Training completion criteria, result/evidence, reversals and reporting date | DET / Student/Training MIS owner | Open |
| Source interfaces, delivery schedule, reconciliation and correction policy | DET / NIC / MIS owners | Open |
| Operational access roles, personal-data retention and evidence access | DET / security/privacy owners | Open |

These are not optional implementation details. They change the meaning, privacy and correctness of the records and reported outcomes.

## 6. Design guardrails

1. Separate master data (course, taxonomy, ITI offering, trainer programme) from transactional events (admission, enrolment, progress and completion).
2. Preserve authoritative source identifiers and source provenance.
3. Keep approved, active, offered, running and completed as distinct concepts.
4. Never count a trainer as trained solely because they registered or partially attended unless the authority defines that as qualifying.
5. Do not infer academic year/cohort from the current date.
6. Preserve transfers, cancellations, re-admissions, corrections and restatements as auditable history.
7. Keep student/trainer personally identifiable data out of public dashboard responses.
8. Use approved API/file interfaces and reconciliation; do not connect directly to an external production database.
9. Exclude unvalidated, rejected, duplicate or stale source records from verified KPI aggregation.
10. Do not mix apprenticeship or OJT outcomes into ACD-05 training completion.

## 7. Proposed implementation sequence

This sequence is a technical work plan, not a claim of approved business definitions:

- **4.0 — Readiness audit:** repository/source baseline and decision register. (This document.)
- **4.1 — Academic domain contract:** canonical course, taxonomy, academic-year/cohort, identity-reference and source-provenance contracts; mark unresolved fields explicitly.
- **4.2 — Course catalogue and ITI offering:** only after course source and offering-state semantics are approved.
- **4.3 — Trainer development records:** only after trainer identity, programme qualification and completion evidence are approved.
- **4.4 — Admission and cohort records / MIS adapter:** only after authoritative Student MIS and admission counting rules are confirmed.
- **4.5 — Training enrolment and completion:** only after completion criteria, evidence and correction rules are approved.
- **4.6 — Academic KPI aggregation and API:** only after the five KPI definitions, periods and hierarchy grain are approved.
- **4.7 — Regression, access and reconciliation tests:** verify source provenance, deduplication, corrections, sample isolation, aggregate consistency and privacy boundaries.

If authoritative MIS interfaces already exist, prefer an approved adapter and reconciliation pipeline over duplicating a system-of-record. The sequence may be adjusted based on verified interface availability.

## 8. Phase 4.0 exit status

| Deliverable | Status |
|---|---|
| Phase 4 scope separated from apprenticeship/OJT industry KPIs | Complete |
| Existing Prisma model coverage inspected | Complete |
| ACD-01 to ACD-05 repository readiness assessed | Complete |
| Academic source-owner / definition decisions recorded | Open — requires authority input |
| Production academic schema or API | Not started; intentionally gated |
| External Student/Training MIS availability | Not verified |

**Phase 4.0 exit:** Readiness audit complete and committed. The next safe engineering slice is 4.1, defining a source-aware academic domain contract without inventing unapproved KPI rules or connecting to unverified external systems.
