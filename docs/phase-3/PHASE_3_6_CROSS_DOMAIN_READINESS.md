# Phase 3.6 — Cross-Domain Consolidation & Implementation Readiness

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Design version:** Draft 0.1  
**Status:** Consolidated technical readiness assessment — departmental, source-owner and security approvals pending  
**Depends on:** Phase 3.0 dashboard audit; Phase 3.1 reporting data contract; Phases 3.2–3.5 domain designs  
**Scope:** All 26 Phase 0 dashboard KPIs across programme coverage, physical progress, academic progress, industry outcomes and financial progress.

> **Approval boundary:** This document consolidates repository evidence and the Phase 0 requirements baseline. Readiness labels below are planning classifications, not approved business statuses or production enums. They do not certify production data, external-system availability, departmental approval, or deployed security. No production Prisma models, migrations, KPI formulas, dashboard routes, source integrations or access grants are created by this phase.

## 1. Executive outcome

The Phase 3 domain-design set is complete as a set of technical proposals. The repository evidence supports a limited registry snapshot, partial SIP workflow counts and several descriptive profile fields. It does not yet support a trustworthy end-to-end implementation-monitoring dashboard for physical delivery, academic outcomes, industry outcomes or financial actuals.

The key distinction is between **data being present in the application** and **a KPI being ready to publish**. A registry row, profile field, proposal amount, workflow status or free-text description is not automatically a verified outcome.

### Consolidated result

| Domain | KPI IDs | Repository evidence summary | Readiness conclusion |
|---|---|---|---|
| Programme coverage / SIP progress | REG-01–REG-06 | Registry entities and count queries exist; SIP status counts are queryable | Candidate registry snapshot; semantics and status policy pending |
| Physical progress | PHY-01–PHY-04 | Free-text lab details only; no dedicated progress/inventory records evidenced | No authoritative operational KPI source |
| Academic progress | ACD-01–ACD-05 | Existing/proposed trade profile arrays; student_strength is capacity/profile data | No authoritative academic outcome source |
| Industry outcomes | IND-01–IND-06 | No apprenticeship, OJT, exposure, placement or structured employer participation records evidenced | No authoritative outcome source |
| Financial progress | FIN-01–FIN-05 | AIP investment and SIP proposal/contribution proxies; no approved outlay/release/expenditure ledger evidenced | No authoritative financial actuals source |

**No KPI is considered formally approved or verified by this document.** Phase 0 owners are proposed owners only until an approval record names the accountable authority, effective date and approved definition version.

## 2. Evidence basis and limitations

This readiness assessment consolidates:

1. Phase 0 Dashboard KPI Source Mapping workbook (26 official KPI rows).
2. Phase 0 Data Dictionary and Architecture decisions, including DB-03, DB-04, DB-05, DB-08, DB-09, DB-11 and DB-12.
3. Phase 0 Gap Register and Master Backlog, including PB-003 and PB-005 through PB-008.
4. Phase 3.0 source/schema audit.
5. Phase 3.1 reporting data contract.
6. Phase 3.2 physical progress design.
7. Phase 3.3 academic progress design.
8. Phase 3.4 industry outcomes design.
9. Phase 3.5 financial progress design.

### Evidence boundary

The Phase 3.0 audit inspected repository source, Prisma schema/migrations and dashboard modules. It did not inspect or reconcile the production database, verify deployed configuration, confirm external MIS interfaces, certify data quality, or perform a penetration test. Later domain designs are proposals based on the Phase 0 workbook and that repository audit.

Accordingly:
- “Exists” means the relevant field/model/query was evidenced in the inspected repository, not that production contains complete or correct records.
- “Not evidenced” means it was not found in the inspected source/schema scope; it is not proof that no external system holds the data.
- Proposed owners, periods, hierarchy levels and API resources remain subject to approval.
- The existing dashboard endpoints must not be assumed to satisfy the future reporting contract.

## 3. Readiness classification

The following labels are used only in this document to make planning decisions consistent.

| Classification | Meaning | Permitted interpretation |
|---|---|---|
| EXISTING_SOURCE_CANDIDATE | Relevant registry source and query are evidenced | May be prepared for controlled snapshot reporting after semantic/access approval; not yet approved or verified |
| PARTIAL_WORKFLOW_SOURCE | Some workflow records/counts exist but canonical state semantics or transitions are pending | Do not publish as an authoritative KPI until approved |
| PARTIAL_PROFILE_ONLY | Descriptive profile fields exist but do not prove the official measure | Display only as clearly labelled profile information if separately approved; not as the KPI |
| PARTIAL_PROXY_ONLY | A numeric/proposal field resembles the KPI but is not authoritative evidence | Must not be labelled as the KPI |
| NO_AUTHORITATIVE_SOURCE | No suitable operational source/model was evidenced | KPI unavailable until approved source/model is established |
| DEFINITION_PENDING | Meaning, unit, counting grain or formula is not approved | Do not calculate or publish a value |
| SOURCE_INTEGRATION_PENDING | Authoritative source may exist outside this repository but its interface/ownership is unconfirmed | Do not claim integration or freshness |
| ACCESS_POLICY_PENDING | Public/internal visibility and role/scope policy remain unresolved | No new public/internal exposure until server-side policy is approved and tested |

