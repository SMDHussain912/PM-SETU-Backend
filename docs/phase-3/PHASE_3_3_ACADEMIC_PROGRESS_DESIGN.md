# Phase 3.3 — Academic Progress Reporting Design

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Design version:** Draft 0.1  
**Status:** Technical design proposal — DB-04 / departmental and MIS-owner approval pending  
**Depends on:** Phase 3.0 Dashboard Data Audit; Phase 3.1 Reporting Data Contract; Phase 3.2 Physical Progress Reporting Design  
**Scope:** Courses, future-skills courses, trainers trained, admissions and training completed (ACD-01 to ACD-05).

> **Approval boundary:** This document translates the Phase 0 academic KPI mapping into an implementable technical proposal. It is not an approved academic data model. No production Prisma models, SQL migrations, API routes, taxonomies, completion rules, dashboard formulas, role grants or external integrations are introduced until DET, ITIs and the relevant Student/Training MIS owners approve DB-04 and the related KPI decisions.

## 1. Purpose and source basis

Phase 0 identifies these academic-progress measures:

| KPI ID | Official KPI label | Phase 0 source expectation |
|---|---|---|
| ACD-01 | Courses | Courses offered / available |
| ACD-02 | Future skills courses | Future-skills courses offered |
| ACD-03 | Trainers trained | Number of trainers trained |
| ACD-04 | Admissions | Number of admissions |
| ACD-05 | Training completed | Number of trainees completing training |

The Phase 0 mapping identifies the hierarchy as State → Cluster → ITI → Course for course measures, State → Cluster → ITI → Trainer / Training for trainer development, and State → Cluster → ITI → Course / Cohort for admissions and training completion.

The mapping explicitly leaves key definitions open:
- ACD-01 must distinguish approved trades, active courses and courses actually running.
- ACD-02 needs an approved future-skills taxonomy.
- ACD-03 needs a unique-trainer counting rule, completion definition and evidence criteria, including cumulative versus period count.
- ACD-04 needs an admitted-student definition and academic-year/cohort rules.
- ACD-05 needs completion, cohort, course and date rules.

The current repository evidence is limited:
- `itis.existing_trades` and `itis.proposed_trades` are profile fields; they do not prove approved or active course delivery.
- `itis.student_strength` is capacity/strength profile data, not admission transactions or training completion.
- The Phase 3.0 audit found no trainer-development or trainee enrolment/progress/completion records in the inspected Prisma schema.

These distinctions are mandatory. Existing profile values must not be relabelled as verified academic outcomes.

## 2. Scope and non-scope

### In scope

1. Course/trade master and ITI course-offering concepts.
2. Future-skills classification and course-offering concepts.
3. Trainer identity and trainer-development participation/completion concepts.
4. Student identity references, admission events and academic cohort concepts.
5. Training enrolment/progress/completion concepts.
6. Evidence, provenance, review, correction, deduplication and reporting-period requirements for ACD-01 to ACD-05.

### Related but not implemented in this phase

DB-04 also names apprenticeship, OJT and placement data sources. These are industry-outcome measures in the Phase 0 KPI map (IND-01 to IND-05), not academic KPI IDs ACD-01 to ACD-05. They require separate industry-outcome definitions and source-owner decisions. This design records the boundary but does not fold apprenticeship/OJT/placement events into training completion.

### Explicitly out of scope

- Creating a new Student MIS or replacing an existing authoritative Student/Training MIS.
- Assuming that PM-SETU is the system of record for student identity, admission or examination results.
- Defining official course/trade taxonomy or future-skills taxonomy without DET approval.
- Defining academic-year dates, eligibility, attendance thresholds, pass criteria or completion rules without the responsible academic authority.
- Publishing personal student or trainer data through public dashboard endpoints.
- Producing placement, apprenticeship, OJT or employment outcome KPIs.

## 3. Design principles

