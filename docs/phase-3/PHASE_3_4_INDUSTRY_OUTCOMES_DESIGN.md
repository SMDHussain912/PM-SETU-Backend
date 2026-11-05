# Phase 3.4 — Industry Outcomes Reporting Design

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Design version:** Draft 0.1  
**Status:** Technical design proposal — DASH-03 / DASH-04 and DB-04 / source-owner approval pending  
**Depends on:** Phase 3.0 Dashboard Data Audit; Phase 3.1 Reporting Data Contract; Phase 3.3 Academic Progress Reporting Design  
**Scope:** Apprenticeships, OJT, industry exposure, placements, placement percentage and employer participation (IND-01 to IND-06).

> **Approval boundary:** This document translates the Phase 0 industry-outcomes KPI mapping into a technical proposal. It is not an approved industry data model. No production Prisma models, SQL migrations, API routes, placement formula, employer qualification rule, status vocabulary, role grants or external integrations are introduced until DET, ITIs, industry partners and the relevant MIS owners approve the definitions and source contracts.

## 1. Purpose and source basis

Phase 0 identifies six industry-outcome measures:

| KPI ID | Official KPI label | Phase 0 source expectation |
|---|---|---|
| IND-01 | Apprenticeships | Number of apprenticeships / apprentices placed |
| IND-02 | OJT | On-the-job training participation |
| IND-03 | Industry exposure | Industry exposure activities / participation |
| IND-04 | Placements | Number of placements |
| IND-05 | Placement percentage | Placement rate |
| IND-06 | Employer participation | Employer participation |

The Phase 0 mapping proposes the following drill-downs:

- IND-01: State → Cluster → ITI → Employer / Apprentice.
- IND-02: State → Cluster → ITI → Employer / Cohort.
- IND-03: State → Cluster → ITI → Activity.
- IND-04: State → Cluster → ITI → Employer / Trainee.
- IND-05: State → Cluster → ITI.
- IND-06: State → Cluster → ITI / Activity.

The Phase 0 mapping explicitly leaves the following definitions unresolved:

- IND-01: opportunity/agreement versus contract versus enrolled apprentice versus completed apprenticeship.
- IND-02: hours versus trainees versus completed OJT placements; start/completion and unique-trainee rules.
- IND-03: activity count versus trainee count, with evidence.
- IND-04: placed-student definition, employment verification, duplicate handling and time window.
- IND-05: numerator, denominator, eligible-completer cohort and exclusions.
- IND-06: unique active employer and whether an MoU, active engagement or actual contribution qualifies.

The Phase 3.0 source/schema audit found no apprenticeship, OJT, industry-exposure, placement or structured employer-participation records in the inspected Prisma schema. The existing `GET /api/v1/dashboard/placements` endpoint reports that its source is not established. This is repository evidence only, not a production database or external-MIS inspection.

## 2. Scope and non-scope

### In scope

1. Apprenticeship opportunity, agreement/contract and apprentice lifecycle concepts.
2. OJT programme, employer, trainee participation, hours and completion concepts.
3. Industry exposure activity and attendance/participation concepts.
4. Placement record, employment verification and duplicate-resolution concepts.
5. Placement-rate numerator/denominator contract and cohort reconciliation.
6. Employer master and verified participation relationships.
7. Source provenance, evidence, review, corrections, privacy, aggregation and reporting periods for IND-01 to IND-06.

### Explicitly out of scope

- Replacing the authoritative Apprenticeship MIS, Placement MIS, Student/Training MIS or employer systems.
- Assuming PM-SETU is the system of record for apprentice, student or employment identity.
- Treating an MoU, employer registration, job offer, interview, referral or training attendance as a placement without an approved definition.
- Treating an apprenticeship opportunity or signed agreement as an enrolled/completed apprentice unless that is the approved KPI unit.
- Defining a placement percentage formula or eligible-completer denominator without DET approval.
- Publishing trainee-level, employer-contact or employment-document data through public dashboard endpoints.
- Building external connectors before source owners and interface contracts are confirmed.

