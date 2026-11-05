# Phase 4.8 — Academic Source Intake Implementation

**Branch:** main  
**Status:** Backend intake and review workflow implemented; official KPI aggregation remains gated on approved source contracts.

## Implemented

- Added `academic_source_records` with ACD-01 through ACD-05 source classification, source-system identity, source version, cluster/ITI attribution, event date, pseudonymous subject token, bounded JSON payload and review metadata.
- Added database uniqueness for `source_system + source_record_id`, KPI/status checks, organisation foreign keys and query indexes.
- Added authenticated endpoints under `/api/v1/admin/academic-records`:
  - `POST /` — create a pending source record.
  - `POST /import` — import 1–200 independently validated source records.
  - `GET /` — paginated, filterable source records.
  - `GET /:id` — scoped record detail.
  - `GET /summary` — intake workflow counts by ACD code and review state.
  - `POST /:id/review` — accept or reject a source record.
- Added source-level idempotency, ITI/cluster relationship validation, audit entries, bounded payload validation and direct-personal-identifier key rejection.
- Added organisation scope filtering for Cluster Admin and Hub/Spoke ITI users. Statewide administrators retain global read access.
- Added schema/access unit tests and OpenAPI descriptions.

## Important semantic boundary

A source record's `ACCEPTED` status means the record passed the configured intake/review process. It does **not** mean the record qualifies for an official academic KPI. The summary endpoint returns intake workflow counts only; it is not an ACD KPI calculation endpoint.

No academic-year rules, future-skills taxonomy, course-offering meaning, unique-trainer definition, admission counting grain, training completion threshold, or evidence policy has been invented.

## Still required for official KPI production

1. DET-approved course master and ACD-01 meaning (approved, active or actually running).
2. Versioned future-skills taxonomy for ACD-02.
3. Authoritative trainer source and qualifying completion definition for ACD-03.
4. Student MIS source, admission state and academic-year/cohort rules for ACD-04.
5. Training MIS source, completion criteria and evidence/correction policy for ACD-05.
6. Source interface contract, stable identifiers, refresh cadence, reconciliation and privacy approval.

Once those are supplied, source adapters and validated KPI-specific projections can be implemented without changing the intake provenance contract.

## Verification

Run after pulling the implementation:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run typecheck
npm test
npm run build
```

Record actual local command output. This report does not claim local test execution or production migration completion.
