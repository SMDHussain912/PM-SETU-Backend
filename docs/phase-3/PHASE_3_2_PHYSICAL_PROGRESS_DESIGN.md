# Phase 3.2 — Physical Progress Reporting Design

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Design version:** Draft 0.1  
**Status:** Technical design proposal — DB-03 / departmental approval pending  
**Depends on:** Phase 3.0 Dashboard Data Audit; Phase 3.1 Reporting Data Contract  
**Scope:** Civil works, equipment procurement/installation, laboratories and smart classrooms (PHY-01 to PHY-04).

> **Approval boundary:** This document translates the Phase 0 KPI mapping into an implementable technical proposal. It is not an approved departmental data model. No production Prisma models, SQL migrations, API routes, status enums, progress formulas, weights, evidence rules, or permissions are introduced by this phase until DET / State PMU and the engineering data owner approve DB-03.

## 1. Purpose and source basis

Phase 0 identifies four physical-progress measures:

| KPI ID | Official KPI label | Phase 0 source expectation |
|---|---|---|
| PHY-01 | Civil works | Progress/status of civil works |
| PHY-02 | Equipment procurement / installation | Procurement and installation progress |
| PHY-03 | Labs | Lab availability / development status |
| PHY-04 | Smart classrooms | Smart classroom availability / development status |

The source mapping explicitly says the formula and unit are not specified for PHY-01 and PHY-02, that equipment stages must be distinguished, that labs need a structured inventory and operational criteria, and that smart classrooms need a minimum definition. It also identifies the drill-down hierarchy as State → Cluster → Hub ITI → Spoke ITI → Activity.

The revised programme document also lists **Workshop Modernisation** under the conceptual physical-progress dashboard. The Phase 0 KPI source mapping does not assign it a KPI ID. It is therefore recorded as a scope clarification, not silently added as a fifth KPI in this design.

The existing backend audit found no dedicated civil-work, equipment, lab-progress, or smart-classroom reporting model. `itis.lab_details` is free text and is not a verified inventory.

## 2. Design goals

1. Record physical work and assets at a traceable ITI/activity scope.
2. Separate master/inventory records from periodic progress submissions.
3. Preserve source evidence and the history of corrections and approvals.
4. Support reporting periods and the approved State → Cluster → Hub ITI → Spoke ITI → Activity hierarchy.
5. Distinguish reported, reviewed, accepted, rejected and returned data without assuming the official workflow vocabulary.
6. Make KPI aggregation a consequence of approved definitions, not an arbitrary percentage calculation.
7. Keep dashboard reads inside the PM-SETU reporting repository; external source systems must integrate through an approved ETL/API process.
8. Avoid exposing restricted evidence documents through public dashboard endpoints.

## 3. Proposed conceptual architecture

```text
ITI / authorised reporting user
            |
            v
Physical Progress API
            |
            +---- Physical work / asset records
            |
            +---- Periodic progress submissions
            |
            +---- Evidence metadata and secure file references
            |
            v
Review / validation workflow
            |
            v
Approved reporting records
            |
            v
PM-SETU reporting repository
            |
            v
Dashboard aggregation API
            |
            v
State → Cluster → Hub ITI → Spoke ITI → Activity
```

This is an internal logical design. It does not authorise direct writes from an external MIS or direct dashboard queries against external production databases. Approved integrations must use the Phase 3.1 source/integration contract.

## 4. Proposed domain boundaries

The design separates four physical domains. Shared reporting and evidence concepts may be reused, but each domain retains its own facts and lifecycle.

### 4.1 Civil works — PHY-01

**Proposed record concepts**

- CivilWorkProject: a defined civil-work activity associated with an ITI and approved programme scope.
- CivilWorkMilestone: a project milestone, only where the engineering authority provides an approved milestone catalogue or project-specific milestone definition.
- PhysicalProgressSubmission: a dated submission for a reporting period.
- ProgressEvidence: metadata linking a submission or milestone to supporting evidence.

**Candidate fields for review (not approved schema)**

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Project identity | project reference, ITI, title, work category | Official project identifier and category owner |
| Scope | approved scope description, location, sanctioned scope reference | Which scope document is authoritative |
| Contractor / agency | agency reference, contract reference | Whether these are required and which source owns them |
| Milestone | milestone code/name, planned dates, actual dates, state | Standard catalogue vs project-specific milestones |
| Progress | reported quantity, unit, period, cumulative quantity | Engineering measurement method and units |
| Cost | contract value, certified amount, expenditure | Whether financial data belongs here or only in Phase 3.4 |
| Evidence | document/photo reference, capture date, uploader, reviewer | Accepted evidence types, retention and verification |