## 3. Design principles

1. **Keep the six KPIs distinct.** Opportunities, contracts, participants, hours, activities, placements and employers are different units.
2. **Separate lifecycle events.** A record can progress through proposed, approved, started, completed, cancelled or verified states, but canonical states must be approved by the owner.
3. **Use authoritative identities.** Preserve source-system identifiers for trainees, apprentices and employers; do not rely on names as deduplication keys.
4. **Count people and events separately.** One trainee may attend multiple activities or programmes; one employer may participate in multiple ways.
5. **Make time attribution explicit.** Store event dates, cohort/academic year and reporting period rather than inferring them from the current date.
6. **Preserve history.** Transfers, cancellations, corrections, re-openings and verification changes must be auditable.
7. **Require evidence appropriate to the claim.** A submitted document is not automatically verified evidence.
8. **Keep source provenance.** Every imported or manually recorded fact must be traceable to its source, source record, capture time and validation outcome.
9. **Minimise personal data.** Keep operational identity and employment documents restricted; aggregate dashboard outputs separately.
10. **Integrate through controlled interfaces.** No dashboard request should fan out to external production databases.
11. **Do not infer zero from missing data.** Distinguish zero, unavailable, stale, pending verification and not applicable.
12. **Version approved KPI definitions.** Historical figures must remain interpretable when rules or source mappings change.

## 4. Proposed conceptual architecture

```text
Apprenticeship MIS / Placement MIS / Student MIS
OJT & Industry Exposure Records / Employer Sources
                         |
                         v
              Approved API / ETL adapters
                         |
                         v
            Staging + identity reconciliation
                         |
                         v
               Validation / evidence review
                         |
          +--------------+---------------+
          |              |               |
          v              v               v
   Apprenticeship    OJT & Exposure    Placement &
      records          records       Employer records
          |              |               |
          +--------------+---------------+
                         |
                         v
              PM-SETU reporting repository
                         |
                         v
               KPI aggregation service
                         |
                         v
             Dashboard API / access policy
                         |
                         v
       State → Cluster → ITI → Employer / Cohort
```

This is a conceptual architecture. It does not assert that any named external interface is currently available. The Phase 3.1 integration contract applies: source owner, system of record, interface, identifier mapping, authentication, delivery schedule, retries, error handling, reconciliation and legal approval must be documented before integration.

## 5. Apprenticeships — IND-01

Phase 0 asks whether the KPI counts opportunities, contracts or individual apprentices, and suggests an Apprenticeship MIS or verified apprenticeship placement records as the source.

### Proposed record concepts

- **ApprenticeshipOpportunity:** an employer- or programme-published opportunity, if opportunities are within the approved reporting scope.
- **ApprenticeshipAgreement:** an agreement/contract reference linking an employer and apprentice, with its authoritative source identifier.
- **ApprenticeEngagement:** an individual apprentice's participation under an agreement, including start/end and lifecycle outcome.
- **ApprenticeshipOutcome:** completion or other approved outcome, with verification provenance.
- **EmployerReference:** link to the canonical employer identity, not a free-text employer name.

### Candidate attributes and decisions

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Opportunity | source ID, employer, trade/role, location, publication/expiry dates, approved status | Does IND-01 include opportunities at all? |
| Agreement | agreement/contract ID, source, employer, agreement date, validity dates | Is one agreement the counting unit, or is each apprentice counted? |
| Apprentice engagement | trainee/apprentice source ID, agreement, ITI, cohort, start/end dates | What event makes an apprentice count as enrolled/placed? |
| Lifecycle | proposed canonical milestones: offered, accepted, started, completed, terminated | Which source statuses and transitions are authoritative? |
| Outcome | completion date, outcome code, evidence/source reference, verifier | Is completion required for the KPI? |
| Attribution | ITI, cluster, employer, cohort and reporting period | Which ITI receives credit for cross-ITI or transferred apprentices? |

### Counting alternatives requiring approval