1. Separate master data (course, trainer, ITI offering) from events (admission, enrolment, training completion).
2. Use stable source identifiers and an explicit source-of-truth for every person, course and cohort.
3. Preserve the distinction between approved, offered, active, running and completed.
4. Count unique people only under an approved identity and deduplication policy.
5. Treat academic-year and cohort attribution as explicit data, not inferred from the current date.
6. Preserve history for transfers, re-admissions, course changes, corrections and repeat training.
7. Keep personally identifiable data restricted; dashboard aggregation should be separated from operational record access.
8. Accept external MIS data only through approved API/file integration and reconciliation, not direct production database access.
9. Do not calculate an outcome KPI from capacity/profile fields.
10. Keep formulas and eligibility rules versioned so historical figures can be interpreted correctly.

## 4. Proposed conceptual architecture

```text
Authoritative Course / Student / Training MIS
                 |
                 v
       Approved API / ETL adapter
                 |
                 v
      Staging + source reconciliation
                 |
                 v
       Validated academic records
                 |
                 +---- Course catalogue / ITI offerings
                 +---- Trainer registry / development events
                 +---- Admission / cohort records
                 +---- Enrolment / training completion
                 |
                 v
       PM-SETU reporting repository
                 |
                 v
       Dashboard aggregation API
                 |
                 v
 State → Cluster → ITI → Course / Cohort / Trainer
```

The architecture is conceptual. It does not assert that any external MIS interface is currently available. The Phase 3.1 integration contract applies: identify the source owner, interface, identifier mapping, authentication, delivery schedule, retry/error handling, reconciliation and legal approval before connecting a source.

## 5. Course catalogue and ITI offerings — ACD-01

The Phase 0 mapping proposes normalising course/trade master data and linking it to ITIs with approval and operational status.

### Proposed record concepts

- Course: canonical course/trade master entry.
- CourseClassification: approved classification/taxonomy references, if required by DET.
- ITICourseOffering: relationship between an ITI and a course, including the approved offering period and operational facts.
- CourseDeliveryInstance: an actual delivery instance or batch/cohort, if the owner confirms that “courses offered” means courses actually running.

### Candidate attributes for review

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Course identity | source course/trade code, canonical code, name, version | Which official master and code are authoritative? |
| Classification | trade group, level, sector, future-skills classification reference | Who owns taxonomy and effective dates? |
| ITI offering | ITI reference, course reference, approval reference, effective dates | Does approved availability count, or must delivery have started? |
| Operational status | approved, active, paused, discontinued, completed (illustrative) | Approve canonical states and transitions |
| Delivery instance | batch/cohort reference, start/end dates, delivery mode | Is a separate instance needed to count courses actually running? |
| Capacity | sanctioned/intake capacity, if required | Which source owns capacity and how is it distinguished from admissions? |

### ACD-01 definition choices requiring approval

DET must select and define the official measure:
1. **Approved courses:** courses formally approved for an ITI.
2. **Active offerings:** courses currently authorised/available at an ITI.
3. **Courses actually running:** offerings with a delivery instance that has commenced.

These are different counts. The dashboard must not combine them under one label. The authority may require more than one measure, but additional KPI IDs and display labels must be approved.

Existing/proposed trade profile arrays are not proof of any of the above. A course count must use the approved canonical course master and ITI-offering relationship.

## 6. Future-skills courses — ACD-02

Phase 0 requires an approved future-skills taxonomy and course-offering/delivery records; it does not define what qualifies as future skills.

### Proposed record concepts

- FutureSkillsTaxonomy: versioned DET-approved classification or list of qualifying course codes.
- CourseClassification: links a canonical course to an approved taxonomy entry with effective dates.
- ITICourseOffering / CourseDeliveryInstance: establishes that a classified course is offered or actually delivered at an ITI.

### Candidate attributes

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Taxonomy | taxonomy ID, version, qualifying code, label, effective dates | Who approves and maintains the taxonomy? |
| Course mapping | course ID/code, taxonomy entry, mapping source | Can one course map to multiple categories? |
| Offering | ITI, course, approval and effective period | Does the metric count approved, active or running offerings? |
| Delivery | cohort/batch, start/end, delivery status | Is actual delivery mandatory for inclusion? |
| Revision | old/new mapping, reason, effective date | How are historical counts restated after taxonomy changes? |