**Not defined by this proposal:** a universal civil-work completion percentage, milestone weights, cost-weighted progress, physical-versus-financial progress formula, or the meaning of “started” and “completed”.

### 4.2 Equipment procurement and installation — PHY-02

Procurement and installation must not be collapsed into one ambiguous status. The source mapping explicitly asks to distinguish ordered, received, installed and commissioned.

**Proposed record concepts**

- EquipmentItem: one identifiable equipment item or approved equipment lot.
- EquipmentRequirement: approved requirement/specification and quantity for a defined ITI/activity, if the authority confirms that requirement tracking is in scope.
- EquipmentEvent: a dated event such as order, receipt, installation, inspection or commissioning.
- ProgressEvidence: supporting purchase, delivery, installation or commissioning records.

**Candidate lifecycle checkpoints for approval**

| Candidate checkpoint | Minimum evidence concept | Approval question |
|---|---|---|
| Required / planned | Approved requirement or equipment plan | Is the approved plan the denominator for reporting? |
| Ordered | Purchase order / contract reference and date | Does an issued order count as procurement progress? |
| Received | Delivery / goods-receipt record and accepted quantity | How are partial deliveries, rejected items and returns handled? |
| Installed | Installation record, location and date | Who verifies installation and what evidence is mandatory? |
| Commissioned / functional | Test / commissioning certificate or approved checklist | What qualifies as functional and who certifies it? |

These are candidate checkpoints, not approved status values. The final model must support partial quantities and multiple deliveries if the business owner confirms that requirement. Do not assume one equipment item always maps to one purchase order or one receipt.

**KPI clarification:** DET / engineering owner must decide whether PHY-02 is reported as one combined measure or as separate procurement and installation measures. The conceptual dashboard wording mentions both procurement and installation percentages, but the Phase 0 mapping assigns one KPI ID.

### 4.3 Laboratories — PHY-03

A laboratory must be a structured inventory record, not a parsed value from `itis.lab_details`.

**Proposed record concepts**

- Lab: an identifiable lab at an ITI, with a defined category and location.
- LabReadinessAssessment: a dated assessment of readiness/operational criteria.
- LabEvidence: secure references to equipment lists, inspection records, photographs or certificates where approved.

**Candidate attributes**

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Identity | lab reference, name, category, ITI, location | Official lab taxonomy and identifier |
| Scope | associated trade/course/activity | Whether one lab may serve multiple trades |
| Setup | establishment date, setup stage | What counts as “established” |
| Equipment | linked equipment items or approved inventory reference | Whether equipment completeness is required for lab readiness |
| Functionality | assessment date, checklist result, assessor | Minimum functional/operational criteria |
| Evidence | inspection report, photos, certificates | Mandatory evidence and verification authority |

**Important:** lab existence, lab establishment, lab readiness and operational functionality are different facts. The authority must decide which one PHY-03 represents. A room or lab name alone must not imply operational readiness.

### 4.4 Smart classrooms — PHY-04

**Proposed record concepts**

- SmartClassroom: an identifiable classroom at an ITI.
- ClassroomReadinessAssessment: a dated assessment against an approved minimum definition.
- ClassroomEvidence: secure references to installation and functional verification evidence.

**Candidate attributes**

| Concept | Candidate attributes | Decision required |
|---|---|---|
| Identity | classroom reference, ITI, building/block, room | Official identity and location convention |
| Components | approved equipment/component checklist | Minimum smart-classroom component set |
| Installation | component installation dates and references | Whether component-level tracking is needed |
| Functionality | assessment date, test/checklist result | What qualifies as functional |
| Availability | available/unavailable period or assessment state | Whether downtime must be recorded |
| Evidence | inspection/test record and photographs | Mandatory evidence and verifier |

A classroom must not count as a smart classroom solely because it has a display device or because an ITI profile contains a descriptive note. The minimum definition and functional test must be approved.

## 5. Shared reporting primitives

The following logical concepts are recommended for reuse across the four domains. Names are illustrative and are not approved Prisma model names.

