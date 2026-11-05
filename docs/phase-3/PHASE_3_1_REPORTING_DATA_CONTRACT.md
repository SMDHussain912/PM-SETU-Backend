# Phase 3.1 — Dashboard Reporting Data Contract

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Contract version:** Draft 0.1  
**Status:** Technical draft — departmental/source-owner approval pending  
**Depends on:** Phase 3.0 Dashboard Data Audit  
**Scope:** KPI semantics, source ownership, reporting periods, provenance, data quality, visibility, aggregation and integration contracts.

> **Approval notice:** This document is a proposed technical contract. It does not claim approval by DET, NIC, State PMU, Finance, ITIs, or external MIS owners. Items marked **PENDING APPROVAL** must not be treated as authoritative business rules or implemented as real outcome KPIs until approved.

## 1. Contract objectives

The dashboard must present trustworthy implementation monitoring information, not merely aggregate whichever fields happen to exist.

This contract establishes a common agreement for each dashboard measure:

1. What the measure represents.
2. What counts as one record or event.
3. Which source is authoritative.
4. Who owns and validates the source.
5. Which reporting period applies.
6. How missing, late, rejected or stale data is represented.
7. Which audience may see the result.
8. Which hierarchy levels support drill-down.

The official integration architecture remains:

`Source systems → Data integration / ETL → PM-SETU data repository → Dashboard API → Web dashboard`

Dashboard APIs must read from the PM-SETU reporting repository. They must not fan out directly to multiple external production databases at request time.

## 2. Contract status vocabulary

| Status | Meaning |
|---|---|
| DRAFT | Proposed technical definition; not approved |
| PENDING_APPROVAL | A named authority or source owner must confirm the rule |
| APPROVED | Explicit approval recorded with approver, date and version |
| IMPLEMENTED | Approved contract has been implemented in code |
| VERIFIED | Tests and source reconciliation demonstrate the implementation behaves as contracted |
| SUSPENDED | Metric is temporarily withheld because its source or quality is not trustworthy |

No KPI in this draft is marked APPROVED. Existing registry fields and queries are evidence of technical availability, not departmental approval.

## 3. Shared KPI contract

Every KPI must have a maintained contract record containing these logical attributes. This is a **conceptual contract**, not yet a database migration or public API response schema.

| Attribute | Meaning | Approval status |
|---|---|---|
| `kpi_id` | Stable identifier from the Phase 0 mapping | Existing mapping identifier |
| `name` | Official display name | Use official terminology |
| `definition` | Exact business meaning and inclusion/exclusion rules | PENDING APPROVAL per KPI |
| `unit` | Count, currency, percentage, hours, milestone state, etc. | PENDING APPROVAL per KPI |
| `numerator` / `denominator` | Formula components where applicable | PENDING APPROVAL; omit when not applicable |
| `aggregation` | Count, sum, distinct count, ratio, latest state, etc. | PENDING APPROVAL per KPI |
| `source_system` | Authoritative source system or PM-SETU module | PENDING source-owner confirmation |
| `source_owner` | Responsible authority/team for the source | Proposed owner only until confirmed |
| `validation_owner` | Role/team accountable for data validation | PENDING APPROVAL |
| `reporting_period` | Snapshot, month, quarter, financial year, academic year or event date | PENDING APPROVAL per KPI |
| `scope_dimensions` | Supported hierarchy dimensions | PENDING APPROVAL |
| `refresh_expectation` | Expected source delivery/update cadence | PENDING source-owner agreement |
| `visibility` | Public aggregate or authenticated internal data | PENDING security/departmental approval |
| `quality_rules` | Completeness, validity, uniqueness, reconciliation and evidence rules | PENDING per source |
| `effective_from` | Date this approved definition becomes applicable | Set only after approval |
| `contract_version` | Version of the approved definition | Increment on approved semantic change |

A KPI must not be released as a verified metric if its definition, authoritative source, reporting period, or visibility is unresolved.

## 4. KPI contract register

### 4.1 Programme coverage and SIP progress

