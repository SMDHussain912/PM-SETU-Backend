# Phase 3.0 — Dashboard Data Audit

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Audit type:** Targeted source/schema audit  
**Status:** Evidence inventory completed; departmental and source-system decisions remain open  
**Scope:** Existing dashboard routes, controllers, services, repository queries, Prisma schema, SQL dashboard contract, migration inventory, CI workflow, and Phase 0 KPI source mapping.

## 1. Purpose and evidence boundary

Phase 3 is the Implementation Monitoring Dashboard. This Phase 3.0 pass establishes what the current backend can evidence before reporting models, aggregation APIs, or dashboard UI are extended.

This is a source-code and schema review. It is **not** a production database inspection, deployed-environment verification, data-quality certification, security penetration test, or confirmation that any external MIS integration is operational.

The official dashboard architecture is:

`Source systems → Data integration / ETL → PM-SETU data repository → Dashboard API → Web dashboard`

The web dashboard must not query multiple external production databases directly. External systems should be connected through approved interfaces and an integration layer.

## 2. Current dashboard API inventory

The following routes are mounted under `/api/v1/dashboard`:

| Route | Current behaviour | Audit observation |
|---|---|---|
| `GET /state` | State-level registry counts and AIP investment sum | Registry snapshot only; trainees and industries engaged are null |
| `GET /clusters` | Cluster summaries | Registry counts and AIP investment grouped by cluster |
| `GET /clusters/:id` | Cluster detail, ITIs, AIPs, SIP counts | Registry drill-down; no physical implementation activity records |
| `GET /finance` | AIP investment and SIP proposed/contribution totals | These are not approved outlay, released funds, expenditure, utilisation or balance |
| `GET /training` | ITI student-strength totals by type and cluster | This is capacity/profile data, not admissions, enrolment or training completed |
| `GET /placements` | Informative pending-source message | No placement source is established |

### Route access observation

The dashboard router is mounted directly in the versioned API router. The inspected dashboard route file does not apply authentication, role, permission, or resource-scope middleware. Treat the current dashboard routes as publicly reachable until an approved public/internal policy is implemented and verified.

**Required decision:** approve which measures are public, which are internal, and the role/scope rules for internal drill-down. Do not expose detailed ITI, employer, trainee, or financial records by assuming that a public aggregate route is safe.

## 3. KPI-by-KPI evidence inventory

Availability labels below describe inspected repository evidence only. They do not certify production data.

### 3.1 Programme coverage and SIP progress

| KPI ID | Official measure | Current evidence | Assessment / blocker |
|---|---|---|---|
| REG-01 | Clusters | `clusters.id`, `clusters.name`; dashboard count query exists | Available as registry count; active/inactive inclusion rule is not approved |
| REG-02 | Hub ITIs | `itis.id`, `itis.type`, `itis.cluster_id`; query filters `type = 'HUB'` | Available as registry count; confirm authoritative type/status filters |
| REG-03 | Spoke ITIs | Same ITI fields; query filters `type = 'SPOKE'` | Available as registry count; confirm authoritative type/status filters |
| REG-04 | AIPs | `aips.id`, `status`, `cluster_id`; count query exists | Available as registry count; active/approved/participating definition is open |
| REG-05 | SPVs | `spvs.id`, `status`, `cluster_id`, `aip_id`; count query exists | Available as registry count; active/approved definition is open |
| REG-06 | SIP submitted / approved | `sips.id`, `status`, `cluster_id`, `aip_id`; counts for `SUBMITTED` and `APPROVED` exist | Partially available; status labels, transition policy and reporting semantics require DET/NIC approval |

The registry endpoints can support basic coverage counts. They do not, by themselves, show whether an entity is active, approved, participating, or operational. Status filters must not be invented.

### 3.2 Physical progress

| KPI ID | Official measure | Current evidence | Assessment / blocker |
|---|---|---|---|
| PHY-01 | Civil works | No dedicated civil-work project, milestone or evidence model found in inspected Prisma schema | Not available as a reliable KPI; formula/unit and milestone or percentage method need approval |
| PHY-02 | Equipment procurement / installation | No equipment register or procurement/installation/commissioning records found | Not available; clarify ordered, received, installed and commissioned states and whether they are separate measures |
| PHY-03 | Labs | `itis.lab_details` is a free-text profile field | Partial descriptive data only; cannot count verified operational labs without structured inventory and operational criteria |
| PHY-04 | Smart classrooms | No dedicated classroom inventory/readiness fields found | Not available; definition and minimum functional/operational criteria need approval |

### 3.3 Academic progress

