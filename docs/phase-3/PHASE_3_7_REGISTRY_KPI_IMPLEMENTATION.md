# Phase 3.7 — Registry KPI Implementation (REG-01 to REG-05)

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Implementation slice:** Registry KPI query hardening and cluster drill-down consistency  
**Status:** Implemented in source; database-backed tests added; execution and departmental/access approval pending  
**Depends on:** Phase 3.0 dashboard audit; Phase 3.1 reporting contract; Phase 3.6 cross-domain readiness  
**KPI scope:** REG-01 Clusters, REG-02 Hub ITIs, REG-03 Spoke ITIs, REG-04 AIPs, REG-05 SPVs

> **Boundary:** This slice implements the existing registered-entity count semantics using the current registry tables. It excludes development/sample records and deliberately does not infer active/approved filters. It does not claim departmental approval, production deployment, data reconciliation or public-dashboard approval. No new routes, schema migrations, KPI formulas or permission grants are introduced.

## 1. Phase objective

Implement the first registry KPI subset using existing database records and dashboard queries, without introducing a new reporting schema or changing the existing dashboard route access policy.

The official Phase 0 source mapping defines registered counts for clusters, Hub ITIs, Spoke ITIs, AIPs and SPVs. It calls out status/inclusion questions for several entity types. Until those rules are approved, the implementation counts registered non-sample records and does not filter by lifecycle status.

## 2. Implemented behaviour

| KPI | Source table | Implemented predicate | Meaning |
|---|---|---|---|
| REG-01 | `clusters` | `is_sample = FALSE` | Count of registered non-sample clusters |
| REG-02 | `itis` | `is_sample = FALSE AND type = 'HUB'` | Count of registered non-sample Hub ITIs |
| REG-03 | `itis` | `is_sample = FALSE AND type = 'SPOKE'` | Count of registered non-sample Spoke ITIs |
| REG-04 | `aips` | `is_sample = FALSE` | Count of registered non-sample AIPs |
| REG-05 | `spvs` | `is_sample = FALSE` | Count of registered non-sample SPVs |

### Why sample records are excluded

The repository schema adds `is_sample` to the registry tables, and the migration `20260929092722_add_is_sample` documents the field as a demo/test marker that must be removed before go-live. The dashboard now excludes these rows consistently so test/demo seed records do not inflate registry reporting.

### Why no active/approved filter is applied

Phase 0 asks the department to confirm status inclusion for Hub/Spoke ITIs, AIPs and SPVs. No final active/approved population rule is evidenced. Therefore:

- An ITI with status `INACTIVE` is still included if it is a registered non-sample ITI of the relevant type.
- AIP and SPV lifecycle status does not alter REG-04 / REG-05 counts in this slice.
- The code does not infer “participating”, “operational”, “approved” or “active” from registry existence.

## 3. Code changes

### `src/modules/dashboard/dashboard.repository.ts`

- Updated state-level REG-01–REG-05 source counts to exclude sample rows.
- Updated cluster summary and cluster detail aggregates to use the same non-sample population.
- Excluded sample clusters from cluster summary and cluster detail lookup.
- Excluded sample ITI and AIP rows from cluster drill-down lists.
- Applied the non-sample predicate to the legacy AIP investment sums shown in state/cluster dashboard payloads. This does not make those amounts an approved financial KPI; Phase 3.5 restrictions remain in force.
- Kept existing SIP status counts untouched. REG-06 is not part of this implementation slice.

### `sql/dashboard/dashboard_queries.sql`

Updated the DBA-maintained query reference to mirror the repository predicates. The stale note claiming that the PM-SETU schema does not exist was replaced with an evidence-boundary note: repository models/migrations exist, but their deployment and production reconciliation are not certified by this file.

### `tests/dashboard/registry-kpis.integration.test.ts`

Added database-backed integration coverage that creates isolated real and sample records and checks:

- Non-sample cluster appears; sample cluster is excluded.
- Non-sample Hub ITIs are counted.
- An inactive registered ITI remains included, proving no unapproved active-only filter was added.
- Sample ITI, AIP and SPV records do not inflate cluster aggregates.
- Sample ITI and AIP records do not appear in cluster drill-down.
- Sample cluster cannot be retrieved through the dashboard cluster repository lookup.

The test uses unique CI record identifiers and removes its inserted records in teardown.

## 4. API compatibility and access boundary

- Existing endpoint paths and response field names are unchanged.
- No new public route or new dashboard data category is introduced.
- Existing public/internal exposure is not expanded by this slice. The Phase 0 DASH-10 / Data Dictionary DB-08 access-policy decision remains open and must be resolved before future dashboard access changes or sensitive drill-down publication.
- The existing investment/proposal fields are legacy profile/proposal aggregates, not REG KPIs and not FIN-01 through FIN-05. Phase 3.5 restrictions remain unchanged.

## 5. Verification plan

Run from the backend repository with the configured test database and generated Prisma client:

```bash
npm run typecheck
npm test
npm run build
```

The new integration test requires a migrated PostgreSQL test database with the registry tables and `is_sample` migration applied. It inserts and deletes uniquely named test records; use a dedicated test database, not production.

**Execution status for this commit:** Tests and build have not been run by the implementation agent. The source and test changes are committed for repository-side execution and user verification.

## 6. Deferred work

| Item | Status | Reason |
|---|---|---|
| REG-01–REG-05 registered non-sample query predicates | Implemented | Existing registry tables are sufficient for the registered-count slice |
| Active/approved/operational status filters | Pending approval | DASH-08 / KPI source mapping asks for status inclusion rules |
| Public vs internal access policy | Pending approval | DASH-10 / DB-08 unresolved; no access change made |
| REG-06 SIP submitted/approved | Deferred | Canonical workflow labels, transitions and counting rules require DET/NIC/Approving Authority confirmation |
| KPI freshness/provenance envelope | Deferred | DB-12 contract and source snapshot policy remain pending |
| State/cluster production reconciliation | Not verified | Requires production-like data and accountable source-owner sign-off |
| Public dashboard publication sign-off | Pending | Requires approved metric allowlist and access policy |

## 7. Exit status

**Phase 3.7 implementation slice:** Source changes and database-backed tests prepared for REG-01 through REG-05. No production schema changes were needed.

**Not yet verified:** The user/CI must execute typecheck, tests and build against the configured database. Departmental approval, production reconciliation and public/internal access policy remain separate gates.

---

**End of Phase 3.7 implementation slice — REG-01 to REG-05**