| ID | Measure | Draft semantic definition | Current source evidence | Proposed owner | Period | Status / decision |
|---|---|---|---|---|---|---|
| REG-01 | Clusters | Count of registered cluster records in the approved programme scope | `clusters.id` | DET / State PMU | As-of snapshot | PENDING APPROVAL: active/inactive inclusion |
| REG-02 | Hub ITIs | Count of registered ITIs classified as Hub | `itis.id`, `itis.type` | DET / Cluster Admin | As-of snapshot | PENDING APPROVAL: authoritative type and status filters |
| REG-03 | Spoke ITIs | Count of registered ITIs classified as Spoke | `itis.id`, `itis.type` | DET / Cluster Admin | As-of snapshot | PENDING APPROVAL: authoritative type and status filters |
| REG-04 | AIPs | Count of registered Anchor Industry Partners | `aips.id`, `aips.status` | DET / State PMU | As-of snapshot | PENDING APPROVAL: registered vs active/approved/participating |
| REG-05 | SPVs | Count of registered Special Purpose Vehicles | `spvs.id`, `spvs.status` | DET / State PMU | As-of snapshot | PENDING APPROVAL: registered vs active/approved/operational |
| REG-06 | SIP submitted / approved | Count of SIP records grouped by an approved canonical workflow status | `sips.id`, `sips.status` | DET / Approving Authority | As-of snapshot | PENDING APPROVAL: canonical labels, transition semantics and status counting |

**Draft aggregation notes:**

- REG-01 to REG-05 are candidate distinct registry-record counts. The exact treatment of inactive, archived, duplicate or out-of-scope records must be approved.
- REG-02 and REG-03 use the current repository discriminator values `HUB` and `SPOKE`; authoritative code ownership remains to be confirmed.
- REG-06 must use approved canonical workflow states. Do not silently map or combine states. The current endpoint's SUBMITTED/APPROVED counts are implementation evidence only.
- Registry counts are point-in-time snapshots; do not present them as implementation progress or operational readiness.

### 4.2 Physical progress

| ID | Measure | Draft semantic definition | Required authoritative source | Proposed owner | Period | Status / decision |
|---|---|---|---|---|---|---|
| PHY-01 | Civil works | Civil-work project/milestone status or completion measure | Approved civil-work project and milestone records with evidence | ITI / Cluster Admin; DET validates | Reporting period TBD | PENDING APPROVAL: metric form, unit, milestone weights/formula and evidence |
| PHY-02 | Equipment procurement / installation | Equipment progress separated into approved lifecycle stages | Equipment register plus procurement, receipt, installation and commissioning evidence | ITI / Cluster Admin; DET validates | Reporting period TBD | PENDING APPROVAL: stage model and whether separate KPIs are required |
| PHY-03 | Labs | Lab inventory and approved readiness/operational status | Structured lab inventory and commissioning/functional evidence | ITI; DET validates | Reporting period TBD | PENDING APPROVAL: lab definition and operational criteria |
| PHY-04 | Smart classrooms | Classroom inventory and approved readiness/functional status | Structured classroom inventory and functional evidence | ITI; DET validates | Reporting period TBD | PENDING APPROVAL: minimum definition and operational criteria |

No percentage, count, completion weighting or operational state is prescribed here. The existing free-text `itis.lab_details` must not be used as a verified lab count.

### 4.3 Academic progress