A KPI can have more than one blocker. The matrix records the dominant evidence classification and the required gates; it does not imply that completing one task makes the KPI publishable.

## 4. Complete 26-KPI implementation-readiness matrix

### 4.1 Programme coverage and SIP progress

| KPI | Official measure | Evidence in inspected repository | Readiness | Blocking decisions / work | Earliest safe implementation |
|---|---|---|---|---|---|
| REG-01 | Clusters | `clusters.id`, `clusters.name`; direct registry count query | EXISTING_SOURCE_CANDIDATE | Confirm registered vs active scope, inclusion of inactive records, as-of snapshot and public visibility | Registry snapshot after DET/State PMU semantics and DASH-10 approval |
| REG-02 | Hub ITIs | `itis.id`, `itis.type`, `itis.cluster_id`; query uses HUB | EXISTING_SOURCE_CANDIDATE | Confirm canonical HUB code, status/inactive filter, cluster attribution and snapshot semantics | Registry snapshot after type/status and hierarchy approval |
| REG-03 | Spoke ITIs | Same ITI fields; query uses SPOKE | EXISTING_SOURCE_CANDIDATE | Confirm canonical SPOKE code, status/inactive filter and cluster attribution | Registry snapshot after type/status and hierarchy approval |
| REG-04 | AIPs | `aips.id`, `status`, `cluster_id`; count query exists | EXISTING_SOURCE_CANDIDATE | Define registered vs active/approved/participating AIP; approve status vocabulary | Registry snapshot after DET/State PMU status semantics |
| REG-05 | SPVs | `spvs.id`, `status`, `cluster_id`, `aip_id`; count query exists | EXISTING_SOURCE_CANDIDATE | Define registered vs active/approved SPV; approve status vocabulary and relationship interpretation | Registry snapshot after status and hierarchy approval |
| REG-06 | SIP submitted / approved | SIP records and status counts are queryable; seven-state workflow comments are evidenced | PARTIAL_WORKFLOW_SOURCE | Approve canonical states, transitions, submitted/approved counting rules, resubmission/rejection treatment and snapshot semantics | Workflow counts after DET/Approving Authority/NIC approval and regression tests |

**Registry rule:** REG-01 to REG-05 are counts of registered entities unless the approved contract explicitly defines a different population. Do not relabel them as operational, active, participating or approved counts without an approved inclusion rule. REG-06 must use approved canonical workflow semantics; raw status strings alone are not a sufficient business contract.

### 4.2 Physical progress

| KPI | Official measure | Evidence in inspected repository | Readiness | Blocking decisions / work | Earliest safe implementation |
|---|---|---|---|---|---|
| PHY-01 | Civil works | No dedicated civil-work project, milestone or evidence model found in inspected Prisma schema | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-03 / DASH-01; define project/work package, milestone, unit, progress method, evidence, verification and reporting period | After engineering/DET approval, source owner confirmation and evidence workflow |
| PHY-02 | Equipment procurement / installation | No equipment register or procurement, receipt, installation or commissioning records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-03 / DASH-01; distinguish ordered, delivered, installed and commissioned; decide whether separate measures | After equipment lifecycle, source, evidence and status definitions are approved |
| PHY-03 | Labs | `itis.lab_details` is a free-text profile field; no structured operational lab inventory evidenced | PARTIAL_PROFILE_ONLY | DB-03 / DASH-01; define lab identity, type, equipment/readiness criteria, functional status and verification | After structured inventory and operational criteria are approved; free text is not a count |
| PHY-04 | Smart classrooms | No dedicated classroom inventory/readiness fields found in inspected schema | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-03 / DASH-01; define minimum smart-classroom components, installed/functional criteria and evidence | After classroom inventory, verification and lifecycle approval |

**Physical-domain boundary:** Planned, ordered, delivered, installed, commissioned, functional and completed are distinct states. A progress percentage must not be invented from milestone counts, expenditure, narrative updates or uploaded photographs. Evidence submission is not evidence acceptance.

### 4.3 Academic progress

