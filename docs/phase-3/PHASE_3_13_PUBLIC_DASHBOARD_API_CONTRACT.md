# Phase 3.13 — Public Dashboard API Contract & Regression Tests

**Status:** Implementation committed; local verification pending  
**Branch:** `main`

## Objective

Lock the existing six public, read-only dashboard endpoints into an executable API contract. This slice protects the documented public-access decision and the response-schema references against accidental drift. It does not expand the dashboard payload or approve its public disclosure.

## Scope delivered

- Added `tests/dashboard/public-contract.test.ts`.
- Asserted that all six dashboard paths exist in the OpenAPI specification:
  - `GET /dashboard/state`
  - `GET /dashboard/clusters`
  - `GET /dashboard/clusters/{id}`
  - `GET /dashboard/finance`
  - `GET /dashboard/training`
  - `GET /dashboard/placements`
- Asserted each path documents GET only and explicitly sets `security: []`.
- Asserted each successful response uses its existing named response-schema reference and documents 429/500 responses.
- Asserted cluster detail documents a required positive integer `id` path parameter and 404/422 responses.

## Deliberate boundaries

- No new fields, calculations, statuses, query parameters, or endpoints were introduced.
- The test validates the OpenAPI contract; it does not replace HTTP-level integration tests against a running server.
- Public routing is the selected project direction, but this test is not departmental/NIC approval to disclose every current response field publicly.
- The data semantics and disclosure gaps recorded in Phases 3.8, 3.11, and 3.12 remain open. In particular, legacy financial proxies, student-capacity interpretation, and SIP workflow counting semantics must not be represented as officially approved KPIs.

## Verification

Run locally:

```bash
npm run typecheck
npm test
npm run build
```

Implementation is considered verified only after these commands pass in the project environment.
