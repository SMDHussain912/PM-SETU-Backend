# Phase 7.2 — Training capacity reporting verification

**Endpoints reviewed**
- `GET /api/v1/dashboard/training/reporting`
- `GET /api/v1/dashboard/contract`

## Implementation review

The training reporting route is registered on the public read-only dashboard router. The service combines the state aggregate and per-cluster aggregate and returns the stable metric identifier `academic.student_capacity`.

The source is limited to non-sample `itis.student_strength` values:
- State aggregation includes non-sample ITIs even when they have no reportable cluster.
- Cluster aggregation includes non-sample clusters and excludes sample ITIs.
- ITIs with no cluster, or linked only to a sample cluster, are surfaced separately in `without_reportable_cluster`.
- SQL uses nullable `SUM(student_strength)`; a missing capacity source remains null rather than being converted to zero.
- Coverage counts distinguish null capacity from a genuine numeric zero.

The endpoint does not apply a reporting-period filter. The source has no approved period or as-of semantics, so its response must retain `data_as_of: null`, `reporting_period: null`, and `source_freshness: NOT_TRACKED`.

The contract endpoint remains a descriptive versioned catalogue. It distinguishes unavailable measures from available measures and does not turn catalogue generation time into a data freshness timestamp.

## Added regression coverage

`tests/dashboard/training-reporting-service.test.ts` verifies:
1. Cluster capacity plus capacity outside reportable clusters reconciles to the state total; ITI coverage counts reconcile as well.
2. Null capacity returns `NOT_AVAILABLE`, while numeric zero remains `AVAILABLE`.
3. The reporting response does not invent an as-of date, reporting period, or freshness state.

Existing `tests/dashboard/capacity-aggregation.test.ts` checks the repository SQL for sample-row exclusion, nullable aggregate semantics, and the state/cluster query shape. Existing `tests/dashboard/reporting-contract.test.ts` checks contract versioning, unique metric IDs, unavailable-vs-available classifications, planning-indicator labels, and the official finance approval gates. OpenAPI tests cover the public read-only reporting routes.

## Verification status

The source review and regression tests have been committed. Local `npm run typecheck`, `npm test`, and `npm run build` must be run against the resulting commit before this increment is marked verified. PostgreSQL-backed tests only count as executed when the dedicated test database is configured; skipped integration tests are not live database verification.

## Next work

After local verification, review the Phase 7 source-owner / KPI decision register. Do not add financial-year boundaries, as-of timestamps, freshness claims, or outcome aggregations until authoritative source owners approve their semantics.