| ID | Measure | Draft semantic definition | Required authoritative source | Proposed owner | Period | Status / decision |
|---|---|---|---|---|---|---|
| ACD-01 | Courses | Count of courses/trades that meet an approved operational/active definition | Approved course/trade master and ITI offering records | ITI; DET validates | Academic year / reporting period TBD | PENDING APPROVAL: approved vs active vs actually running |
| ACD-02 | Future-skills courses | Count of offerings classified under an approved future-skills taxonomy | Approved taxonomy, course offering and delivery records | ITI / DET | Academic year / reporting period TBD | PENDING APPROVAL: taxonomy and qualifying course criteria |
| ACD-03 | Trainers trained | Count of unique trainers meeting approved training-completion criteria | Trainer registry and verified trainer-development completion records | ITI / DET | Reporting period TBD | PENDING APPROVAL: unique person rule, completion and cumulative vs period count |
| ACD-04 | Admissions | Count of students admitted under approved admission and cohort rules | Authoritative Student MIS or verified admission transactions | ITI / DET; Student MIS owner | Academic year | PENDING APPROVAL: admitted status, duplicates, transfer and cohort rules |
| ACD-05 | Training completed | Count of trainees completing training under approved course/cohort rules | Authoritative Student/Training MIS or verified enrolment/completion records | ITI / DET; source MIS owner | Academic year / reporting period TBD | PENDING APPROVAL: completion, date, cohort and repeat rules |

The current `itis.student_strength` field is not an admissions or training-completion source. Existing/proposed trade arrays are not proof of active delivery.

### 4.4 Industry outcomes

| ID | Measure | Draft semantic definition | Required authoritative source | Proposed owner | Period | Status / decision |
|---|---|---|---|---|---|---|
| IND-01 | Apprenticeships | Count of the approved apprenticeship unit (opportunity, contract, enrolled apprentice or completed apprentice) | Authoritative Apprenticeship MIS or verified apprenticeship records | ITI / DET; Apprenticeship MIS owner | Reporting period TBD | PENDING APPROVAL: counting unit and lifecycle point |
| IND-02 | OJT | Approved measure of OJT participation, hours, starts or completions | OJT programme, employer, trainee participation and completion records | ITI / Employer; DET | Reporting period TBD | PENDING APPROVAL: unit and completion semantics |
| IND-03 | Industry exposure | Approved count of exposure activities and/or participating trainees | Industry exposure events and attendance/evidence records | ITI / Cluster Admin | Reporting period TBD | PENDING APPROVAL: event count vs participant count |
| IND-04 | Placements | Count of unique trainees meeting an approved employment-verification standard | Authoritative Placement MIS or verified placement records | ITI / DET; Placement MIS owner | Placement year / academic year TBD | PENDING APPROVAL: employment evidence, duplicates and time window |
| IND-05 | Placement percentage | Approved placement numerator divided by approved eligible-completer denominator | Placement source plus authoritative eligible-completer source | DET / Placement MIS owner | Cohort and academic year | PENDING APPROVAL: numerator, denominator, exclusions and formula |
| IND-06 | Employer participation | Count of employers meeting an approved active-participation criterion | Employer master and verified participation links to programme activities/outcomes | DET / ITI / industry partner owner | Reporting period TBD | PENDING APPROVAL: MoU vs actual engagement/contribution |

No placement percentage may be computed until IND-04 and the eligible-completer denominator are both approved and reconciled. An MoU alone must not be assumed to mean active participation unless the authority explicitly defines it that way.

### 4.5 Financial progress

| ID | Measure | Draft semantic definition | Required authoritative source | Proposed owner | Period | Status / decision |
|---|---|---|---|---|---|---|
| FIN-01 | Approved outlay | Amount formally approved/sanctioned for a defined scope and period | Authoritative sanction/outlay records with reference and scope | Finance / DET / Approving Authority | Financial year; as-of date | PENDING APPROVAL: sanctioned amount, revisions, scope and grain |
| FIN-02 | Funds released | Amount formally released under an approved release event | Authoritative release transactions and release order/reference | Finance / DET | Financial year; as-of date | PENDING APPROVAL: release event and recipient/scope rules |
| FIN-03 | Expenditure | Amount recognised under an approved accounting/verification basis | Authoritative Finance Management System or accepted expenditure records | Finance / ITI; FMS owner | Financial year; as-of date | PENDING APPROVAL: booked vs paid vs certified/accepted |
| FIN-04 | Utilisation percentage | Approved ratio using the approved expenditure and financial denominator | Reconciled release/outlay and expenditure sources | Finance / DET | Financial year; as-of date | PENDING APPROVAL: formula, denominator, zero handling and exclusions |
| FIN-05 | Balance | Approved financial balance measure for a defined scope and period | Reconciled authoritative outlay/release/expenditure records | Finance / DET | Financial year; as-of date | PENDING APPROVAL: unreleased allocation vs unspent release vs total available balance |