| KPI | Official measure | Evidence in inspected repository | Readiness | Blocking decisions / work | Earliest safe implementation |
|---|---|---|---|---|---|
| ACD-01 | Courses | `itis.existing_trades` and `itis.proposed_trades` profile arrays | PARTIAL_PROFILE_ONLY | DB-04 / DASH-02; approve course/trade master, approved vs active vs running meaning, effective dates and ITI offering lifecycle | After canonical course catalogue and ITI offering records are approved |
| ACD-02 | Future-skills courses | No dedicated future-skills taxonomy, offering, cohort or delivery model evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-04 / DASH-02; approve future-skills taxonomy and qualifying course classification | After taxonomy owner, course classification and delivery source are approved |
| ACD-03 | Trainers trained | No trainer-development or training-completion records found | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-04 / DASH-02; define trainer identity, qualifying training, completion evidence, unique count and cumulative/period rule | After trainer source, training event and completion verification are approved |
| ACD-04 | Admissions | `itis.student_strength` is capacity/strength profile data, not admission transactions | NO_AUTHORITATIVE_SOURCE; SOURCE_INTEGRATION_PENDING | DB-04 / DASH-02; approve admission event, academic year, cohort, cancellation/transfer/duplicate rules and Student MIS source | After authoritative admission records and cohort contract are available |
| ACD-05 | Training completed | No trainee enrolment/progress/completion records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING; SOURCE_INTEGRATION_PENDING | DB-04 / DASH-02; define eligible enrolment, completion, assessment, dropout/transfer and period rules | After Student/Training MIS or approved completion records and evidence are available |

**Academic-domain boundary:** Existing/proposed trades are not proof that a course is approved, currently offered or running. Student strength is not admissions, enrolment, attendance or completion. A person-level learner/trainer dataset must not be exposed through public dashboard responses.

### 4.4 Industry outcomes

| KPI | Official measure | Evidence in inspected repository | Readiness | Blocking decisions / work | Earliest safe implementation |
|---|---|---|---|---|---|
| IND-01 | Apprenticeships | No apprenticeship records evidenced | NO_AUTHORITATIVE_SOURCE; SOURCE_INTEGRATION_PENDING | DB-04 / DASH-03; distinguish opportunity, agreement, enrolled apprentice, start and completion; confirm Apprenticeship MIS | After authoritative MIS/source and approved counting lifecycle |
| IND-02 | OJT | No OJT programme, participation or completion records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-04 / DASH-03; approve whether KPI is trainees, starts, completions, instances or verified hours; distinguish from apprenticeship | After OJT programme/participation/completion source and evidence contract |
| IND-03 | Industry exposure | No exposure event or attendance records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DASH-03; define qualifying activity types, held vs planned/cancelled, unique participants, repeat attendance and evidence | After activity, participation and verification records are approved |
| IND-04 | Placements | No placement source records found; current endpoint reports source not established | NO_AUTHORITATIVE_SOURCE; SOURCE_INTEGRATION_PENDING | DASH-03; identify Placement MIS, placed-student definition, employer/job evidence, verification, duplicate and withdrawal rules | After authoritative source and employment verification standard |
| IND-05 | Placement percentage | No placement numerator, eligible-completer denominator or approved formula evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DASH-04; approve numerator, denominator, cohort eligibility, exclusions, time window, duplicate policy and denominator-zero behaviour | Only after IND-04 and eligible-completer sources are approved and reconciled |
| IND-06 | Employer participation | No structured employer participation records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DASH-03; define canonical employer, unique/active employer and qualifying participation; MoU alone may not prove activity | After employer master and verified activity/apprenticeship/OJT/placement links |

**Industry-domain boundary:** Opportunities, agreements, participants, starts, completions, events and hours are different measures. A signed MoU does not automatically establish active employer participation. Event counts must not be conflated with participant counts. A placement rate must not be calculated until its eligible cohort and numerator are approved.

### 4.5 Financial progress

