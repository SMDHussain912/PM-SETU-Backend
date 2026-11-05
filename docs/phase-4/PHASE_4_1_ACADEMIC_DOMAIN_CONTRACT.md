# Phase 4.1 — Academic Domain Contract

**Branch:** `main`  
**Status:** Draft contract; departmental and MIS-owner approval required  
**Scope:** ACD-01 to ACD-05

## 1. Purpose

Define the minimum shared contract needed to integrate academic and training data without inventing official business rules or replacing an existing system of record. This is a design contract, not a production schema or approved API.

## 2. KPI boundary

| KPI | Required subject | Must not be inferred from |
|---|---|---|
| ACD-01 Courses | Canonical course/trade and an ITI offering | `existingTrades` / `proposedTrades` profile arrays |
| ACD-02 Future skills courses | Course mapped to an approved, versioned future-skills taxonomy and qualifying offering | Course title keywords or developer-defined categories |
| ACD-03 Trainers trained | Trainer identity plus qualifying, evidenced training completion | Registration or attendance unless formally approved |
| ACD-04 Admissions | Authoritative admission event attributed to an approved academic year/cohort | `studentStrength` |
| ACD-05 Training completed | Verified trainee/course/cohort completion event | Student strength, enrolment alone, apprenticeship or OJT |

Apprenticeship and OJT remain industry outcomes (IND-01/IND-02), not ACD-05.

## 3. Logical contract boundaries

The following are conceptual records. Names and attributes are candidates for review, not approved database columns.

| Boundary | Minimum information to exchange | Authority decision still required |
|---|---|---|
| Course master | Source course ID, source system, display name, code, version/effective period | Canonical master, code system and versioning |
| Future-skills classification | Taxonomy ID/version, course reference, effective dates | Approved taxonomy and qualifying rules |
| ITI offering | ITI source reference, course reference, approval/source reference, effective period | Approved vs active vs actually running |
| Trainer development | Trainer source reference, programme reference, participation/completion evidence, completion date | Trainer identity, qualifying programme and completion rule |
| Admission | Student source reference/token, admission source ID, ITI/course/cohort references, event date and source status | Privacy-safe identifier, admission states, year/cohort and counting grain |
| Training completion | Enrolment/source reference, student token, course/cohort reference, completion date, outcome/evidence reference | Completion threshold, accepted evidence, reversals and restatements |

## 4. Shared integration envelope

Every imported record should be traceable to its source. The proposed envelope is:

- `sourceSystem`: stable identifier for the approved source.
- `sourceRecordId`: identifier assigned by that source.
- `sourceRecordVersion`: source version or change token, when provided.
- `sourceUpdatedAt`: source-side update timestamp, when provided.
- `receivedAt`: PM-SETU receipt timestamp.
- `syncBatchId`: identifier for the import/reconciliation batch.
- `contractVersion`: version of the agreed interface contract.
- `validationStatus` and `validationErrors`: ingestion/review outcome.

These are integration concepts only. Final field names, nullability, timestamp semantics, validation states and retention must be agreed with the source owner before implementation.

## 5. Identity, history and reconciliation

1. Use source-owned identifiers; do not create a new student or trainer identity system by assumption.
2. Keep person identifiers privacy-preserving in reporting storage. Personally identifying fields must not enter public dashboard responses.
3. Do not deduplicate people using names, phone numbers or other weak identifiers. Obtain an approved matching key and conflict process.
4. Preserve source event IDs and history for cancellations, transfers, re-admissions, course changes, corrections and completion reversals.
5. Make imports idempotent using an owner-approved source key/version strategy.
6. Quarantine invalid, duplicate, stale or unresolvable records from verified KPI aggregation; retain an auditable reason.
7. Reconcile source totals, accepted records, rejected records and changed records per batch.
8. Never silently overwrite an earlier accepted event. Corrections must remain traceable to the source and batch.

## 6. Reporting contract requirements

Before calculating ACD-01..ACD-05, the authority must approve:

- KPI definition and counting grain (unique people, events, offerings or delivery instances).
- Academic year, cohort, reporting period and effective-date rules.
- State → Cluster → ITI → Course / Cohort / Trainer attribution rules.
- Treatment of transfers, cancellations, re-admissions, repeats and corrected records.
- Snapshot versus period-flow semantics and whether historical figures are restated.
- Source owner, refresh schedule, data freshness threshold and reconciliation sign-off.
- Role access, retention and evidence visibility.

No KPI formula, date range, state vocabulary, future-skills classification or completion threshold is fixed by this draft.

## 7. API and security boundary

- Integrations must use an approved API or controlled file exchange. No direct connection to an external production MIS database is assumed.
- Authenticate and authorise source integrations independently of public dashboard routes.
- Validate payloads against a versioned contract; reject or quarantine incompatible versions.
- Keep raw payload/evidence access restricted and audited.
- Expose only approved aggregate fields through public dashboard endpoints. Student and trainer identities, admission events and evidence references are not public fields.
- Do not add operational academic endpoints or role grants until the source, privacy and access decisions are approved.

## 8. Decisions blocking production implementation

| Decision | Required confirmation |
|---|---|
| DB-04 academic source and data definitions | DET and relevant MIS owner |
| DASH-02 ACD-01..ACD-05 definitions | Academic KPI owner |
| DASH-06 reporting periods | DET / academic MIS owner |
| DASH-07 aggregation hierarchy | DET / reporting owner |
| DASH-08 source ownership | DET / MIS owners |
| DASH-09 interface and refresh model | NIC / source-system owners |
| Student/trainer identifier and privacy controls | Data owner / security and privacy authority |
| Evidence, correction and reconciliation process | Relevant MIS owner |

Until confirmed, the existing ITI profile fields remain descriptive only and must not be presented as verified academic outcomes.

## 9. Phase 4.1 exit

- Academic KPI boundaries and non-inference rules documented.
- Logical source contracts and shared provenance requirements documented.
- Privacy, history, reconciliation and reporting requirements documented.
- No production academic schema, migration, API, formula or external integration added because the authoritative definitions and interfaces remain unverified.

**Next safe step:** obtain the listed decisions and source-interface specification. Then implement only the approved course, trainer, admission and completion slices, followed by KPI aggregation and regression tests.