A course title containing terms such as “AI”, “IoT”, “robotics” or “cloud” must not automatically qualify. Classification must come from the approved taxonomy. Historical reporting must preserve which taxonomy version was applied.

## 7. Trainers trained — ACD-03

Phase 0 proposes a trainer registry and trainer-development event/completion records. It explicitly asks for unique-trainer count, completion/evidence criteria and cumulative versus period counting.

### Proposed record concepts

- Trainer: a person reference linked to the authoritative trainer/personnel source.
- TrainerDevelopmentProgramme: approved training programme/course definition.
- TrainerTrainingParticipation: trainer participation/enrolment in a programme instance.
- TrainerTrainingCompletion: verified completion outcome with evidence and source provenance.

### Candidate attributes

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Trainer identity | source person ID, source system, ITI/assignment history | Which system is authoritative and how are duplicates resolved? |
| Programme | programme code, title, provider, category, approved duration | Who approves qualifying programmes? |
| Participation | trainer, programme instance, enrolment/start/end | Does attendance/participation count, or only completion? |
| Completion | completion date, outcome, certificate/reference, verifier | What is the exact completion threshold and accepted proof? |
| Assignment | ITI and effective dates | Which ITI receives credit if a trainer changes ITI? |

### Counting choices requiring approval

- Unique trainers completing at least one qualifying programme during the reporting period.
- Unique trainers completing qualifying programmes cumulatively up to the snapshot date.
- Number of completed trainer-programme instances (not a unique-person count).

These measures are not interchangeable. If a trainer completes multiple programmes, a unique-trainer KPI counts that trainer once within the selected scope and period; a programme-completion count may count multiple completions. The official dashboard wording says “Number of trainers trained”, so the recommended interpretation to review is a unique-person count, but this remains a proposal until DET approves it.

A trainer must not count as trained solely because they registered, attended part of a programme or uploaded an unverified certificate unless the authority explicitly defines those as completion.

## 8. Admissions — ACD-04

The Phase 0 mapping requires admission/cohort records or integration with an authoritative Student MIS. `itis.student_strength` is not an admissions source.

### Proposed record concepts

- StudentIdentityReference: a privacy-conscious reference to the authoritative student identity; PM-SETU should avoid duplicating unnecessary personal details.
- Admission: an admission event with source ID, ITI, course, academic year/cohort, admission date and canonical admission state.
- AdmissionChange: an auditable event for cancellation, withdrawal, transfer, correction or other approved changes.
- AcademicCohort: the approved academic-year/cohort reference and boundaries.

### Candidate attributes

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Student identity | source student ID, source system, deduplication key/token | Which Student MIS is authoritative? Is a pseudonymous key available? |
| Admission event | admission reference, date, ITI, course, cohort, source status | What exact state means “admitted”? |
| Cohort | academic year, intake/session, cohort code | Who defines academic-year boundaries and cohort assignment? |
| Change events | cancellation, transfer, correction, duplicate merge | Are counts gross admissions or net active admissions? |
| Provenance | source record/batch, received time, validation status | How is reconciliation with the source performed? |

### Admission counting decisions

DET / Student MIS owner must approve:
- Whether the count is gross admission events or unique students admitted.
- Whether cancelled/withdrawn admissions are included, excluded or separately shown.
- How duplicate records, re-admissions and transfers are treated.
- Which date controls the academic year (application, admission approval, joining/reporting date).
- Whether course changes within an ITI count as a new admission.
- Whether the KPI is period-only or cumulative-to-date.

The dashboard must not expose student-level identity details. State/cluster/ITI/course/cohort aggregates should be generated from authorised reporting records.

## 9. Training completed — ACD-05

The Phase 0 mapping requires a training enrolment/progress/completion model or an authoritative Student/Training MIS integration. It explicitly prohibits deriving completion from `student_strength` or course profile data.

### Proposed record concepts