1. Number of apprenticeship opportunities.
2. Number of valid apprenticeship agreements/contracts.
3. Number of unique apprentices who commenced an apprenticeship.
4. Number of unique apprentices who completed an apprenticeship during the period.
5. Separate measures for more than one lifecycle point, if DET approves separate labels/KPI definitions.

These alternatives must not be merged into one count. A single contract may cover multiple apprentices; one apprentice may have multiple agreements over time. The counting grain and deduplication policy must be explicit.

**Recommended design position for review:** preserve opportunity, agreement and individual apprentice engagement as separate concepts. Do not select the official KPI unit in code until DET and the Apprenticeship MIS owner approve it.

## 6. On-the-job training — IND-02

Phase 0 describes IND-02 as OJT participation and explicitly asks whether the required measure is hours, trainees or completed OJT placements.

### Proposed record concepts

- **OJTProgramme:** approved programme definition, owner and qualifying criteria.
- **OJTProgrammeInstance:** a delivery instance with employer, ITI, cohort and scheduled dates.
- **OJTParticipation:** a trainee's enrolment/participation in an instance.
- **OJTAttendance / OJTHours:** dated attendance or hour records, only if hours are an approved measure and an authoritative recording method exists.
- **OJTCompletion:** verified completion outcome, date, criteria and evidence.
- **OJTEmployerLink:** canonical employer relationship for the programme instance.

### Candidate attributes and decisions

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Programme | programme code, title, category, approved duration, qualifying rules | What qualifies as OJT under the programme? |
| Instance | employer, ITI, course/trade, cohort, location, start/end | What constitutes one OJT instance? |
| Participation | trainee source ID, enrolment date, start date, end date, status | Does registration or actual commencement count? |
| Hours | date, duration, supervisor/source, attendance evidence | Are hours required, and what validation is accepted? |
| Completion | completion date, required duration/attendance, assessment/outcome | What is the completion rule? |
| Attribution | trainee's ITI/course/cohort and employer | How are transfers and multi-ITI participation attributed? |

### Counting alternatives requiring approval

- Unique trainees who started OJT during the reporting period.
- Unique trainees who completed OJT during the reporting period.
- Number of OJT programme instances.
- Total verified OJT hours.
- A combination of separate measures with separate labels and units.

A trainee attending multiple OJT instances may count once in a unique-trainee metric but multiple times in an instance metric. Hours must not be inferred from programme duration or planned schedules; they require accepted attendance/hours evidence.

**Boundary with apprenticeship:** OJT and apprenticeship may overlap in a real-world programme, but one must not be automatically counted as the other. DET must approve whether a record can contribute to both KPIs and how overlap is disclosed.

## 7. Industry exposure — IND-03

Phase 0 requires activity and attendance/evidence records and explicitly warns against mixing event counts with participant counts.

### Proposed record concepts

- **IndustryExposureActivity:** an event/activity such as an approved visit, industry interaction, expert session or other DET-approved exposure type.
- **ActivityParticipation:** trainee participation linked to the activity and authoritative trainee identity.
- **ActivityEvidence:** attendance, agenda, report, approved proof or other accepted evidence.
- **ActivityEmployerLink:** one or more participating employers/industry organisations, if applicable.

### Candidate attributes and decisions

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Activity | activity ID, type, title, date, venue, organiser, ITI | Which activity types qualify? |
| Employer | canonical employer ID, role in activity | Is employer involvement mandatory? |
| Participation | trainee ID, attendance status, attendance evidence | What counts as a participant? |
| Evidence | document/reference, evidence type, submitted/verified status, verifier | What proof is required and who verifies it? |
| Delivery | planned date, actual date, completion/cancellation outcome | Do cancelled or planned activities count? |
| Attribution | ITI, cluster, cohort, activity date | Which hierarchy and reporting period apply? |

### Reporting measures to keep separate

- Number of qualifying industry exposure activities held.
- Number of unique trainees participating.
- Number of participation instances/attendances, if required.
- Number of employers participating in qualifying activities, if separately approved under IND-06.

A single activity with 40 trainees is one activity and may represent 40 unique participants; those are not interchangeable. Planned or cancelled activities must not be counted as held activities. Repeat attendance and multiple activities require an approved unique-person and event-counting rule.