| Logical concept | Purpose | Minimum conceptual data |
|---|---|---|
| PhysicalActivity | Connects a physical work/activity to an ITI and programme scope | Stable ID, activity type, ITI reference, title, external reference if applicable |
| ProgressSubmission | Captures a dated report for an identified reporting period | Activity/asset reference, period, submitter, submitted timestamp, version |
| EvidenceReference | Records evidence metadata without making the file public | Evidence ID, storage key/reference, media/document type, checksum, uploaded by, uploaded at |
| ReviewDecision | Records review outcome and accountability | Submission version, reviewer, decision, timestamp, reason/comment |
| ChangeHistory | Preserves correction/revision history | Entity, prior version, new version, actor, timestamp, reason |
| SourceProvenance | Identifies where imported data came from | Source system, source record/batch reference, received timestamp, sync reference |

A shared abstraction should not erase domain-specific requirements. Civil-work quantities, equipment receipt quantities, lab readiness and classroom functionality are not interchangeable data types.

## 6. Submission and review lifecycle — proposed only

The following is a workflow option for departmental review. It is not an approved state machine.

```text
DRAFT
  |
  v
SUBMITTED
  |
  v
UNDER_REVIEW
  |             |
  v             v
ACCEPTED      RETURNED
                  |
                  v
                DRAFT
```

A separate REJECTED outcome may be required. The authority must decide whether a submitted report can be withdrawn, whether accepted reports can be amended, who may reopen a period, and whether a later submission supersedes or supplements an earlier one.

**Controls recommended for approval**

- Submission versions are immutable after submission; corrections create a new version.
- Every review decision records actor, timestamp and reason.
- Only accepted/approved versions feed verified dashboard aggregates.
- Returned or rejected reports remain visible to authorised reviewers but are excluded from verified totals.
- A late submission or correction must not silently overwrite an earlier reporting period.
- Evidence must remain access-controlled and auditable.
- The official role matrix and hierarchy scope rules must govern create, submit, review and view operations.

No role grants are inferred here. In particular, do not assume a Cluster Admin can approve an ITI's own physical progress submission.

## 7. Evidence and verification contract

Evidence is a first-class part of the reporting design, but the required evidence differs by domain.

| Domain | Candidate evidence | Verification question |
|---|---|---|
| Civil works | Work order, engineer measurement/inspection, milestone certificate, dated site photos | Which documents prove a milestone or measured quantity? |
| Equipment | Purchase order, goods receipt, delivery note, installation record, commissioning/test certificate | Which events require independent verification? |
| Labs | Inventory, inspection checklist, functional test, commissioning record | Who certifies lab readiness and how often? |
| Smart classrooms | Approved component checklist, installation record, functional test, inspection photos | What is the minimum component and functionality standard? |

**Storage and access controls**

- Store file bytes in the approved document/object storage platform; store only stable metadata and storage references in reporting records.
- Do not expose raw storage keys or private evidence URLs in public dashboard responses.
- Enforce file type/size validation, malware scanning, access checks, retention and backup policies as approved under the Phase 0 file-storage decision.
- Record uploader, upload timestamp, evidence type, associated entity/submission version and checksum where supported.
- Evidence deletion, replacement and retention must follow an approved policy; do not hard-delete evidence that is part of an accepted audit trail.

The production storage platform and policy are not established by this design. The Phase 0 file-storage decision remains a dependency.

## 8. KPI aggregation rules — intentionally unresolved

| KPI | Candidate aggregation | Must be approved before implementation |
|---|---|---|
| PHY-01 Civil works | Count of projects by approved state, milestone status, measured quantity, or approved completion percentage | KPI meaning, unit, denominator, milestone catalogue/weights, period, treatment of paused/cancelled work |
| PHY-02 Equipment | Quantities or items by approved procurement/installation checkpoints | Whether one or multiple KPIs, denominator, partial quantities, returns, commissioning rule |
| PHY-03 Labs | Distinct labs by approved establishment/readiness/operational state | Lab definition, operational checklist, shared-lab treatment, period/as-of semantics |
| PHY-04 Smart classrooms | Distinct classrooms by approved setup/functional state | Minimum component definition, functional test, downtime treatment, period/as-of semantics |

No percentage formula is adopted. In particular, do not assume:

- completed milestones / total milestones;
- installed quantity / planned quantity;
- commissioned items / ordered items;
- operational labs / total labs;
- functional classrooms / total classrooms.