| KPI ID | Official measure | Current evidence | Assessment / blocker |
|---|---|---|---|
| ACD-01 | Courses | `itis.existing_trades` and `itis.proposed_trades` profile arrays | Partial descriptive data; these do not prove approved or active courses |
| ACD-02 | Future-skills courses | No dedicated taxonomy, offering, cohort or delivery model found | Not available; qualifying course taxonomy needs approval |
| ACD-03 | Trainers trained | No trainer-development or completion records found | Not available; trainer identity, completion evidence and cumulative/period counting need approval |
| ACD-04 | Admissions | `itis.student_strength` is capacity/strength profile data, not admission transactions | Not available; use an approved Student MIS or admission/cohort records |
| ACD-05 | Training completed | No trainee enrolment/progress/completion records found | Not available; completion, cohort, course and date rules need approval |

The existing training API must not be represented as training performance. It currently sums `student_strength`, which is a capacity/profile field.

### 3.4 Industry outcomes

| KPI ID | Official measure | Current evidence | Assessment / blocker |
|---|---|---|---|
| IND-01 | Apprenticeships | No apprenticeship records found | Not available; distinguish opportunities, contracts, enrolled apprentices and completed apprenticeships |
| IND-02 | OJT | No OJT programme or trainee participation/completion records found | Not available; approve whether the measure is hours, participants, starts or completions |
| IND-03 | Industry exposure | No industry-exposure event or attendance records found | Not available; keep event counts distinct from participant counts |
| IND-04 | Placements | No placement source records found; current endpoint reports source not established | Not available; authoritative source and employment verification standard required |
| IND-05 | Placement percentage | No placement numerator, eligible-completer denominator or approved formula found | Not available; do not calculate until numerator, denominator, exclusions and time window are approved |
| IND-06 | Employer participation | No structured employer participation records found | Not available; define active participation (for example, MoU, actual activity, apprenticeship or placement contribution) |

### 3.5 Financial progress

| KPI ID | Official measure | Current evidence | Assessment / blocker |
|---|---|---|---|
| FIN-01 | Approved outlay | AIP `investment_amount` and SIP proposal/contribution fields exist | Partial proxy only; these are not authoritative approved outlay or sanction records |
| FIN-02 | Funds released | No release ledger or release transactions found | Not available; release order/reference, date, amount, recipient and scope need authoritative source |
| FIN-03 | Expenditure | No expenditure ledger or accepted expenditure records found | Not available; clarify booked, paid, certified or otherwise accepted accounting basis |
| FIN-04 | Utilisation percentage | No authoritative release/expenditure pair or approved formula found | Not available; denominator, zero-release handling and reporting period need approval |
| FIN-05 | Balance | No authoritative release/expenditure ledger pair found | Not available; clarify whether balance means unreleased allocation, unspent releases or total available balance |

The current finance endpoint sums AIP investment and SIP proposed/contribution values. These must not be labelled or presented as approved outlay, releases, actual expenditure, utilisation, or balance.

## 4. Data model and integration observations

### 4.1 Existing entities relevant to dashboard

The inspected Prisma schema contains registry entities for Cluster, ITI, AIP, SPV and SIP, with the fields described in the KPI inventory. The schema also contains content, authentication, approval, audit and scope-assignment models.

No physical-progress, student admission/completion, trainer-development, apprenticeship, OJT, placement, employer-participation, financial-release or expenditure ledger models were found in the inspected Prisma schema.

No `DashboardMetric` model is present in the inspected current Prisma schema. The dashboard SQL comment referring to a DashboardMetric entity is therefore stale or refers to a future concept; it is not an implemented source model.

### 4.2 Existing integration evidence

The inspected backend contains no complete end-to-end source-system integration/ETL pipeline for the dashboard measures. External source-system owners, interface contracts, identifier mappings, authentication, refresh frequency, retries, reconciliation and error handling remain to be agreed.

Do not connect dashboard requests directly to external production databases. Follow the approved integration-layer architecture.

### 4.3 Data provenance and freshness

The dashboard KPI mapping identifies provenance/freshness as a requirement to resolve. The current dashboard response/query implementation does not establish a common provenance contract for source system, source record, reporting period, capture time, last successful sync, validation status, or freshness.

These fields and rules require an approved contract before metrics are published as verified implementation progress.

### 4.4 Repository and migration note

The repository contains Prisma schema and migration files, including registry/workflow migrations. This audit confirms repository artefacts only; it does not confirm that migrations have been applied to the production database.