| KPI | Official measure | Evidence in inspected repository | Readiness | Blocking decisions / work | Earliest safe implementation |
|---|---|---|---|---|---|
| FIN-01 | Approved outlay | AIP `investment_amount` and SIP proposal/contribution fields exist; no authoritative approved-outlay ledger evidenced | PARTIAL_PROXY_ONLY; DEFINITION_PENDING | DB-05 / DASH-05; define sanctioned/approved amount, authority, grain, revisions, fiscal-year attribution and authoritative FMS | After Finance/DET approve definition and sanction/outlay source |
| FIN-02 | Funds released | No release ledger or release transactions evidenced | NO_AUTHORITATIVE_SOURCE; SOURCE_INTEGRATION_PENDING | DB-05 / DASH-05; define release milestone, order/reference, date, amount, recipient, partial releases and reversals | After authoritative release source and integration/reconciliation contract |
| FIN-03 | Expenditure | No expenditure ledger or accepted expenditure records evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING; SOURCE_INTEGRATION_PENDING | DB-05 / DASH-05; approve booked vs paid vs certified/accepted accounting basis, period and adjustments | After Finance approves accounting basis and FMS source |
| FIN-04 | Utilisation percentage | No authoritative release/expenditure pair or approved formula evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-05 / DASH-05; approve numerator, denominator, period, carry-forward, zero denominator, rounding and edge cases | Only after FIN-02/FIN-03 are approved, integrated and reconciled |
| FIN-05 | Balance | No authoritative release/expenditure ledger pair evidenced | NO_AUTHORITATIVE_SOURCE; DEFINITION_PENDING | DB-05 / DASH-05; choose unreleased allocation, unspent releases or another official balance; define opening balance, carry-forward and adjustments | Only after Finance approves balance meaning and all source components |

**Financial-domain boundary:** AIP investment and SIP proposal/contribution fields are not approved outlay or actual financial transactions. A release order, payment, receipt and expenditure recognition are not interchangeable. FIN-04 and FIN-05 formulas must not be implemented from candidate arithmetic in the design drafts.

## 5. Cross-domain dependencies

The same foundations are required by multiple KPIs. Implementing each domain independently before resolving these dependencies would create inconsistent source mappings, duplicate evidence systems and incompatible reporting semantics.

| Shared dependency | Phase 0 decision / backlog | Domains affected | Required decision or deliverable | Gate |
|---|---|---|---|---|
| KPI definition, unit, grain and formula | DASH-01–05; PB-005 | All 26 | Signed KPI contract for each measure; explicitly mark non-formula measures | G0 |
| Reporting periods and historical restatement | DASH-06 | All 26 | As-of snapshot, academic/cohort period, financial year, cut-off and restatement policy | G0 |
| Hierarchy and attribution | DASH-07 | All 26 | Approved State → Cluster → Hub ITI → Spoke ITI → Activity / Project applicability and non-duplicating allocation | G0 |
| Source ownership and validation | DASH-08 | All 26 | System of record, data owner, validator, approver and escalation path per KPI | G0 |
| External source interfaces | DASH-09; DB-11; PB-006 | ACD-04/05, IND-01/04, FIN-01–05 and any external evidence source | Official API/file contract, identifiers, auth, schedule, retries, reconciliation and legal approval | G1 |
| Provenance and freshness | DB-12 | All externally sourced KPIs and registry snapshots | Source system, source record, source update time, captured_at, reporting_period, validation status, last_sync and definition version | G1 |
| Public/internal dashboard policy | DB-09 in Data Dictionary; DASH-10; PB-003 | All dashboard APIs | Public allowlist; authenticated internal roles; server-side resource scope; export policy | G0/G4 |
| Physical evidence workflow | DB-03; DASH-01 | PHY-01–04 | Evidence type, private storage, submit/review/accept/reject, verifier, timestamps and retention | G0/G2 |
| Academic and learner source model | DB-04; DASH-02 | ACD-01–05 | Course taxonomy, trainer, admission, enrolment, completion and Student/Training MIS contracts | G0/G2 |
| Industry outcome source model | DB-04; DASH-03/04; PB-008 | IND-01–06 and ACD-05 denominator dependency | Employer, trainee, apprenticeship, OJT, activity, placement and cohort identity contracts | G0/G2 |
| Financial source and accounting policy | DB-05; DASH-05; PB-007 | FIN-01–05 | Approved FMS/sanction source, accounting basis, formula and reconciliation | G0/G2 |
| Canonical IDs and scope inheritance | DB-06/DB-07 | All scoped records and imported identities | Consistent user/source IDs; approved scope types and inheritance rules | G0/G2 |
| Payload schema/versioning | DB-02; PB-004 | Existing registry submissions and future source payloads | Versioned JSON contracts, validation, compatibility and migration policy | G0/G2 |
| Audit and correction history | PB-009; Phase 0 F-05 | All operational submissions and imported corrections | Atomic business/audit persistence or approved outbox pattern; actor, before/after, reason and outcome | G2/G4 |
| File/evidence storage | DB-10 | Physical, academic, industry, finance evidence | Production storage, private access, malware scanning, retention, backups and safe retrieval | G1/G2 |
| Security and deployment readiness | PB-001/002/010; Phase 0 F-02/F-03/F-04/F-10 | All internal dashboards and evidence operations | Approved role matrix, route guards, scope isolation, VAPT and deployment evidence | G4 |