Each ratio needs an approved numerator, denominator, exclusions, unit, period, and zero-denominator rule.

### Aggregation hierarchy

Candidate drill-down path from the Phase 0 mapping:

`State → Cluster → Hub ITI → Spoke ITI → Activity`

Before implementation, confirm:
- whether every activity belongs to exactly one ITI;
- whether an activity may span multiple ITIs or clusters;
- how shared facilities are attributed;
- whether Hub and Spoke ITIs are both independently reportable;
- whether activity-level records can be shown to public users;
- whether a cluster-level total is a sum, distinct count or deduplicated measure.

Never duplicate a shared asset or activity merely because it is linked to multiple trades, courses or ITIs.

## 9. API proposal — no endpoints created

After DB-03 and access-policy approval, the following route families may be considered. They are design examples only.

| Method | Candidate route | Purpose |
|---|---|---|
| GET | `/api/v1/physical-progress/activities` | List activities within the caller's authorised scope |
| POST | `/api/v1/physical-progress/activities` | Create an activity, if the approved role may do so |
| GET | `/api/v1/physical-progress/activities/:id` | Read activity and permitted progress history |
| POST | `/api/v1/physical-progress/activities/:id/submissions` | Create/submit a reporting-period version |
| GET | `/api/v1/physical-progress/submissions/:id` | Read submission and review state |
| POST | `/api/v1/physical-progress/submissions/:id/review` | Record an authorised review decision |
| GET | `/api/v1/dashboard/physical-progress` | Read approved aggregates with period and provenance metadata |

The final API may use separate civil-works/equipment/lab/classroom resources if the domain owners require different workflows. Do not create a generic endpoint that accepts arbitrary JSON and bypasses domain validation.

All endpoints must use request validation, authentication, role/permission checks and resource-scope enforcement. Public dashboard endpoints must return only approved aggregates. Evidence access must be a separate authorised operation.

## 10. Data integrity and audit requirements

Proposed technical controls, subject to DBA/NIC review:

1. Use stable primary keys and explicit foreign keys for ITI, activity, asset, submission and review relationships.
2. Use database constraints for required references and uniqueness rules once business identity rules are approved.
3. Store dates/timestamps consistently and preserve the reporting period represented by each submission.
4. Use decimal-safe numeric types for measured quantities; never use floating-point for financial amounts.
5. Store units explicitly for measured quantities; do not combine incompatible units.
6. Make accepted submission versions immutable; use a new version for corrections.
7. Record actor, timestamp, action, entity, previous/new version and reason for state-changing operations.
8. Keep submission state transitions and audit writes transactionally consistent.
9. Prevent duplicate evidence references from being counted as separate physical progress.
10. Do not derive verified KPI values from draft, returned, rejected or stale submissions.

Exact column types, indexes, unique constraints, delete behaviour, enum representation and migration strategy require DBA/NIC approval after the business contract is signed off.

## 11. Data quality and exception handling

Candidate validation checks:

- ITI/activity references exist and are within the submitter's authorised scope.
- Reporting period is valid and does not overlap another accepted submission unless the approved policy allows it.
- Quantities are non-negative and have an approved unit.
- Received quantity does not exceed ordered quantity unless an approved adjustment/return model explains the difference.
- Installation/commissioning events reference the relevant equipment item or lot.
- A lab/classroom cannot be reported operational without the approved readiness evidence and assessment.
- Evidence metadata is complete and the referenced file passes storage/security checks.
- Conflicting or duplicate external references are quarantined for reconciliation.
- Late, missing, partial and stale data are explicitly represented; missing data is never silently converted to zero.

These are candidate engineering controls. Thresholds, tolerances, correction windows and the exact operational validation checklist must be approved by the relevant owner.

## 12. Decisions required to close DB-03