AIP `investment_amount` and SIP proposed/contribution fields are not approved outlay or actual financial transactions. No utilisation or balance formula is adopted by this draft.

## 5. Reporting periods and time semantics

The following period labels are proposed vocabulary only. Each KPI owner must approve the applicable one:

| Period type | Intended use | Rules still requiring approval |
|---|---|---|
| AS_OF_SNAPSHOT | Registry counts and current workflow-state counts | Snapshot timestamp, timezone and inclusion of inactive/archived records |
| REPORTING_PERIOD | Physical activity and recurring progress submissions | Period start/end, submission deadline, late correction policy |
| ACADEMIC_YEAR | Courses, admissions, training and placement cohorts | Academic-year boundaries, cohort assignment and corrections |
| FINANCIAL_YEAR | Outlay, releases, expenditure and balance | Financial-year boundaries, restatements and accounting cut-off |
| EVENT_DATE | Apprenticeship, OJT, exposure and other event records | Which event date controls reporting and treatment of changed/cancelled events |

All timestamps in the API must use ISO 8601 with an explicit UTC offset or UTC marker. Business reporting dates must be interpreted in the approved programme timezone. The programme timezone itself requires confirmation before implementation.

A period metric must identify its period. A snapshot metric must identify when the snapshot was taken. Do not mix cumulative-to-date totals with period-only totals under the same label.

## 6. Data provenance and freshness contract

The following is the **proposed minimum provenance envelope** for a reported metric or reporting batch. Field names are logical examples, not approved database columns:

| Logical attribute | Purpose | Approval |
|---|---|---|
| Source system / source module | Identifies the authoritative origin | PENDING source-owner confirmation |
| Source record reference or batch reference | Supports traceability and reconciliation | PENDING integration design |
| Reporting period start/end or snapshot time | Identifies the time window represented | PENDING KPI owner |
| Captured/received timestamp | When PM-SETU received the data | PENDING integration design |
| Last successful source sync | Indicates source freshness | PENDING source-owner SLA |
| Validation status | Indicates accepted, rejected, pending review or partial data | PENDING validation workflow |
| Validation timestamp and validating authority | Supports accountability | PENDING approval |
| Contract/KPI definition version | Identifies the semantics used for aggregation | Required design control; final representation pending |
| Data quality warnings | Explains missing, stale or rejected records | PENDING quality rules |

### Proposed validation states

- **RECEIVED** — delivered by source, not yet validated.
- **VALIDATED** — passed the approved validation rules.
- **REJECTED** — failed validation; excluded from verified metrics.
- **PARTIAL** — only a subset is available; must be clearly disclosed.
- **STALE** — older than the approved freshness threshold.
- **MISSING** — no expected submission/source batch received for the period.

These are proposed states only. They require approval and must not be added to production enums/check constraints until vocabulary and transitions are confirmed.

### Freshness behaviour

A KPI must not silently display an old value as current. The source owner must define expected cadence and maximum acceptable age. Until that threshold is approved, freshness should be shown as **unknown**, not guessed. If source delivery fails, retain the last known value only if it is explicitly labelled with its as-of time and stale/unknown state.

## 7. Data quality and reconciliation requirements

The following checks are proposed baseline controls. KPI-specific thresholds and acceptance criteria require source-owner approval.