**Decision-ID note:** The Phase 0 Data Dictionary labels DB-08 as dashboard security, while the Phase 0 Dashboard KPI Source Mapping decision register labels DASH-10 as public vs internal dashboard. This document preserves both source identifiers rather than silently renumbering them. DB-09 in the Data Dictionary refers to integration interfaces; DASH-09 in the KPI decision register refers to data refresh/integration. Treat them as linked decision areas, not interchangeable IDs.

## 6. Proposed shared reporting architecture

The domain designs converge on one architecture:

```
Authoritative registries / operational MIS / FMS / approved evidence sources
                              |
                              v
                 Approved source adapters
                              |
                              v
                 Staging + source identity map
                              |
                              v
             Validation / deduplication / reconciliation
                              |
                              v
           Domain records + provenance + audit history
                              |
                              v
             Approved KPI definition/calculation layer
                              |
                              v
                Reporting snapshots / aggregates
                              |
                              v
             Authenticated dashboard API / public API
                              |
                              v
               State → Cluster → ITI → Activity
```

### Architecture constraints

1. Dashboard request handlers read from the PM-SETU reporting repository; they must not fan out directly to multiple external production databases.
2. Every imported record retains source system, source ID/version, import batch and source/capture timestamps.
3. Source adapters are independently retryable and idempotent.
4. Domain records preserve event/transaction grain; snapshots are reproducible and tied to a KPI-definition version.
5. Calculation logic is centralised and versioned; the same KPI must not be calculated differently by multiple controllers.
6. Public and internal APIs are separated by an explicit allowlist and server-side authentication/authorisation/scope enforcement.
7. Unavailable, stale, pending, rejected and unreconciled values are represented distinctly from numeric zero.
8. Historical corrections retain prior published values or sufficient immutable history to explain restatements.
9. Person-level student, trainer, apprentice and placement data is minimised and restricted; public outputs use approved aggregates only.
10. Evidence files are private by default and served only through authorised access paths.

### Shared logical platform capabilities

These are capability areas, not approved Prisma table names:

- KPI definition registry: ID, official label, approved definition/version, unit, grain, period, formula components, owner, validator, visibility and effective dates.
- Source registry: source system, owner, interface version, authentication reference, refresh expectation and operational status.
- External identity mapping: source system + source record ID to canonical PM-SETU entity.
- Import batch and source watermark: start/end, record counts, retries, accepted/rejected/duplicate totals and outcome.
- Provenance envelope: source, captured time, reporting period, validation/reconciliation state and last successful sync.
- Evidence reference: private object reference, type, submitter, verifier, decision and retention metadata.
- Audit event: actor, role, action, entity, before/after version, reason, timestamp and outcome.
- KPI snapshot: KPI ID/version, period, scope, value/unit, as-of timestamp, freshness and reconciliation state.
- Reconciliation run: source totals, imported totals, differences, exceptions, tolerance and accountable sign-off.

Do not create these as database models until the relevant cross-cutting decisions and detailed contracts are approved.

## 7. Implementation sequence and gates

The following sequence is recommended. A gate is complete only when its evidence is recorded; a phase document or code commit is not a substitute for departmental approval.

### G0 — Business and governance approval

**Owners:** DET / State PMU / Finance / domain authorities / MIS owners.

- Approve definitions, units, grains and formulas for all 26 KPIs.
- Confirm reporting periods, hierarchy, attribution and historical restatement.
- Name system-of-record owners, validators and approvers.
- Approve public/internal metric allowlist and role/scope policy.
- Resolve DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-11 and DB-12 as applicable.
- Record signed approval evidence: approver, department/role, date, effective date, source document and contract version.

**Exit:** No KPI is labelled APPROVED without recorded authority evidence. Any unresolved KPI remains blocked rather than receiving an inferred formula.

### G1 — Source and integration readiness

**Owners:** DET / NIC / external source-system owners / Finance / domain owners.

- Inventory authoritative source systems and data custodians.
- Obtain approved API/file specifications, credentials process and legal/data-sharing approvals.
- Agree canonical IDs, field mappings, hierarchy mapping and source version behaviour.
- Agree full/incremental extraction, refresh cadence, watermark, retry, duplicate and correction handling.
- Agree source reconciliation totals, tolerances, exception ownership and sign-off.
- Confirm data retention, privacy, security and operational support.

**Exit:** Each KPI has a source contract or an explicit decision that PM-SETU will own the authoritative operational record. “Source not identified” remains unavailable.

### G2 — Shared platform and domain implementation

**Owners:** Backend / DBA / NIC / domain implementation owners.