| Decision ID | Required decision | Proposed decision owner | Blocks |
|---|---|---|---|
| PHY-DEC-01 | Define “civil works” scope and canonical project/activity identity | DET / engineering data owner | Civil-work entity |
| PHY-DEC-02 | Choose civil-work KPI unit: status, milestone, measured quantity, percentage, or combination | DET / engineering data owner | PHY-01 aggregation |
| PHY-DEC-03 | Approve civil-work milestone catalogue, weights (if any), measurement rules and evidence | Engineering data owner | PHY-01 formula/workflow |
| PHY-DEC-04 | Confirm equipment tracking grain: item, lot, category or requirement line | DET / engineering data owner | Equipment schema |
| PHY-DEC-05 | Confirm equipment lifecycle checkpoints and partial delivery/return handling | DET / engineering data owner | PHY-02 workflow |
| PHY-DEC-06 | Decide whether procurement and installation are separate dashboard KPIs | DET / State PMU | KPI register/API |
| PHY-DEC-07 | Define lab identity, taxonomy, establishment and operational criteria | DET / ITI engineering owner | PHY-03 schema/count |
| PHY-DEC-08 | Define smart classroom minimum components and functional criteria | DET / ITI engineering owner | PHY-04 schema/count |
| PHY-DEC-09 | Confirm reporting period, submission frequency, cut-off and late correction policy | DET / State PMU | Submission model |
| PHY-DEC-10 | Approve evidence types, mandatory evidence, verifier and retention | DET / engineering data owner / NIC | Evidence workflow |
| PHY-DEC-11 | Approve roles, review levels, scope inheritance and public/internal visibility | DET / NIC / security owner | API and permissions |
| PHY-DEC-12 | Confirm activity hierarchy, shared assets and cross-ITI attribution | DET / State PMU | Aggregation and joins |
| PHY-DEC-13 | Confirm whether Workshop Modernisation is in scope and whether it needs a KPI ID | DET / State PMU | KPI register / scope |
| PHY-DEC-14 | Approve source-of-truth and integration method for each physical domain | DET / NIC / source owners | ETL and provenance |

An approval record must identify the approver/authority, decision date, decision text, effective date and contract version. Meeting notes or an informal assumption must not be treated as approval.

## 13. Implementation gates and exit criteria

### Gate A — design review (this document)

- [x] Phase 0 physical KPI source mapping reviewed.
- [x] Current backend physical-progress gaps reconciled with Phase 3.0 audit.
- [x] Four physical KPI domains separated and documented.
- [x] Candidate entities, lifecycle options, evidence, API and aggregation concerns documented.
- [x] Open decisions recorded.
- [ ] DET / engineering data owner review and DB-03 approval.

### Gate B — schema and API implementation

Begin only after Gate A approval. Required inputs:
- approved DB-03 decision register;
- approved KPI definitions, units, formulas and periods;
- approved entity identities and hierarchy;
- approved lifecycle and evidence checklist;
- approved role/scope/review matrix;
- DBA/NIC migration and storage confirmation.

Then implement Prisma models, migration, validation schemas, services, repositories, routes, audit integration and tests as one traceable increment.

### Gate C — KPI verification

- Reconcile submitted records against the authoritative source/evidence.
- Verify partial, rejected, corrected, late and stale cases.
- Verify all hierarchy aggregations against known sample fixtures.
- Verify access boundaries and evidence privacy.
- Mark a KPI VERIFIED only after source-owner reconciliation and acceptance.

## 14. Phase 3.2 deliverable status

| Deliverable | Status |
|---|---|
| Physical KPI source mapping | Reviewed |
| Domain design proposal | Drafted |
| Shared reporting/evidence concepts | Proposed |
| Lifecycle and review workflow | Proposed; approval pending |
| KPI formulas and units | Not defined; approval required |
| Production Prisma schema / migration | Not created — DB-03 gate |
| Physical-progress API | Not created — DB-03 and access gate |
| Dashboard physical KPI aggregation | Not created — KPI definition/source gate |
| Departmental approval | Pending |

**Phase 3.2 design work is complete as a proposal. Production implementation is intentionally gated, not silently treated as complete.**

## 15. Source references

- Phase 0 — `PM_SETU_Phase_0_Dashboard_KPI_Source_Mapping.xlsx`, sheet `KPI Source Mapping`, rows PHY-01 through PHY-04; sheet `Open Decisions`, DASH-01.
- Phase 0 — `PM_SETU_Phase_0_Data_Dictionary_and_Architecture.xlsx`, sheet `Open Decisions`, DB-03.
- Phase 0 — `PM_SETU_Phase_0_System_Architecture_Design.docx`, Phase 3 dashboard section and architecture/decision sections.
- Repository — `docs/phase-3/PHASE_3_0_DASHBOARD_DATA_AUDIT.md`.
- Repository — `docs/phase-3/PHASE_3_1_REPORTING_DATA_CONTRACT.md`.

This document preserves the Phase 0 source terminology and marks all additional technical structures as proposals pending the relevant authority's approval.