- TrainingEnrolment: one student's enrolment in an approved course/cohort/delivery instance.
- TrainingProgressEvent: dated progress or status events if the source system provides them and the owner approves their use.
- TrainingCompletion: verified completion outcome tied to an enrolment and completion criteria version.
- CompletionEvidence: secure reference to an accepted completion record/certificate/result, where required.

### Candidate attributes

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Enrolment | source enrolment ID, student reference, ITI, course, cohort | What is the unique enrolment grain? |
| Training period | start date, expected end date, actual end date | Which dates determine reporting period? |
| Progress | source status, last updated, attendance/progress facts | Which source fields are authoritative? |
| Completion | completion state, effective date, result/outcome, criteria version | What exactly means completed? |
| Evidence | certificate/result reference, issuing source, verifier | Is evidence mandatory and which source is authoritative? |
| Corrections | reopened result, amended completion, cancellation | How are corrections and reversals handled? |

### Completion definition decisions

The authority must define whether completion requires:
- finishing the prescribed training period;
- meeting an attendance threshold;
- completing practical/theory assessments;
- passing an examination or competency assessment;
- receiving a completion certificate;
- or a specific combination.

No threshold, pass condition, attendance rule or certificate requirement is assumed by this design.

The system must distinguish training completed from admission, enrolment, attendance, course availability and employment placement. Completion does not imply placement.

## 10. Shared academic data primitives

The following are logical concepts, not approved Prisma model names or database columns.

| Logical concept | Purpose | Important controls |
|---|---|---|
| AcademicYear | Canonical academic-year period | Approved start/end dates, code, version and correction policy |
| Course | Canonical course/trade master | Source code, canonical mapping, taxonomy version |
| ITICourseOffering | Approved/active offering relationship | ITI, course, approval, effective period, canonical state |
| CourseDeliveryInstance | Actual course delivery/batch | Offering, cohort, dates, delivery state |
| PersonReference | Privacy-conscious trainer/student reference | Source system and stable identifier; avoid unnecessary PII duplication |
| TrainerDevelopmentProgramme | Qualifying trainer-development programme | Approved programme identity and qualification criteria |
| TrainerTrainingRecord | Participation and completion facts | Distinguish attendance from verified completion |
| StudentAdmission | Admission event | Source reference, ITI/course/cohort and approved admission state |
| TrainingEnrolment | Student's course/cohort enrolment | Unique source identity and lifecycle history |
| TrainingCompletion | Verified completion outcome | Enrolment link, completion date and criteria version |
| EvidenceReference | Secure evidence metadata | Storage policy, checksum, access control and retention |
| SourceProvenance | Source/batch traceability | Source ID, source record ID, received/sync times and validation state |

A shared person reference should not imply that student and trainer records share the same source, permissions or lifecycle. Separate role/profile records may be required even if a common identity provider exists.

## 11. Academic reporting and review lifecycle — proposed only

The final lifecycle must follow the authoritative Student/Training MIS where that system is the source of truth. PM-SETU should not invent a parallel admission or examination workflow.

For PM-SETU-managed submissions or imported batches, a candidate ingestion/review flow is:

```text
RECEIVED
   |
   v
VALIDATING
   |             |
   v             v
ACCEPTED       REJECTED
   |
   v
RECONCILED
   |
   v
AVAILABLE FOR APPROVED AGGREGATION
```

These are conceptual processing stages, not approved database enums. Imported records should preserve the source's original status and map to PM-SETU canonical states only under an approved mapping contract.

Candidate controls:
- retain source status and source record reference;
- quarantine invalid or conflicting records;
- make imports idempotent using an approved source key;
- record batch-level counts (received, accepted, rejected, duplicate, corrected);
- preserve corrections and source restatements;
- do not silently overwrite accepted history;
- do not aggregate rejected, unvalidated or stale records as verified outcomes.

## 12. KPI definitions and aggregation — intentionally unresolved