Recommended order:
1. Shared provenance, import-batch, source identity and audit capabilities.
2. Approved reference masters and effective-dated hierarchy mappings.
3. Physical domain records and evidence lifecycle (after DB-03 approval).
4. Academic domain records and Student/Training MIS adapters (after DB-04 approval).
5. Industry domain records and outcome adapters (after DB-04 / DASH-03 / DASH-04 approval).
6. Financial records and FMS/sanction adapters (after DB-05 / DASH-05 approval).
7. Versioned KPI calculation and snapshot service.
8. Dashboard read models and API contracts.

**Exit:** Migrations, services, imports, calculations and APIs implement only approved contracts. Every domain has unit/integration tests, audit coverage and source reconciliation.

### G3 — KPI verification and reconciliation

**Owners:** Domain data owners / Finance / DET / QA.

- Reconcile source and PM-SETU counts/amounts for representative periods and scopes.
- Verify KPI formulas against independently prepared expected results.
- Test late-arriving data, corrections, reversals, duplicate imports and historical restatement.
- Verify aggregate totals across State, Cluster, Hub ITI, Spoke ITI, Project and Activity only where approved.
- Obtain domain-owner sign-off for representative production-like datasets.

**Exit:** A KPI can be marked VERIFIED only for a named definition version, source version, period and scope with recorded test and reconciliation evidence.

### G4 — Access, privacy and release readiness

**Owners:** DET / State PMU / Backend / Security / NIC.

- Implement public allowlist and internal authenticated endpoints.
- Enforce role, permission and resource scope on the backend for every protected read, write and export.
- Add negative cross-cluster/cross-ITI and privilege-escalation tests.
- Review person-level data minimisation, evidence access, exports and retention.
- Verify audit consistency and failure behaviour.
- Complete deployment/security assessment, including TLS/WAF, secrets, storage, backups, restore, monitoring and VAPT as required by the Phase 0 baseline.

**Exit:** Public/internal access is approved and verified; security/deployment evidence is signed off. A frontend-only hide/show rule does not satisfy this gate.

### G5 — Controlled dashboard publication

**Owners:** DET / State PMU / domain owners / operations.

- Publish only approved and verified KPI versions.
- Include period, as-of time, source freshness, validation/reconciliation state and definition version.
- Display unavailable/stale/pending states explicitly; never convert missing values to zero.
- Monitor import failures, source freshness, reconciliation exceptions and API errors.
- Maintain rollback and historical-restatement procedures.

**Exit:** Dashboard publication is approved for the specified KPI, scope, audience and period. Release 3 is not considered complete merely because dashboard cards or endpoints exist.

## 8. Test strategy and acceptance criteria

The tests below form a minimum cross-domain verification plan. Exact expected values and business edge cases must come from approved KPI contracts and source-owner examples; this document does not invent them.

| Test area | Minimum scenarios | Acceptance criteria |
|---|---|---|
| KPI contract validation | Missing definition, unit, owner, period, source or formula component | Incomplete contracts cannot be promoted to approved/implemented |
| Registry counting | Active/inactive entities, type filters, duplicate source rows, empty registry | Counts match approved inclusion rules and distinct entity identities |
| Workflow counting | SIP submitted, approved, rejected, returned, resubmitted and superseded states | Counts follow approved state mapping and do not double-count transitions |
| Physical lifecycle | Planned, started, submitted evidence, rejected evidence, accepted, completed, cancelled | Only approved milestones/states contribute; rejected/planned/cancelled cases handled per contract |
| Evidence integrity | Missing, duplicate, inaccessible, invalid type, replaced and rejected evidence | Evidence status is auditable; submission alone never implies acceptance |
| Academic cohort rules | Admission, transfer, dropout, repeat enrolment, course change and academic-year boundary | Unique learner and cohort counts match approved Student MIS rules |
| Training completion | Partial completion, failed assessment, re-entry, late result and duplicate completion import | Completion is counted only under approved evidence and cohort/date rules |
| Industry identity/counting | Same trainee across events, multiple employers, duplicate agreement, overlapping OJT/apprenticeship | Unique people, events, instances and hours remain distinct as approved |
| Placement verification | Offer only, joined, withdrawn, duplicate placement, employer verification failure | Only verified eligible placements count; exclusion/reversal is auditable |
| Placement percentage | Numerator/denominator edge cases, zero eligible cohort, delayed placement, exclusions | Formula matches approved cohort policy; zero denominator never yields an invented percentage |
| Financial precision | Decimal boundaries, large values, currency mismatch and rounding | Fixed precision and approved rounding; no floating-point drift or currency mixing |
| Financial transaction lifecycle | Partial release, duplicate release, failed/returned release, expenditure reversal and recovery | Source transactions reconcile and adjustments preserve history |
| Utilisation/balance | Zero release, carry-forward, period close, late adjustment, negative/exceptional balance | Results exactly match Finance-approved formulas and edge-case rules |
| Import idempotency | Re-run same file/API page, retry after timeout, duplicate source ID | No duplicate business events; replay produces deterministic results |
| Import ordering | Late-arriving events, out-of-order updates and source version changes | Correct effective state/history; stale updates do not overwrite newer source versions |
| Reconciliation | Matching totals, mismatch, unallocated records, rejected records and tolerance breach | Differences are visible, owned and resolved; failed reconciliation cannot appear verified |
| Missing vs zero | No source delivery, empty source, explicit zero, not applicable and rejected data | API distinguishes unavailable, zero, not applicable and invalid states |
| Freshness | Delayed sync, source outage, partial import and stale watermark | Freshness metadata is accurate; stale metrics are flagged/withheld per policy |
| Historical restatement | Corrected prior-period record and revised KPI definition | Prior published value and restatement reason/version are traceable |
| Hierarchy aggregation | State/cluster/ITI/activity splits, transfers, overlapping attribution | Parent totals reconcile; no double counting or inferred equal split |
| Scope security | Cross-cluster, cross-ITI, unrelated AIP/SPV, unauthorised activity and export access | Backend denies out-of-scope requests regardless of client-supplied IDs |
| Public privacy | Student, trainer, apprentice, employer contact, vendor/payee and transaction detail | Public response contains only approved aggregate fields |
| Audit consistency | Business transaction succeeds/fails while audit write succeeds/fails | No unaudited committed sensitive mutation; approved transaction/outbox semantics hold |
| API contract | Invalid filters, pagination, unsupported period, missing source, stale value and permission failure | Stable versioned response and correct validation/error semantics |
| Performance and resilience | Large hierarchy, batch import, slow source, retry storm and source downtime | Agreed service objectives met; API remains isolated from external source outages |

