# Phase 7 — KPI approval register and implementation backlog

**Status:** Draft decision register. No stakeholder approvals are implied.  
**Branch:** `main`

This register converts the repository's source-readiness audits into a decision queue. It is an engineering planning document, not an official KPI specification. No schema or API change is authorised by this register.

## Decision states

- **BLOCKED — definition:** meaning, counting grain, formula or qualifying event is unapproved.
- **BLOCKED — source:** authoritative source or accountable owner is unconfirmed/unconnected.
- **BLOCKED — policy:** evidence, identity, privacy, access, correction, retention or visibility is unresolved.
- **READY FOR DESIGN:** approved KPI contract and authoritative source are available for technical design; publication is not yet authorised.
- **READY FOR IMPLEMENTATION:** contract, source access, policy controls and acceptance criteria are approved.
- **IMPLEMENTED — NOT ACCEPTED:** code exists; stakeholder/operational acceptance remains.
- **ACCEPTED:** named authority, contract version, effective date and acceptance evidence are recorded.

No KPI below is marked approved or accepted.

## KPI decision register

### Physical progress

| KPI | Current repository evidence | Required decision/evidence | Owner to confirm | State |
|---|---|---|---|---|
| PHY-01 Civil works | No typed project/milestone source identified | Project/activity identity, progress grain, units, milestone semantics, evidence and period | DET/State PMU + works source owner | BLOCKED — source + definition |
| PHY-02 Equipment procurement/installation | No equipment lifecycle source identified | Distinguish ordered, received, installed, inspected and commissioned; asset identity/evidence | DET/State PMU + equipment source owner | BLOCKED — source + definition |
| PHY-03 Labs | Free-text ITI lab details only | Structured inventory, operational criteria, inspection/evidence and effective date | DET/State PMU + lab authority | BLOCKED — source + definition |
| PHY-04 Smart classrooms | No typed inventory/readiness source identified | Classroom identity, operational criteria, evidence and reporting grain | DET/State PMU + infrastructure owner | BLOCKED — source + definition |

Do not derive physical KPIs from generic submission counts, free text, AIP/SIP planning data or workflow status.

### Academic and training

| KPI | Current repository evidence | Required decision/evidence | Owner to confirm | State |
|---|---|---|---|---|
| ACD-01 Courses offered | Generic academic intake; no approved course catalogue/state | Course identity, active/offered rule, academic year, source and deduplication | DET/Academic MIS owner | BLOCKED — definition + source |
| ACD-02 Future-skills courses | Taxonomy/qualification unresolved | Approved taxonomy, course mapping/versioning and active-course rule | DET/curriculum authority | BLOCKED — definition |
| ACD-03 Trainers trained | Qualifying completion unresolved | Trainer identity/deduplication, qualifying programme, completion threshold and evidence | DET/training source owner | BLOCKED — definition + source |
| ACD-04 Admissions | Student MIS and cohort rules unresolved | Admission status, academic year/cohort, cancellation/transfer rules and privacy | Student MIS owner/DET | BLOCKED — source + policy |
| ACD-05 Training completion | Completion criteria/evidence unresolved | Eligible enrolment cohort, completion threshold, assessment/evidence and period | DET/Student MIS owner | BLOCKED — definition + source |

Keep `academic.student_capacity` separate; it is sourced from `itis.student_strength` and is not an academic outcome. `ACCEPTED` intake status does not prove KPI qualification.

### Industry and employment

| KPI | Current repository evidence | Required decision/evidence | Owner to confirm | State |
|---|---|---|---|---|
| IND-01 Apprenticeship | Generic apprenticeship intake exists | Opportunity/agreement/contract/enrolled/completed grain, participant identity, period and evidence | Apprenticeship source owner/DET | BLOCKED — definition |
| IND-02 OJT | Generic OJT intake exists | Participant vs activity count, hours, start/completion and unique trainee rules | OJT source owner/DET | BLOCKED — definition |
| IND-03 Industry exposure | Generic exposure intake exists | Activity vs participant measure, eligible activity and evidence | Industry engagement owner/DET | BLOCKED — definition |
| IND-04 Placements | Generic placement intake exists | Qualifying employment, verification, deduplication, duration and time window | Placement source owner/DET | BLOCKED — definition + policy |
| IND-05 Placement percentage | No approved numerator/denominator/cohort | Eligible completer cohort, numerator, denominator, exclusions, period and restatement | DET/placement source owner | BLOCKED — definition |
| IND-06 Industries engaged | Employer participation intake exists; identity/threshold unresolved | Unique employer identity and whether MoU, active engagement or actual contribution qualifies | Industry source owner/DET | BLOCKED — definition |