1. **Completeness:** required fields and expected reporting submissions are present.
2. **Validity:** values conform to approved type, code list, date range, unit and lifecycle rules.
3. **Uniqueness:** duplicate source records and repeated person/outcome records are detected using approved identifiers.
4. **Referential integrity:** every record maps to a valid cluster, ITI, course, cohort, employer or financial scope as applicable.
5. **Period integrity:** event dates and reporting periods are consistent; overlapping or out-of-period records are handled explicitly.
6. **Evidence:** physical progress and outcomes requiring proof have linked evidence under an approved document/evidence policy.
7. **Reconciliation:** imported totals reconcile with source-system control totals or approved finance ledgers.
8. **Correction history:** corrected submissions retain an auditable history and do not silently overwrite accepted reporting periods.
9. **Partial data:** missing sources and incomplete coverage are visible; partial data is not silently treated as zero.
10. **Zero vs missing:** a verified zero is distinct from no submission, unavailable source, rejected data or stale data.

## 8. Visibility and access contract

The current dashboard routes are mounted as public routes. This draft does **not** approve that all future dashboard information may be public.

### Proposed visibility classes

| Class | Description | Proposed handling |
|---|---|---|
| PUBLIC_AGGREGATE | Explicitly approved high-level aggregate indicators | Public allowlist only; no record-level details or sensitive drill-down |
| INTERNAL_AGGREGATE | Programme/financial aggregates for authorised officials | Authentication, role and resource-scope enforcement |
| RESTRICTED_DETAIL | Trainee, trainer, employer, evidence, transaction or other record-level details | Least-privilege access, purpose limitation and audit trail; public access prohibited |

### Decisions required

- DET/State PMU must approve the public KPI allowlist.
- NIC/security and the department must approve role/permission mapping for internal dashboard views.
- Resource scope must constrain cluster/ITI-level drill-down; frontend hiding is not an access control.
- Finance must approve who may view financial detail and at which aggregation levels.
- Data protection, retention and evidence/file access requirements must be reviewed before any personal or employer-level information is exposed.

Until approved, do not expose new detailed reporting endpoints. Do not infer role permissions from UI requirements.

## 9. Aggregation and drill-down contract

The official dashboard hierarchy is preserved:

`State → Cluster → Hub ITI → Spoke ITI → Activity`

Proposed aggregation rules:

- Every KPI must declare which hierarchy levels it supports.
- A parent aggregate must be derived from eligible child records using the KPI's approved aggregation method.
- Percentages must be recalculated from aggregated numerator and denominator; never average child percentages unless the approved definition explicitly says so.
- Distinct-person measures require a stable approved identifier and duplicate policy across child scopes.
- Currency totals require one approved currency and accounting basis; conversion rules, if needed, require separate approval.
- A child record must not be counted twice because it is linked through multiple entities.
- Unmapped or unassigned records must be reported as a data-quality exception, not silently assigned to a parent.
- Drill-down results must apply the same reporting period, validation state and access scope as the parent metric.

The exact applicability of the Hub/Spoke/activity levels for each KPI is pending the KPI owner's approval.

## 10. Source-system and integration contract

For every external source, the integration design must document:

| Requirement | Required detail |
|---|---|
| Source owner | Department/team and operational contact role |
| Authoritative system | Official system of record for the metric |
| Interface | Approved API, file exchange or other approved mechanism |
| Identity mapping | Source identifiers and PM-SETU entity mapping |
| Authentication | Approved service identity, credential custody and rotation |
| Schedule | Refresh frequency, reporting cut-off and expected delivery window |
| Validation | Schema, code lists, business rules and rejection handling |
| Reconciliation | Control totals, source acknowledgements and discrepancy workflow |
| Retry and recovery | Idempotency, retry policy, late delivery and replay handling |
| Audit | Batch/source reference, timestamps, outcome and operator/service identity |
| Versioning | Interface contract version and backward-compatibility policy |
| Security/legal | Data-sharing approval, purpose, retention and permitted fields |

No credentials, external endpoints, refresh schedules, or source-system ownership assignments are assumed by this document.

## 11. API design principles for later implementation

This section defines design constraints, not a final endpoint payload.