### Required automated test layers

- Unit tests: KPI calculators, state mappings, validators, period boundaries, decimal handling and attribution rules.
- Repository/integration tests: Prisma persistence, uniqueness, foreign keys, transaction boundaries and audit/outbox behaviour.
- Import tests: adapter mapping, idempotency, retries, source versioning, rejected rows and reconciliation.
- API tests: schema validation, authentication, permission, resource scope, pagination and public allowlist.
- End-to-end tests: approved source sample → staging → validation → domain record → KPI snapshot → dashboard response.
- Security tests: cross-scope negative cases, privilege escalation, evidence access and sensitive-field leakage.
- Operational tests: stale-source behaviour, alerting, retry/recovery, backup/restore and reconciliation failure handling.

## 9. Existing dashboard disposition

The Phase 3.0 audit identified these existing routes:

| Existing route | Current audited behaviour | Phase 3 disposition |
|---|---|---|
| `GET /api/v1/dashboard/state` | State registry counts and AIP investment sum; trainees/industries engaged are null | Retain only after registry semantics, safe fields and access policy are approved; remove/rename misleading proxy fields |
| `GET /api/v1/dashboard/clusters` | Registry counts and AIP investment grouped by cluster | Same; ensure filters and cluster attribution are approved |
| `GET /api/v1/dashboard/clusters/:id` | Cluster registry drill-down | Protect with authenticated scope checks unless explicitly approved as public aggregate |
| `GET /api/v1/dashboard/finance` | AIP investment and SIP proposal/contribution totals | Must not be presented as FIN-01–FIN-05; relabel as proposal/profile information only if separately approved, otherwise replace/remove |
| `GET /api/v1/dashboard/training` | Sums `itis.student_strength` | Must not be presented as admissions or training completion; relabel as profile/capacity information only if approved |
| `GET /api/v1/dashboard/placements` | Reports source not established | Keep unavailable/explicitly pending until authoritative source and verification standard exist |

The Phase 3.0 audit observed that the inspected dashboard router did not apply authentication, role, permission or resource-scope middleware. This must be re-verified against the current main branch during implementation; the observation is not a claim about deployed runtime configuration.

## 10. Approval register and accountable responsibilities

The following is a proposed consolidation of decision ownership from the Phase 0 workbooks. Proposed owners must be confirmed by DET/State PMU.