A `VERIFIED` industry row is a review state, not automatic proof of an official KPI event. Do not calculate IND-05 until numerator, denominator, cohort, deduplication and period are approved.

### Finance

| KPI | Current repository evidence | Required decision/evidence | Owner to confirm | State |
|---|---|---|---|---|
| FIN-01 Approved outlay | Internal ledger foundations; authoritative sanction source/owner unapproved | Sanction reference, scope, amount, date, source and reconciliation | Finance/DET | BLOCKED — source + policy |
| FIN-02 Funds released | Internal ledger foundations; release authority/source unapproved | Release reference, recipient, date, amount and reversal/correction rules | Finance/DET | BLOCKED — source + policy |
| FIN-03 Expenditure | Recognition basis unresolved | FMS/source and booked vs paid vs certified basis, project attribution and evidence | Finance/DET | BLOCKED — definition + source |
| FIN-04 Utilisation percentage | Candidate arithmetic not approved | Numerator/denominator, period, zero-release behaviour and rounding | Finance/DET | BLOCKED — definition |
| FIN-05 Balance | Meaning ambiguous | Decide unreleased allocation vs unspent release vs total available balance | Finance/DET | BLOCKED — definition |

AIP investment and SIP proposed/contribution values remain planning/registry indicators. Do not relabel them as FIN-01..FIN-03 or expose FIN-04/05 before approval.

## Cross-cutting approval checklist

For each KPI, record:
1. Named approving authority, accountable source owner and decision date.
2. Exact definition, formula/event qualification, grain, unit, numerator/denominator and exclusions.
3. Authoritative source, stable identity, versioning and ownership.
4. State → Cluster → ITI → Project attribution and any course/cohort/employer/participant rules.
5. Effective date, reporting period, academic/financial year, as-of semantics, late arrivals and freshness.
6. Completeness, duplicate handling, correction/restatement, reconciliation and missing-vs-zero behaviour.
7. Evidence requirements, reviewer authority and meaning of ACCEPTED/VERIFIED.
8. Public aggregate vs restricted detail, role/scope access, privacy and retention.
9. Approved contract version, effective date, test fixtures, reconciliation evidence and sign-off.

A discussion or meeting is not approval; record the actual decision and evidence.

## Engineering backlog

| Order | Work item | Exit condition / guardrail |
|---|---|---|
| P7-B01 | Maintain this KPI decision register | Each metric tracked independently; no inferred approvals |
| P7-B02 | Obtain source-owner and DET decisions | Completed decision package per KPI family |
| P7-B03 | Define versioned source contracts | Definitions, source identity, hierarchy, period and evidence approved |
| P7-B04 | Audit/connect authoritative feeds | Access, ownership, security and retention approved; reuse existing IntegrationSource/SyncRun/Record |
| P7-B05 | Build validated fact ingestion/review | KPI-specific qualification and correction semantics approved |
| P7-B06 | Build reporting projections/reconciliation | Test duplicates, corrections, null vs zero, periods, scope and sample exclusion |
| P7-B07 | Extend dashboard contract/aggregates | Approved disclosable fields; preserve payload compatibility |
| P7-B08 | Operational acceptance/sign-off | Named authority accepts versioned contract and reconciled results |

Suggested order: keep capacity reporting stable; obtain decisions by domain in parallel; implement one family at a time when its source contract is approved; publish only approved, disclosable aggregates. Defer cross-domain totals/rankings until period, hierarchy, completeness and freshness semantics align.

## Current disposition

- **Safe to retain:** sample-excluded registry counts, correctly labelled AIP/SIP planning indicators, ITI student capacity and state/cluster coverage.
- **Not safe to calculate:** PHY-01..PHY-04, ACD-01..ACD-05, IND-01..IND-06 and official FIN-01..FIN-05.
- **Not safe to infer:** zero from missing data; KPI qualification from ACCEPTED/VERIFIED; placement rate without approved cohort/denominator; freshness from catalogue generation time.
- **No schema/API change is authorised by this register.**

## Evidence documents

- `docs/phase-7/DASHBOARD_KPI_SOURCE_INVENTORY.md`
- `docs/phase-7/PHYSICAL_PROGRESS_REPORTING_READINESS.md`
- `docs/phase-7/ACADEMIC_INDUSTRY_OUTCOME_READINESS.md`
- `docs/phase-6/FINANCE_PHASE_6_CLOSEOUT_REVIEW.md`
- `docs/phase-6/PHASE_6_FINANCE_DATA_CONTRACT.md`

**Exit condition:** implement an individual KPI only after its definitions, authoritative source, policy controls, reporting context and acceptance criteria are approved and evidenced.
