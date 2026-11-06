# Phase 3.12 — Public Dashboard Sample-Data Isolation

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Status:** Verified by GitHub Actions CI #74 — 335 tests passed, no skips  
**Depends on:** Phase 3.7 registry KPI implementation; Phase 3.10 public access decision; Phase 3.11 public response review

## 1. Objective

Ensure that public dashboard aggregates do not include development/demo rows marked `is_sample = TRUE`. This is a data-integrity correction, not a change to KPI definitions, workflow semantics, or public access policy.

## 2. Findings addressed

The Phase 3.11 source review identified inconsistent sample-row treatment in legacy finance and training aggregates. SIP submitted/approved dashboard counts also needed to exclude sample SIP records, independently of the still-pending official SIP workflow counting contract.

## 3. Implementation

Updated `src/modules/dashboard/dashboard.repository.ts` and the matching DBA SQL reference `sql/dashboard/dashboard_queries.sql`:

- State SIP submitted/approved counts exclude sample SIPs.
- Cluster SIP submitted/approved counts exclude sample SIPs.
- Finance aggregates exclude sample AIPs and sample SIPs.
- Finance-by-cluster excludes sample clusters, AIPs and SIPs.
- Training capacity aggregates exclude sample ITIs.
- Training-by-cluster excludes sample clusters and sample ITIs, while retaining zero-ITI clusters through the LEFT JOIN.

No active/approved filter was added to registry counts. No official finance, training, placement or SIP KPI formula was invented. Existing legacy finance and student-capacity labels remain unchanged.

## 4. Regression test

Added `tests/dashboard/sample-exclusion.test.ts`. It stubs Prisma's raw-query boundary and verifies all six affected aggregate query paths include sample-row predicates, including the state and cluster SIP counts and finance/training breakdowns.

The test does not require a live database; it verifies the SQL emitted by the repository functions. Existing database-backed registry tests remain separate.

## 5. Verification

GitHub Actions run #74 verified this change on commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`: migrations, TypeScript typecheck, 335 tests (0 failures, 0 skips), and production build all passed. CI provides the dedicated PostgreSQL test database through `PM_SETU_TEST_DATABASE_URL`. Workflow: https://github.com/smdgamekingindo-TN/PM-SETU-Backend/actions/runs/42293934260.

## 6. Exit status

| Deliverable | Status |
|---|---|
| Sample exclusion in state SIP aggregates | Implemented |
| Sample exclusion in cluster SIP aggregates | Implemented |
| Sample exclusion in finance aggregates | Implemented |
| Sample exclusion in finance-by-cluster | Implemented |
| Sample exclusion in training capacity aggregates | Implemented |
| Sample exclusion in training-by-cluster | Implemented |
| DBA SQL reference aligned | Implemented |
| Regression test added | Implemented; CI #74 passed |
| Official KPI semantics / source approval | Unchanged; remains governed by existing gates |

**Phase 3.12 exit:** Implementation and regression verification complete in CI. Departmental publication approval remains separate.

---

**End of Phase 3.12 — Public Dashboard Sample-Data Isolation**
