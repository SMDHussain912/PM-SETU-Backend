# Phase 7 — Academic and industry outcome reporting readiness

**Status:** Intake sources exist; official KPI aggregation remains blocked on source-owner definitions and validated fact semantics  
**Branch:** `main`  
**Scope:** ACD-01..ACD-05 and IND-01..IND-06.

## 1. Decision

Do not aggregate academic or industry intake rows into official KPI totals yet.

The repository now has source-neutral intake and review workflows. These provide provenance, organisation attribution, and operational review status. They do not, by themselves, establish the KPI-specific fact grain, qualifying event, period, deduplication rule, denominator, evidence standard, or authoritative source mapping.

An `ACCEPTED` academic intake row means it passed the configured intake/review process. A `VERIFIED` industry outcome row means it passed the configured outcome review workflow. Neither status automatically certifies that the row qualifies for an official ACD/IND KPI.

## 2. Academic source evidence

The `AcademicSourceRecord` model and `academic_source_records` migration store:
- KPI code ACD-01..ACD-05.
- Source system and source record identity.
- Optional source version, cluster/ITI attribution, event date and pseudonymous subject token.
- Generic JSON payload and review metadata (`PENDING`, `ACCEPTED`, `REJECTED`).

The academic summary groups source records by KPI code and review status and explicitly describes itself as intake workflow counts, not official academic KPI totals.

The Phase 4.6 readiness document identifies missing authoritative sources/definitions for:
- ACD-01 courses offered.
- ACD-02 future-skills courses and taxonomy.
- ACD-03 trainers trained and qualifying completion.
- ACD-04 admissions, Student MIS state and academic-year/cohort rules.
- ACD-05 training completion and evidence.

### Safe disposition

- Keep the existing capacity metric `academic.student_capacity` separate; it is sourced from `itis.student_strength` and is not an ACD-01..ACD-05 outcome.
- Keep intake counts inside the authenticated operational workflow; do not relabel them as course, trainer, admission, or completion totals.
- Do not infer academic year, unique person, course state, completion threshold, or source freshness from generic payloads.

## 3. Industry and employment source evidence

The `IndustryOutcomeRecord` model and `industry_outcome_records` migration store:
- Outcome type: `APPRENTICESHIP`, `OJT`, `INDUSTRY_EXPOSURE`, `PLACEMENT`, `EMPLOYER_PARTICIPATION`.
- Source system and optional source record identity.
- Optional cluster/ITI attribution, employer name, participant reference, event date, evidence reference, generic JSON payload, and review metadata (`PENDING`, `VERIFIED`, `REJECTED`).

The operational summary groups records by outcome type and review status. The implementation does not define KPI-specific qualification or denominator logic.

The Phase 3.4 industry design explicitly leaves unresolved:
- IND-01 apprenticeship opportunity/agreement/contract/enrolled/completed grain.
- IND-02 OJT participant, hours, start/completion and unique-trainee rules.
- IND-03 activity versus participant count and evidence.
- IND-04 placement qualification, employment verification, duplicate handling and time window.
- IND-05 placement numerator, denominator, eligible-completer cohort and exclusions.
- IND-06 unique active employer and qualifying participation (MoU, active engagement or actual contribution).

### Safe disposition

- Do not treat every `VERIFIED` row as a placement, apprentice, OJT completion, exposure participant, or engaged employer.
- Do not calculate placement percentage without an approved numerator, denominator, cohort, period, and deduplication policy.
- Do not treat employer names or participant references as authoritative identities.
- Keep operational outcome summaries distinct from official KPI reporting.

## 4. Shared blockers

Before official aggregation, the accountable source owner and DET must approve:
1. KPI-specific definition and counting grain.
2. Authoritative source/system and stable identity mapping.
3. Inclusion/exclusion, deduplication, correction and restatement rules.
4. Reporting period, academic year/cohort and event-date semantics.
5. Evidence requirements and what `ACCEPTED` / `VERIFIED` establishes.
6. State → Cluster → ITI → course/cohort/employer/participant attribution.
7. Data freshness, reconciliation and completeness expectations.
8. Public aggregate versus restricted operational visibility.
9. Approval record, effective date, and contract version.

For placement percentage, numerator and denominator approval is a hard gate. For personal/participant records, privacy and role-scope review is also required before any additional exposure.

## 5. Implementation gate

After approvals and authoritative feeds exist:
1. Define versioned KPI-specific source contracts and adapters.
2. Validate source identities and event qualification before projecting facts.
3. Add KPI-specific reporting projections/queries, not generic intake-row counts.
4. Test duplicate identities, corrections, period boundaries, scope attribution, missing versus genuine zero, and reconciliation.
5. Expose only approved aggregate fields through the dashboard; keep participant-level payloads and evidence references restricted.
6. Populate data-as-of/freshness only from trustworthy source metadata.

## 6. Related documents

- `docs/phase-3/PHASE_3_1_REPORTING_DATA_CONTRACT.md`
- `docs/phase-3/PHASE_3_4_INDUSTRY_OUTCOMES_DESIGN.md`
- `docs/phase-4/PHASE_4_6_ACADEMIC_KPI_API_READINESS.md`
- `docs/phase-4/PHASE_4_8_ACADEMIC_SOURCE_INTAKE_IMPLEMENTATION.md`
- `src/modules/academics/academic.repository.ts`
- `src/modules/industry-outcomes/industry-outcome.repository.ts`

**Exit condition:** ACD/IND official KPI aggregation remains blocked until source-owner-approved definitions, identity rules, periods, evidence standards, visibility, and authoritative source feeds are available.
