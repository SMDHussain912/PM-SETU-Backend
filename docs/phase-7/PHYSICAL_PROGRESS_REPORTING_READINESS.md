# Phase 7 — Physical progress reporting readiness

**Status:** Source-model readiness audit complete; KPI implementation blocked on approved domain contract and authoritative source records  
**Branch:** `main`  
**Scope:** PHY-01 Civil works; PHY-02 Equipment procurement / installation; PHY-03 Labs; PHY-04 Smart classrooms.

## 1. Decision

Do not add physical-progress KPI aggregations or public dashboard values yet.

The repository contains an ITI operational submission workflow, but it does not contain dedicated, typed reporting records for civil works, equipment procurement/installation, laboratory inventory/operational readiness, or smart-classroom availability. The existing submission payload is generic JSON and the report types/statuses do not define the physical measurements, reporting grain, evidence rules, or approved completion semantics.

This is a source-readiness finding, not a claim that no external departmental/MIS source exists.

## 2. Repository evidence

### Existing operational submission workflow

Migration `20261104100000_iti_operational_submissions` creates `iti_submissions` with:
- `iti_id`, `created_by`, `report_type`, `title`, generic `payload JSONB`, `status`, submission/review timestamps and remarks.
- Report types: `PERSONNEL`, `TRAINING`, `INFRASTRUCTURE`, `STUDENT_PROGRESS`, `MONTHLY_PROGRESS`, `OTHER`.
- Workflow states: `DRAFT`, `SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`.

The workflow establishes that an ITI can submit a generic infrastructure/monthly-progress report. It does not establish a typed physical-progress source contract. In particular, `APPROVED` is a workflow state for a submission and must not be interpreted as an approved PHY KPI fact without domain-specific validation and evidence rules.

### Existing profile fields

- `itis.infrastructure` is a free-text profile field.
- `itis.lab_details` is a free-text profile field.
- Neither field is a structured inventory, dated progress event, operational-readiness assessment, or verified reporting record.

### Dedicated physical domain model search

No dedicated Prisma models, migrations, or dashboard repositories were found for:
- Civil works/projects/milestones.
- Equipment requirements, procurement, receipt, installation, inspection, or commissioning.
- Structured lab inventory or operational criteria.
- Smart classroom inventory or availability/readiness.

The Phase 3.2 physical-progress design independently records the same gap and explicitly states that its conceptual design does not authorise production models, status enums, formulas, evidence rules, or permissions.

## 3. KPI-by-KPI readiness

| KPI | Official label | Current repository evidence | Safe dashboard disposition |
|---|---|---|---|
| PHY-01 | Civil works | No dedicated civil-work project, milestone, or progress records | Unavailable; no progress value |
| PHY-02 | Equipment procurement / installation | No typed equipment requirement/event lifecycle records | Unavailable; do not collapse ordered/received/installed/commissioned |
| PHY-03 | Labs | Free-text `itis.lab_details` only; no structured inventory or operational criteria | Unavailable; do not infer lab count/readiness |
| PHY-04 | Smart classrooms | No dedicated inventory or availability/readiness records | Unavailable; no count or status |

Do not publish zero for these gaps. Do not derive physical progress from generic submission counts, profile text, AIP/SIP values, or workflow status.

## 4. Decisions required before implementation

DET / State PMU and the designated engineering/source owner must confirm:

1. **Authoritative source:** PM-SETU native records, an external works/equipment MIS, or a defined combination with a governed source-of-truth rule.
2. **Identity and hierarchy:** project/activity/equipment/lab/classroom identifiers and attribution to State → Cluster → Hub ITI → Spoke ITI → Activity.
3. **Measurement semantics:** units, quantity/grain, status vocabulary, numerator/denominator where applicable, and whether reporting is event-, snapshot-, or period-based.
4. **Lifecycle semantics:** for equipment, explicitly distinguish procurement/order, receipt, installation, inspection, and commissioning.
5. **Operational criteria:** minimum evidence and criteria for a lab or smart classroom to count as available/operational.
6. **Evidence and review:** required evidence types, secure document references, reviewer authority, rejection/correction/restatement behaviour, and audit requirements.
7. **Reporting context:** effective date, reporting period, as-of timestamp, late-arriving data and source freshness.
8. **Access and privacy:** public aggregate versus authenticated operational detail; role and organisation-scope policy.
9. **Acceptance:** named approver, approved contract version/effective date, and reconciliation evidence.

## 5. Implementation gate

After the above decisions are recorded:
1. Version the approved physical domain contract.
2. Design typed source tables/events and evidence metadata; do not overload generic JSON submissions as the KPI fact store without an explicit approved migration plan.
3. Add validated write/review workflows with organisation scope and atomic audit behaviour.
4. Add reporting projections/queries with null-versus-zero, sample isolation, period boundaries, and reconciliation tests.
5. Add public dashboard aggregation only for approved, verified, disclosable aggregates.
6. Record source freshness and data-as-of only when the source supplies trustworthy timestamps.

## 6. Related source documents

- `docs/phase-3/PHASE_3_1_REPORTING_DATA_CONTRACT.md`
- `docs/phase-3/PHASE_3_2_PHYSICAL_PROGRESS_DESIGN.md`
- `docs/phase-3/PHASE_3_6_CROSS_DOMAIN_READINESS.md`
- `prisma/migrations/20261104100000_iti_operational_submissions/migration.sql`

**Exit condition:** Physical KPI implementation remains blocked until the source owner and programme authority approve the definitions, authoritative source, evidence policy, reporting period, hierarchy, and visibility.