## 8. Placements — IND-04

Phase 0 requires an authoritative Placement MIS or verified placement records and calls out placed-student definition, employment verification, duplicate handling and time window. The Phase 3.0 audit found no placement source records in the inspected schema and observed that the existing placements endpoint does not establish a source.

### Proposed record concepts

- **PlacementOpportunity:** a job opening or employer opportunity; not itself a placement.
- **PlacementRecord:** a trainee-to-employer employment outcome, with source ID, role, dates and status.
- **PlacementVerification:** verification outcome, evidence reference, verifier, timestamp and verification standard version.
- **PlacementChange:** auditable updates, withdrawal, correction, termination or invalidation.
- **EmployerReference:** canonical employer identity.
- **TraineeIdentityReference:** privacy-conscious link to authoritative Student MIS identity.

### Candidate attributes and decisions

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Trainee | source student ID, source system, course, ITI, cohort | Which Student MIS identifier is authoritative? |
| Employment | employer ID, job/role, employment type, location | Which employment types qualify (if any restrictions apply)? |
| Dates | offer date, acceptance date, joining date, verification date | Which date determines the reporting period? |
| Status | proposed milestones: offered, accepted, joined, verified, withdrawn, rejected | Does an offer count, or is joining/verification mandatory? |
| Evidence | employer confirmation, appointment/joining proof, MIS reference | What evidence is accepted and who verifies it? |
| Duplicate control | source placement ID, trainee, employer, role, joining date | How are duplicate imports, multiple jobs and corrections handled? |
| Attribution | ITI, cluster, course, cohort and placement year | How is credit assigned when a trainee changes ITI or obtains multiple jobs? |

### Placement definition decisions

DET and the Placement MIS owner must approve:

1. Whether a job offer, accepted offer, joining event or verified employment is the qualifying event.
2. Which employment types and minimum conditions qualify, if any.
3. Which evidence source is authoritative and what constitutes verification.
4. Whether self-employment, entrepreneurship, family business, further study, military/service roles or other pathways are included, excluded or reported separately.
5. How multiple placements for one trainee are counted.
6. How job changes, short-duration employment, withdrawn offers and later termination affect historical counts.
7. Whether the metric is based on offer date, joining date or verification date.
8. The academic-year/placement-year attribution rule.

A job opportunity, referral, interview, offer letter without the approved qualifying event, or unverified self-reported outcome must not silently become a verified placement.

## 9. Placement percentage — IND-05

Phase 0 explicitly states that numerator, denominator and eligible cohort are unspecified and instructs that the metric must not be calculated until numerator, denominator and exclusions are approved.

### Required contract components

| Component | Required decision |
|---|---|
| Numerator | Exact IND-04 placement outcome counted; unique trainees or placement records |
| Denominator | Exact eligible completer population and authoritative source |
| Cohort | Course, ITI, academic year/cohort and completion date attribution |
| Time window | Placement follow-up window after training completion, if applicable |
| Exclusions | Approved exclusions (for example, ineligible records, duplicate identities or withdrawn outcomes) |
| Multiple outcomes | Whether one trainee can contribute more than once to numerator |
| Missing records | Treatment of unknown, late or unverified placement outcomes |
| Restatement | How late placements, corrections and denominator changes restate historical rates |
| Rounding | Display precision and rounding rule |
| Zero denominator | Approved display/undefined behaviour; never divide by zero |

### Formula status

No production formula is approved by Phase 0. A candidate ratio such as:

`verified_placed_eligible_trainees div eligible_completers 	imes 100`

is only a discussion aid, not an approved formula. Its numerator, denominator, cohort window and eligibility conditions remain unresolved. Do not implement or publish this ratio until written approval records the full formula and the source reconciliation method.

### Reconciliation requirements