The SQL dashboard file still contains a note that the PM-SETU schema does not exist yet. That note is stale relative to the current repository's schema/migration files and should be reconciled in a later documentation-only cleanup. Do not infer production deployment from the presence of migration files.

## 5. Key decisions and blockers

The following Phase 0 decision items block trustworthy KPI implementation:

| Decision | Required clarification | Why it blocks implementation |
|---|---|---|
| DB-03 — Physical progress | Civil works, equipment, labs and smart-classroom entities, lifecycle states, evidence and KPI formula/unit | No reliable physical-progress source model |
| DB-04 — Academic and outcomes | Course taxonomy, trainers, admissions, training completion, apprenticeship, OJT, industry exposure and placements | No authoritative learner/trainer/outcome records |
| DB-05 — Financial progress | Approved outlay, release, expenditure, utilisation and balance definitions; authoritative finance source and fiscal period | Existing proposal/profile fields are not actual finance transactions |
| DB-08 / dashboard access policy | Public metric allowlist versus internal dashboard roles, permissions and scopes | Current dashboard routes are not guarded in the inspected route module |
| DB-09 — Integration interfaces | Source owners, interfaces, identifiers, refresh, authentication, reconciliation and error handling | No complete ETL/source integration pipeline evidenced |
| Provenance / freshness | Source, capture time, reporting period, validation and last-sync rules | Cannot communicate whether a value is current and verified |

Additional decisions from the Phase 0 data baseline that affect reporting include SIP–SPV relationship cardinality, exact JSONB payload contracts, identifier consistency, scope inheritance, and canonical status vocabularies. These must remain open until the relevant authority confirms them.

## 6. Recommended Phase 3 implementation boundary

### Safe to prepare after policy confirmation

- Registry coverage counts, with approved active/status filters.
- SIP workflow counts, after canonical status labels and counting rules are approved.
- A dashboard aggregation contract that distinguishes registry snapshots from reporting-period metrics.
- A source/provenance envelope and freshness indicators once the fields and owners are approved.

### Must not be implemented as real KPIs yet

- Civil-work completion or progress percentages.
- Equipment procurement/installation/commissioning progress.
- Operational lab or smart-classroom counts based only on free text/profile data.
- Active/future-skills course counts inferred from existing/proposed trade arrays.
- Admissions, trainees trained, trainers trained or training completion inferred from student capacity.
- Apprenticeship, OJT, industry exposure, placement, placement percentage or employer participation without authoritative records.
- Approved outlay, released funds, expenditure, utilisation or balance inferred from AIP/SIP proposal fields.

## 7. Proposed Phase 3 work sequence

1. **Phase 3.0 — Dashboard data audit:** this evidence inventory and blocker register.
2. **Phase 3.1 — Reporting data contract:** confirm KPI definitions, ownership, reporting periods, provenance, visibility and source mappings with DET/NIC/Finance/source-system owners.
3. **Phase 3.2 — Physical progress reporting:** only after DB-03 decisions and evidence workflow are approved.
4. **Phase 3.3 — Academic and industry reporting:** only after DB-04 definitions and authoritative sources are approved.
5. **Phase 3.4 — Financial reporting:** only after DB-05 and finance source ownership are approved.
6. **Phase 3.5 — Dashboard aggregation and drill-down:** implement state → cluster → Hub ITI → Spoke ITI → activity views against approved contracts.
7. **Phase 3.6 — Verification and security:** tests for aggregation, period boundaries, data quality, stale/missing sources, public/internal visibility and scope isolation.

## 8. Phase 3.0 exit status

**Audit inventory: completed for the inspected dashboard module and Phase 0 KPI mapping.**

**Phase 3.0 is not a sign-off of KPI definitions or data ownership.** Departmental clarifications and source-system decisions remain open. No new KPI fields, database tables, formulas, permissions, integrations or dashboard endpoints are introduced by this audit.

### Evidence reviewed

- `src/modules/dashboard/dashboard.routes.ts`
- `src/modules/dashboard/dashboard.controller.ts`
- `src/modules/dashboard/dashboard.service.ts`
- `src/modules/dashboard/dashboard.repository.ts`
- `src/modules/dashboard/dashboard.types.ts`
- `src/modules/dashboard/dashboard.schema.ts`
- `sql/dashboard/dashboard_queries.sql`
- `prisma/schema.prisma`
- `prisma/migrations/*` (repository tree inventory)
- `src/routes/index.ts`
- `.github/workflows/ci.yml`
- Phase 0 Dashboard KPI Source Mapping workbook
- Phase 0 Gap Register and Master Backlog workbook
- Phase 0 System Architecture and Closure/Handover deliverables