| KPI | Candidate aggregation grain | Required approval |
|---|---|---|
| ACD-01 Courses | Distinct approved course offerings, active offerings or running delivery instances per ITI/period | Select exact inclusion state, course identity, period and duplicate rule |
| ACD-02 Future-skills courses | Distinct qualifying offerings/delivery instances mapped to a versioned approved taxonomy | Taxonomy, inclusion rule, taxonomy effective date and historical restatement |
| ACD-03 Trainers trained | Distinct trainer identities with qualifying verified completions in period or cumulatively | Unique-person key, qualifying programme, completion evidence, period/cumulative rule |
| ACD-04 Admissions | Unique admitted students or admission events by academic year, ITI, course and cohort | Counting unit, admitted state, cancellations, transfers, re-admissions, date and cohort rules |
| ACD-05 Training completed | Unique enrolments/students meeting approved completion criteria by cohort/course/academic year | Completion criteria, repeat-course handling, date, source and correction rules |

No formula is finalised. In particular:
- ACD-01 must not count proposed trades as courses offered.
- ACD-02 must not infer future-skills status from course names.
- ACD-03 must not count trainer registration or partial attendance as completion without approval.
- ACD-04 must not use ITI student capacity as admissions.
- ACD-05 must not use student capacity, admission count or course offering as completed trainees.

### Reporting periods

Candidate period types from Phase 3.1:
- Academic-year snapshot or academic-year total for ACD-01, ACD-02, ACD-04 and ACD-05.
- Reporting-period or cumulative snapshot for ACD-03, depending on the approved unique-trainer rule.

Academic-year boundaries, period cut-off, late-arriving data and historical restatement rules remain pending approval. Every aggregate must carry the academic year/period and source freshness/provenance metadata.

### Hierarchy and attribution

Candidate drill-down:
- ACD-01 / ACD-02: State → Cluster → ITI → Course.
- ACD-03: State → Cluster → ITI → Trainer / Training.
- ACD-04 / ACD-05: State → Cluster → ITI → Course / Cohort.

Confirm how trainers assigned to multiple ITIs are attributed, how students transferring between ITIs are counted, and whether shared courses/cohorts can be reported in multiple locations. A State total must not double-count the same person merely because their records are linked to multiple offerings or assignments.

## 13. Privacy, security and access

Academic records may contain personal and educational information. The final access policy must be approved by DET, Student/Training MIS owners and NIC/security.

Recommended controls for review:
1. Public dashboard responses contain only explicitly approved aggregate metrics.
2. Student-level records and identifiers are never exposed through public dashboard APIs.
3. Trainer-level details are restricted to authorised operational users where there is a documented need.
4. Use least-privilege role and resource-scope checks at every read/write endpoint.
5. Avoid copying student names, addresses, phone numbers, government identifiers or other unnecessary PII into PM-SETU.
6. Use pseudonymous source identifiers for reconciliation where feasible and approved.
7. Encrypt data in transit; confirm encryption-at-rest, key management, retention and breach response with deployment/DBA owners.
8. Evidence/document access must be separately authorised and audited.
9. Record access to sensitive person-level records where required by policy.
10. Define data retention, archival and deletion rules with the source owner and applicable policy before production.

These are security recommendations, not a claim that the current production deployment implements them.

## 14. Integration and source-of-truth requirements

Potential sources named in the Phase 0 architecture include Student/Training MIS and other government/department systems. The specific authoritative system for each academic KPI is not confirmed.

For each integration, obtain:
- system owner and formal permission;
- API/file interface specification and version;
- source identifiers for course, ITI, student, trainer, admission, cohort and enrolment;
- academic-year and status mapping;
- delivery schedule and expected freshness;
- authentication and secret-management requirements;
- pagination, rate limit, retry and idempotency rules;
- data correction/restatement and deletion semantics;
- reconciliation reports and accountable sign-off;
- privacy/legal basis and minimum necessary data fields.

Do not connect directly to external production databases. Do not create fake local source records to fill missing MIS data. If no approved source exists, mark the KPI unavailable or pending rather than displaying zero.

## 15. API proposal — no endpoints created

After DB-04, source ownership and access policy are approved, candidate API families may include:

| Method | Candidate route | Purpose |
|---|---|---|
| GET | `/api/v1/academic/courses` | List canonical courses within authorised scope |
| GET | `/api/v1/academic/itis/:itiId/course-offerings` | Read approved/active offerings |
| GET | `/api/v1/academic/course-deliveries` | Read approved delivery instances/cohorts |
| GET | `/api/v1/academic/trainer-development` | Read authorised trainer-development records/aggregates |
| GET | `/api/v1/academic/admissions` | Read restricted admission records or approved aggregates |
| GET | `/api/v1/academic/training-completions` | Read restricted completion records or approved aggregates |
| GET | `/api/v1/dashboard/academic-progress` | Read approved ACD-01 to ACD-05 aggregates and provenance |

These are examples, not a committed API contract. The final design may expose separate domain routes or use an existing MIS adapter. Avoid generic unvalidated JSON endpoints. Any person-level endpoint must have explicit authentication, permission and resource-scope checks. Dashboard endpoints must return only approved aggregates.

## 16. Data quality and reconciliation

Candidate checks for owner/DBA review:

- Every course offering references a canonical course and valid ITI.
- Course codes are mapped to an approved taxonomy version; unmapped codes are quarantined.
- An offering's effective period and status are valid under the approved state machine.
- A future-skills classification is supported by an effective approved taxonomy mapping.
- Trainer completions reference a valid trainer, programme instance and source completion record.
- Student admission records reference valid source student, ITI, course and academic cohort keys.
- Training completion references a valid enrolment and the applicable completion-criteria version.
- Duplicate source events are detected idempotently and not counted twice.
- Transfers, withdrawals, cancellations, re-admissions, repeat courses and corrections follow approved rules.
- Academic-year attribution is explicit and reproducible.
- Late-arriving and restated records retain original source timestamps and ingestion history.
- Missing data is never silently converted to zero.
- Dashboard aggregates reconcile to the source system's signed-off counts for the same scope and period.

Thresholds, tolerances, exact deduplication keys and validation ownership require source-owner approval.

## 17. Decisions required to close DB-04 / DASH-02

| Decision ID | Required decision | Proposed decision owner | Blocks |
|---|---|---|---|
| ACD-DEC-01 | Confirm authoritative course/trade master and canonical identifiers | DET / academic MIS owner | Course master |
| ACD-DEC-02 | Define ACD-01: approved, active or actually running courses; or separate measures | DET / State PMU | Course KPI |
| ACD-DEC-03 | Approve future-skills taxonomy, ownership, versioning and effective dates | DET / academic MIS owner | ACD-02 |
| ACD-DEC-04 | Confirm trainer source, unique identity key and cross-ITI assignment rules | DET / ITI / personnel MIS owner | Trainer registry/count |
| ACD-DEC-05 | Define qualifying trainer-development programme and completion/evidence criteria | DET / academic MIS owner | ACD-03 |
| ACD-DEC-06 | Choose trainer count semantics: period unique, cumulative unique or programme completions | DET / State PMU | ACD-03 aggregation |
| ACD-DEC-07 | Identify authoritative Student MIS and legal/interface permission | DET / Student MIS owner / NIC | Admissions and enrolments |
| ACD-DEC-08 | Define admission state, counting unit, academic-year date, cancellations, transfers and re-admissions | DET / Student MIS owner | ACD-04 |
| ACD-DEC-09 | Approve academic-year boundaries, cohort identity and course/cohort mapping | DET / academic MIS owner | ACD-01, ACD-02, ACD-04, ACD-05 |
| ACD-DEC-10 | Define training completion criteria, attendance/assessment requirements and completion evidence | DET / Student/Training MIS owner | ACD-05 |
| ACD-DEC-11 | Define repeat-course, transfer, withdrawal, correction and historical restatement rules | DET / Student/Training MIS owner | ACD-04 / ACD-05 |
| ACD-DEC-12 | Confirm source IDs, field mappings, refresh schedule, reconciliation and data-quality sign-off | DET / NIC / MIS owners | ETL and provenance |
| ACD-DEC-13 | Approve public aggregate allowlist and restricted person-level access matrix | DET / NIC / security owner | API/dashboard access |
| ACD-DEC-14 | Confirm whether PM-SETU stores academic events or only consumes external MIS aggregates | DET / NIC / MIS owners | Data ownership and schema boundary |