| Approval package | Decision IDs / backlog | Proposed accountable owner(s) | Required evidence |
|---|---|---|---|
| KPI semantics and formulas | DASH-01–05; PB-005 | DET, Finance, Academic/Industry/Placement MIS owners | Approved KPI contract per ID, definition/version and examples |
| Reporting periods and hierarchy | DASH-06/07 | State PMU / DET | Signed period and drill-down matrix |
| Source ownership and validation | DASH-08 | DET / source-system owners | Named source owner, validator, approver and escalation |
| External integration | DASH-09; DB-11; PB-006 | DET / NIC / source-system owners | Interface specs, credentials process, mapping, schedule, retries and reconciliation |
| Financial source | DB-05; DASH-05; PB-007 | Finance / DET / FMS owner | Approved finance definitions and reconciled source records |
| Industry outcomes source | DB-04; DASH-03/04; PB-008 | DET / Apprenticeship MIS / Placement MIS / ITIs / employers | Verified records and approved counting rules |
| Physical progress source | DB-03; DASH-01 | DET / engineering data owner / ITIs | Approved asset/project/milestone/evidence contract |
| Academic outcomes source | DB-04; DASH-02 | DET / ITIs / Student or Training MIS owner | Course, trainer, admission and completion source contracts |
| Dashboard access | Data Dictionary DB-08; KPI register DASH-10; PB-003 | DET / State PMU / Security | Public allowlist, role matrix and resource-scope policy |
| Shared data integrity | DB-02/06/07/12; PB-004/009 | NIC / DBA / Backend / DET | Versioned payloads, IDs, scope rules, provenance and audit consistency |
| Production readiness | PB-001/002/010; Phase 0 F-02/F-03/F-04/F-10 | NIC / Security / Backend / hosting team | RBAC/scope tests, VAPT, storage, backup/restore, monitoring and deployment evidence |

Approval records should be durable and versioned. Verbal confirmation, an issue comment or an implementation choice by itself must not be treated as formal departmental sign-off.

## 11. Explicit non-goals and prohibited shortcuts

Until the relevant approval and source gates pass, do not:

- Create one generic dashboard metric table and store unvalidated numbers without source grain, definition version, period and provenance.
- Calculate civil-work/equipment progress percentages from undocumented assumptions.
- Count free-text lab details as operational labs.
- Treat existing/proposed trades as active courses or future-skills courses without approved classification.
- Use student_strength as admissions, trainees trained or training completion.
- Count an apprenticeship agreement as a completed apprenticeship.
- Mix OJT hours, trainees, instances and completions into one number.
- Treat an industry event as a participant count or an MoU as active employer participation.
- Calculate placement percentage before the eligible cohort, numerator, denominator and exclusions are approved.
- Treat AIP investment or SIP proposed contribution as approved outlay.
- Infer funds released or expenditure from proposals, orders or uploaded documents without the approved financial milestone/accounting rule.
- Publish missing values as zero or mark stale/unreconciled data as verified.
- Attribute project values to multiple ITIs without authoritative allocation records.
- Expose person-level, vendor, payee, bank or restricted evidence data through public APIs.
- Query external production MIS/FMS databases directly from dashboard request handlers.
- Mark a KPI APPROVED, IMPLEMENTED or VERIFIED based only on this design document.

## 12. Phase 3.6 deliverable status

| Deliverable | Status |
|---|---|
| Phase 0 KPI inventory consolidated | Complete — all 26 KPI IDs represented |
| Phase 3.0 repository evidence carried forward | Complete as an inspected-source baseline; production state not certified |
| Physical, academic, industry and finance designs consolidated | Complete as Draft 0.1 proposals |
| Per-KPI readiness classifications | Complete as planning classifications only |
| Cross-domain dependency and decision map | Complete as proposed consolidation |
| Shared architecture and capability boundaries | Drafted; approvals pending |
| Implementation gates and sequencing | Drafted; owner confirmation pending |
| Cross-domain test and acceptance matrix | Drafted; expected business cases require source-owner approval |
| Departmental/source-owner approvals | Pending |
| External source interface specifications | Not confirmed |
| Production Prisma models / migrations / KPI formulas | Not created |
| New dashboard routes / access grants | Not created |
| Automated tests | Not run; documentation-only deliverable |

**Phase 3.6 exit status:** Consolidation and implementation-readiness planning completed. The dashboard is **not yet ready for full KPI implementation or public publication**. Registry snapshot work may be separately prioritised after its semantics and access policy are approved. Physical, academic, industry and financial KPIs remain blocked on their respective definitions and authoritative sources.

## 13. Recommended next phase

After G0 approvals, begin a narrowly scoped implementation-readiness closure for the first approved KPI subset rather than implementing all 26 at once. A sensible first candidate is the registry snapshot subset REG-01 through REG-05, followed by REG-06 after workflow-state approval, provided DASH-06/07/08/10 and relevant access decisions are signed off.

In parallel, source owners can complete G1 interface inventories for academic, industry and finance systems. Do not start operational outcome KPI migrations until the applicable DB-03/04/05 and DASH-01/02/03/04/05 approvals are recorded.

---

**End of Phase 3.6 — Cross-Domain Consolidation & Implementation Readiness, Draft 0.1**
