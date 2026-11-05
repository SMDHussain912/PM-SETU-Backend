# Phase 3.14 — Dashboard OpenAPI Required-Field Contract

**Status:** Implementation committed; local verification pending  
**Branch:** `main`  
**Depends on:** Phase 3.13 public dashboard API contract tests

## Objective

Make the OpenAPI schemas accurately communicate which fields the current dashboard service always emits. In OpenAPI, listing a property does not make it required; consumers otherwise cannot distinguish a mandatory response key from an optional one.

## Changes

Updated `src/docs/swagger.ts` to add `required` declarations for all top-level fields emitted by the six dashboard response interfaces:

- `StateMetrics`
- `ClusterSummary`
- `ClusterDashboardResponse`
- `FinanceMetrics`
- `TrainingMetrics`
- `PlacementMetrics`

The cluster dashboard also marks its nested cluster identity, metrics, ITI item, and AIP item fields as required.

Updated `tests/dashboard/public-contract.test.ts` to assert that the six top-level required-field lists remain aligned with the current response contract.

## Scope boundaries

- This documents the current implementation; it does not establish official KPI definitions or departmental/NIC approval.
- Nullable fields such as `trainees`, `industries_engaged`, and `investment_amount` remain required keys whose values may be null. Required and nullable are separate concepts.
- No endpoint, payload value, SQL query, or business rule was changed.
- This is an OpenAPI schema contract test, not a live HTTP integration test.

## Verification

Run locally:

```bash
npm run typecheck
npm test
npm run build
```

Do not mark the slice verified until all three commands pass in the project environment.