Approval records must identify authority, approver, decision date, exact decision, effective date and contract version. Until then, all candidate definitions remain proposals.

## 18. Implementation gates and exit criteria

### Gate A — design review (this document)

- [x] Phase 0 ACD-01 to ACD-05 source mapping reviewed.
- [x] Current backend gaps reconciled with the Phase 3.0 audit.
- [x] Courses, future-skills courses, trainer development, admissions and training completion separated.
- [x] Candidate entities, source ownership, privacy, integration and aggregation requirements documented.
- [x] Open decisions recorded.
- [ ] DET / academic MIS / Student-Training MIS review and DB-04 / DASH-02 approval.

### Gate B — schema and API implementation

Begin only after Gate A approval. Required inputs:
- approved course and future-skills taxonomy;
- named authoritative course, trainer, Student and Training sources;
- approved trainer completion and admission/completion rules;
- academic-year and cohort definitions;
- approved identifier/deduplication and correction policies;
- source interface and data-sharing approvals;
- approved role/scope/privacy matrix;
- DBA/NIC migration and integration confirmation.

Then implement only the agreed ownership model: PM-SETU-managed records, external MIS integration, or a clearly defined hybrid. Do not duplicate the full external Student MIS without an approved reason.

### Gate C — KPI verification

- Reconcile course/learner/trainer aggregates against the source owner for the same period and scope.
- Verify unique-person counts across transfers, multiple courses and repeated training.
- Verify late, duplicate, corrected, withdrawn and restated records.
- Verify taxonomy changes do not silently rewrite historical results.
- Verify public responses contain only approved aggregates and no personal identifiers.
- Mark each KPI VERIFIED only after source-owner reconciliation and acceptance.

## 19. Phase 3.3 deliverable status

| Deliverable | Status |
|---|---|
| Academic KPI source mapping | Reviewed |
| ACD-01 course/offering design | Drafted |
| ACD-02 future-skills taxonomy design | Drafted; taxonomy approval pending |
| ACD-03 trainer development design | Drafted; identity/completion rules pending |
| ACD-04 admission/cohort design | Drafted; Student MIS and counting rules pending |
| ACD-05 training completion design | Drafted; completion rules/source pending |
| Shared academic reporting concepts | Proposed |
| Privacy and integration requirements | Proposed; owner/security approval pending |
| Production Prisma schema / migration | Not created — DB-04 gate |
| Academic API / dashboard aggregation | Not created — DB-04 and access/source gates |
| Departmental / MIS approval | Pending |

**Phase 3.3 design work is complete as a proposal. Production implementation is intentionally gated, not silently treated as complete.**

## 20. Source references

- Phase 0 — `PM_SETU_Phase_0_Dashboard_KPI_Source_Mapping.xlsx`, sheet `KPI Source Mapping`, rows ACD-01 through ACD-05; sheet `Open Decisions`, DASH-02, DASH-06 to DASH-10.
- Phase 0 — `PM_SETU_Phase_0_Data_Dictionary_and_Architecture.xlsx`, sheet `Open Decisions`, DB-04.
- Phase 0 — `PM_SETU_Phase_0_System_Architecture_Design.docx`, Phase 3 dashboard and Phase 4 integration sections.
- Repository — `docs/phase-3/PHASE_3_0_DASHBOARD_DATA_AUDIT.md`.
- Repository — `docs/phase-3/PHASE_3_1_REPORTING_DATA_CONTRACT.md`.
- Repository — `docs/phase-3/PHASE_3_2_PHYSICAL_PROGRESS_DESIGN.md`.

This document preserves the Phase 0 KPI terminology and marks all additional technical structures as proposals pending the relevant authority's approval.