- The numerator must be traceable to qualifying IND-04 records.
- The denominator must be traceable to authoritative training-completion records (ACD-05 or an explicitly approved equivalent).
- Cohort boundaries and reporting windows must match.
- A trainee must not be counted twice because of duplicate source identities or multiple placement records unless the approved numerator is explicitly placement-event based.
- Missing placement data must not be treated as confirmed non-placement without an approved completeness rule.
- Every published rate must expose its cohort, as-of date, source freshness and definition version.

## 10. Employer participation — IND-06

Phase 0 requires a unique active employer definition and asks whether a signed MoU, active engagement or actual contribution qualifies. It proposes an employer master linked to activities, apprenticeships, OJT and placements.

### Proposed record concepts

- **Employer:** canonical employer/industry-organisation master reference.
- **EmployerIdentifier:** source-system IDs, registration identifiers where approved, and alias history.
- **EmployerParticipation:** a time-bounded relationship between an employer and a qualifying programme/activity/outcome.
- **EmployerContribution:** a typed contribution record, if DET defines qualifying contribution types.
- **EmployerVerification:** verification state and evidence provenance.
- **EmployerRelationshipHistory:** historical status, name changes, mergers or duplicate resolution.

### Candidate attributes and decisions

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Employer identity | canonical ID, source IDs, legal/display name, aliases | Which employer registry is authoritative? |
| MoU | reference, parties, signing/effective/expiry dates, scope | Does an MoU count by itself, or only as a relationship record? |
| Participation | activity/programme link, type, start/end, status | What is active participation and its period? |
| Contribution | apprenticeship, OJT, exposure, placement, equipment/expert support, etc. | Which contribution types qualify? |
| Evidence | activity records, trainee participation, employer confirmation | What proof is required? |
| Deduplication | registration/source IDs, legal identity, aliases | How are branches, subsidiaries and duplicate records treated? |
| Attribution | ITI, cluster, activity, reporting period | How is a multi-ITI employer counted at each level? |

### Candidate qualification levels — not approved states

1. **Registered employer:** present in an employer master.
2. **MoU employer:** has a signed, valid MoU.
3. **Engaged employer:** has at least one qualifying activity during the approved period.
4. **Contributing employer:** has a verified apprenticeship, OJT, exposure or placement contribution during the approved period.

These levels are useful for analysis but must not be adopted as canonical statuses without approval. A signed MoU alone must not be assumed to mean active participation. The KPI owner must define whether IND-06 counts unique employers, employer-activity links, contributions, or separate measures for each.

## 11. Shared industry data primitives

The following concepts are common across the six KPIs and should be reviewed together before implementation:

| Primitive | Purpose | Required controls |
|---|---|---|
| SourceReference | Source system, record ID, source version and import batch | Unique source key, idempotent ingestion, traceability |
| PersonIdentityReference | Link to authoritative trainee/apprentice identity | Restricted access, duplicate resolution, minimal personal data |
| EmployerIdentity | Canonical employer with source identifiers and aliases | Deduplication, merge history, restricted contact details |
| ITI / Cluster attribution | Organisational ownership of an event/outcome | Effective-dated assignment and approved attribution |
| Cohort / reporting period | Academic year, cohort, placement year or reporting period | Approved calendar and explicit date rules |
| EvidenceReference | Link to proof stored in an approved document system | File access control, type/size validation, integrity and retention |
| VerificationEvent | Who reviewed what, when, decision and reason | Role/scope enforcement, immutable audit trail |
| CorrectionEvent | Supersedes/corrects an earlier record without erasing history | Reason, actor, timestamp, before/after reference |
| KPI definition version | Approved counting rule, formula and effective date | Historical reproducibility and approval record |

Do not store unnecessary identity or employment-document copies in the reporting layer if a secure source reference and controlled evidence retrieval satisfy the requirement.

## 12. Submission, integration and verification lifecycle

### Proposed lifecycle (illustrative only)

`SOURCE_RECEIVED → STAGED → VALIDATION_PENDING → VERIFIED / REJECTED → AGGREGATED`

Corrections may create a new version or superseding record. The exact canonical states and transition authority require approval.

### Ingestion requirements