- Preserve the existing dashboard endpoints until a reviewed migration plan exists.
- Distinguish legacy registry snapshot responses from newly verified implementation-progress metrics.
- Every new metric response must identify its KPI ID, unit, reporting period or snapshot time, validation state and approved provenance metadata.
- Missing/unavailable data must not be converted to numeric zero.
- Do not publish draft or unapproved KPI definitions as verified values.
- Internal endpoints must enforce authentication, permission and resource scope on the backend.
- Aggregation must be performed from the PM-SETU reporting repository, not by frontend fan-out to source systems.
- API and KPI contract versions must be traceable to the definitions used to calculate the metric.
- Errors must distinguish unavailable source, stale source, validation failure and internal service failure without leaking sensitive source details.

Exact JSON property names, response schemas, route names and error codes will be specified after the relevant decisions are approved.

## 12. Approval register

The following approvals are required before the relevant implementation work can be treated as authoritative:

| Approval ID | Authority / owner to confirm | Required decision | Blocks |
|---|---|---|---|
| APR-01 | DET / State PMU | Registry inclusion/status filters and public aggregate allowlist | Registry KPI finalisation and visibility |
| APR-02 | DET / NIC / Approving Authority | Canonical SIP status vocabulary, transitions and count semantics | REG-06 |
| APR-03 | DET / ITI / Cluster Admin | Physical-progress definitions, stages, evidence and reporting periods | PHY-01 to PHY-04 |
| APR-04 | DET / Student MIS / ITI | Course taxonomy, trainer, admission and training-completion definitions and source ownership | ACD-01 to ACD-05 |
| APR-05 | DET / Apprenticeship MIS / Placement MIS / ITI | Apprenticeship, OJT, industry exposure, placement, placement rate and employer participation rules | IND-01 to IND-06 |
| APR-06 | Finance / DET / Approving Authority | Outlay, release, expenditure, utilisation, balance, fiscal period and authoritative financial source | FIN-01 to FIN-05 |
| APR-07 | DET / NIC / Security | Public/internal/restricted access model, role matrix and resource-scope policy | Dashboard access implementation |
| APR-08 | DET / NIC / Source-system owners | Integration interfaces, identifiers, schedules, authentication and reconciliation | ETL/source integration |
| APR-09 | DET / NIC / Data owners | Provenance, freshness thresholds, validation states and correction policy | Verified metric publication |
| APR-10 | DET / NIC / Finance / ITI | SIP–SPV relationship cardinality and any cross-entity reporting joins | Relationship-dependent drill-down |

Approval must be recorded with authority, decision, date, effective period and contract version. Verbal assumptions or code comments are not approval evidence.

## 13. Phase 3.1 exit criteria

Phase 3.1 is ready to close as a **draft technical contract** when:

- [x] All 26 KPI identifiers from the Phase 0 mapping are represented.
- [x] Existing repository evidence is distinguished from missing sources.
- [x] No unapproved KPI formula is presented as authoritative.
- [x] Reporting period categories and time semantics are documented as proposals.
- [x] Provenance and freshness requirements are documented as proposals.
- [x] Public/internal/restricted visibility classes are documented as proposals.
- [x] Aggregation, drill-down and integration constraints are documented.
- [x] Approval dependencies and owners-to-confirm are listed.
- [ ] DET/NIC/Finance/source-system owners approve the applicable KPI definitions and source mappings.
- [ ] Security/department approves dashboard visibility and role/scope policy.
- [ ] Source owners approve interface, refresh, provenance and data-quality contracts.

**Current exit status:** Technical draft complete; departmental approvals remain open. This document alone does not authorise new production reporting tables, formulas, endpoints, source integrations, role grants or public disclosure.

## 14. Evidence basis

This draft is grounded in:

- Phase 3.0 Dashboard Data Audit in this repository.
- Phase 0 Dashboard KPI Source Mapping workbook.
- Phase 0 Gap Register and Master Backlog.
- Official Functional, Content & Technical Architecture dashboard requirements and integration architecture.
- Current dashboard route, type, repository and SQL files.
- Current Prisma schema and migration inventory.

Where the source material does not define a formula, unit, source owner, reporting period, status vocabulary or access rule, this contract marks the item pending approval rather than filling the gap with an assumption.