- Every external record carries source system, source record ID, extraction/import timestamp and source update timestamp where available.
- Imports are idempotent using a stable source key and version/update strategy.
- Schema and reference-code validation occur before records enter the verified reporting set.
- Invalid records are quarantined with actionable error reasons; they must not silently disappear or become zero.
- Retries must not duplicate events, participants, placements or employer contributions.
- Reconciliation reports compare source totals, imported totals, rejected records and duplicate/superseded records.
- Late-arriving updates and historical corrections must be supported.
- Manual entry, if approved, records actor, organisation scope, evidence and reviewer.
- The verified dataset must distinguish source-verified, manually verified and unverified submissions.

### Evidence and verification

Evidence requirements vary by KPI and must be approved by the data owner. The system should record evidence type, secure reference, uploader/source, upload time, verifier, verification time, outcome and rejection reason. A file's presence is not proof that its contents are genuine or sufficient.

## 13. Reporting periods, aggregation and hierarchy

Phase 0 leaves most industry reporting periods as TBD; IND-04 suggests academic year / placement year, and IND-05 academic year / cohort. DASH-06 requires approval of snapshot frequency, financial year, academic year, cohort period and historical restatement policy.

### Required period dimensions

- Event date (opportunity, agreement, OJT, activity, joining, verification or contribution date as applicable).
- Academic year and cohort, when the source owner supplies/approves them.
- Reporting period and as-of/snapshot timestamp.
- Placement follow-up window and cohort completion date, if adopted for IND-05.
- Effective dates for employer/ITI relationships and KPI definition versions.

Do not use one universal date field for all six measures. The KPI owner must select the event date that controls period inclusion for each metric.

### Aggregation safeguards

- Aggregate from verified, deduplicated facts only.
- Keep event counts, unique-person counts, hour totals and unique-employer counts as separate units.
- Do not sum unique people across ITIs to obtain a state unique-person total where a person may appear in multiple ITIs; deduplicate at the requested scope using the approved identity key.
- Employer counts require the same scope-aware deduplication; a multi-ITI employer may count once at State and once per relevant ITI only if that is the approved hierarchy behaviour.
- A placement percentage must be recalculated from reconciled numerator and denominator at each scope; do not average ITI percentages to derive a cluster/state percentage.
- Preserve the cohort and KPI-definition version used in each aggregate.
- Expose freshness, coverage/completeness and verification status alongside values.
- Distinguish zero from unavailable, stale, pending verification, incomplete source coverage and not applicable.

## 14. Privacy, security and access

Industry-outcome records may include student identity, employer contacts, employment details, agreement references and documentary evidence.

Proposed controls, subject to the approved DASH-10 access policy:

1. Public dashboard: only an explicit allowlist of safe aggregate values; no trainee names/IDs, employer contacts, agreement documents or employment evidence.
2. Internal dashboard: authentication, role-based permissions and ITI/cluster/state resource-scope checks on every endpoint and drill-down.
3. Operational records: least-privilege access for authorised ITI, cluster, DET and source-system reviewers.
4. Evidence: private storage, authorised retrieval, access logging, malware/file validation and retention rules.
5. Personal data: minimise fields, restrict exports, define retention and correction processes, and avoid exposing raw identifiers in API responses.
6. Audit: record actor, action, timestamp, record reference, verification/correction outcome and scope.
7. Employer data: distinguish public organisation name from restricted contact and commercial information.
8. Exports: apply the same access scope, masking and audit requirements as interactive APIs.

The Phase 3.0 audit observed that the inspected dashboard router did not apply authentication/role/scope middleware. Do not expose new industry drill-down routes until the public/internal policy and backend enforcement are approved and verified.

## 15. API design proposal (not implemented)

The following resource shapes are candidates for review, not existing routes or approved contracts:

| Candidate resource | Purpose | Approval dependency |
|---|---|---|
| `/industry/apprenticeships` | Search/list apprenticeship opportunities, agreements or apprentice engagements | IND-01 counting unit, source and access |
| `/industry/ojt-programmes` | OJT programme instances and participation | IND-02 measure and source |
| `/industry/exposure-activities` | Exposure activities and participant aggregates | IND-03 qualifying activity/evidence |
| `/industry/placements` | Verified placement records and aggregates | IND-04 definition, source and verification |
| `/industry/placement-rate` | Cohort placement-rate aggregates | IND-05 numerator, denominator and formula |
| `/industry/employers` | Employer master and participation aggregates | IND-06 identity and qualification |
| `/dashboard/industry` | Aggregated industry KPI summary | All relevant KPI contracts, freshness and DASH-10 |

API requirements:

- Validate pagination, filters, date ranges and hierarchy IDs.
- Enforce role and resource scope server-side.
- Return aggregate-only fields to public consumers.
- Include KPI ID, unit, period/cohort, as-of timestamp, source freshness, coverage/verification state and definition version.
- Use stable source/domain IDs internally; avoid exposing unnecessary personal identifiers.
- Return explicit unavailable/stale/incomplete states rather than substituting zero.
- Keep operational record APIs separate from dashboard aggregate APIs.
- Do not introduce any of these routes until definitions and source interfaces are approved.

## 16. Data quality and reconciliation

| Risk | Required handling |
|---|---|
| Duplicate trainee identities | Reconcile by authoritative source ID; quarantine unresolved collisions |
| Multiple apprenticeship agreements | Apply approved agreement/person counting grain; retain lifecycle history |
| OJT repeated participation | Separate unique trainees, programme instances and hours |
| Duplicate exposure attendance | Deduplicate by activity + trainee + approved attendance key |
| Unverified placement | Exclude from verified numerator until approved verification is complete |
| Multiple placements per trainee | Apply approved person/event counting rule and retain all valid history |
| Offer mistaken for placement | Enforce approved qualifying milestone |
| Incomplete completer denominator | Withhold placement rate or label incomplete; do not assume missing means zero |
| Employer aliases/branches | Maintain canonical employer identity and effective-dated alias/merge history |
| MoU-only employer | Do not count as active participation unless explicitly approved |
| Late source updates | Reprocess idempotently and preserve restatement history |
| Conflicting source systems | Apply named source-of-truth precedence; quarantine unresolved conflicts |
| Missing evidence | Mark pending/unverified; do not silently promote to verified |
| Stale integration | Surface last successful sync and freshness status |

Reconciliation must be possible at source-system, reporting period, KPI unit and hierarchy scope. Each refresh should produce an import summary: received, accepted, rejected, duplicate/superseded, pending verification and last successful sync.

## 17. Decisions required to close DASH-03 / DASH-04

The following decisions are open in the Phase 0 decision register and block implementation:

| Decision ID | Approval question | Proposed owner |
|---|---|---|
| DASH-03 | Confirm apprenticeship, OJT, industry exposure, placement and employer participation counting rules | DET / Industry / MIS owners |
| DASH-04 | Approve placement numerator, denominator, cohort eligibility, time window and duplicate/exclusion policy | DET / Placement MIS owner |
| DASH-06 | Confirm snapshot frequency, academic year, cohort period and historical restatement policy | State PMU / DET |
| DASH-07 | Confirm State, Cluster, Hub ITI, Spoke ITI and Activity drill-down for each KPI | State PMU / DET |
| DASH-08 | Name system of record and data owner for each KPI; define validation/sign-off responsibility | DET / source-system owners |
| DASH-09 | Confirm external API/file interfaces, refresh, identifiers, error handling and reconciliation | DET / NIC / system owners |
| DASH-10 | Approve public versus internal KPI values and authenticated operational access | DET / State PMU |
| DB-04 | Confirm academic and outcomes data sources, including apprenticeship, OJT and placements | DET / Student, Apprenticeship and Placement MIS owners |
| DB-11 / INT-01 | Inventory official external MIS interfaces, owners, credentials, SLAs and availability | DET / NIC / source-system owners |
| DB-12 / provenance | Approve source, capture, validation, freshness and lineage requirements | DET / NIC / source-system owners |

### Detailed approval checklist

Before IND implementation begins, record an approved answer for each item:

- [ ] IND-01: opportunity, agreement, unique apprentice started, completed apprentice, or separately approved measures.
- [ ] IND-02: unique trainee starts/completions, programme instances, hours, or separately approved measures.
- [ ] IND-03: qualifying activity types, held-event definition, attendance rule and unique participant policy.
- [ ] IND-04: qualifying employment event, employment types, evidence, verification authority, duplicate and time-window rules.
- [ ] IND-05: numerator, denominator, eligible completer cohort, exclusions, time window, multiple-placement policy, missing-data rule, rounding and zero-denominator behaviour.
- [ ] IND-06: canonical employer identity, unique active employer rule, MoU treatment, qualifying engagement/contribution and reporting period.
- [ ] Periods: event date per KPI, academic/placement year, snapshot schedule and restatement.
- [ ] Hierarchy: attribution and deduplication at ITI, Cluster and State.
- [ ] Sources: system of record, owner, identifier, interface, refresh, reconciliation and sign-off.
- [ ] Access: public allowlist, internal roles, resource scopes, evidence access and export policy.

Approval evidence should identify approver, role/department, date, decision text, effective date, source document/reference and contract version. A verbal assumption or implementation convenience is not approval.

## 18. Implementation gates and exit criteria

### Gate A — Definition approval

- DASH-03 and DASH-04 decisions are documented and signed off.
- Each KPI has a unit, event grain, inclusion/exclusion rules, reporting period and hierarchy attribution.
- IND-05 numerator and denominator are approved together and reconciled to authoritative sources.
- Employer identity and participation rules are approved.

### Gate B — Source and integration readiness

- Each KPI has a named system of record and accountable data owner.
- Official API/file interface, identifier mapping, authentication, schedule, retries and error handling are documented.
- Data-sharing, privacy, evidence and retention requirements are approved.
- Source-to-import reconciliation and duplicate handling are demonstrated.

### Gate C — Data model and implementation

- Approved domain models and migrations are reviewed against source contracts.
- Lifecycle states and transitions are approved.
- Verification, correction and audit history are implemented.
- Aggregations are tested for uniqueness, hierarchy roll-up, time windows and late updates.
- Placement-rate tests cover duplicate trainees, multiple placements, incomplete cohorts, zero denominator and historical restatement.
- Access-control tests cover public allowlist, authenticated roles and cross-ITI/cross-cluster denial.

### Gate D — Dashboard verification

- Each KPI is reconciled to source-owner totals for agreed periods and scopes.
- Unit, cohort, period, as-of time, freshness, completeness and definition version are visible.
- Missing/stale/unverified data is not shown as zero or verified.
- Public and internal outputs pass privacy/access review.
- DET and relevant source owners sign off the dashboard values.

## 19. Deliverable status

| Item | Status |
|---|---|
| Phase 0 IND-01 to IND-06 source mapping reviewed | Complete |
| Phase 0 DASH-03 / DASH-04 decisions mapped | Complete |
| Conceptual industry domain and lifecycle design | Drafted |
| Apprenticeship, OJT and exposure counting alternatives | Documented; approval pending |
| Placement verification and duplicate policy | Requirements documented; approval pending |
| Placement-rate numerator/denominator | Not approved; intentionally not implemented |
| Employer identity and active participation criteria | Alternatives documented; approval pending |
| Source interfaces and owners | Not confirmed |
| Production Prisma models / migrations | Not created |
| Production API routes / dashboard formulas | Not created |
| Tests | Not run; documentation-only deliverable |

**Phase 3.4 exit status:** Design proposal prepared. It is not implementation-ready until the approval and source-readiness gates above are satisfied.

## 20. Next phase

After Phase 3.4, proceed to **Phase 3.5 — Financial Progress Reporting Design** for FIN-01 to FIN-05: approved outlay, funds released, expenditure, utilisation percentage and balance. That phase must remain separate from SIP proposed investment/contribution fields and must not invent finance formulas or accounting semantics.

---

**End of Phase 3.4 design — Draft 0.1**
