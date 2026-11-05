# Phase 3.10 — Dashboard Access-Control & Data-Exposure Audit

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Status:** Source audit complete; access-policy approval and remediation decisions pending  
**Depends on:** Phase 3.0 dashboard data audit; Phase 3.6 cross-domain readiness; Phase 3.7 registry KPI implementation  
**Scope:** Dashboard route authentication, permission checks, resource scope, response exposure and automated security coverage

> **Approval boundary:** This is a source-code audit, not a penetration test or deployed-environment assessment. The Phase 0 dashboard audience and access decisions (DASH-10 / DB-08 / PB-003) remain unresolved. This audit does not invent a public/internal role matrix or change route behaviour.

## 1. Executive finding

All six dashboard GET routes are currently mounted without route-level authentication, permission checks or resource-scope middleware. The application does not apply a global `requireAuth` guard in `src/app.ts` or `src/routes/index.ts`; authentication is applied by individual modules.

The cluster-detail endpoint returns a cluster identity and associated ITI/AIP records, so it is materially more detailed than a state-level aggregate. It currently accepts any caller who can reach the API, subject only to cluster ID validation and record existence.

**Finding:** Dashboard access is not enforced in the inspected route layer. This is a code-level exposure finding; actual internet reachability and deployed reverse-proxy/network controls were not tested.

## 2. Routes and observed guards

| Route | Response scope | Route-level auth | Permission guard | Resource scope |
|---|---|---:|---:|---:|
| `GET /api/v1/dashboard/state` | State aggregate metrics | No | No | No |
| `GET /api/v1/dashboard/clusters` | Cluster summaries and metrics | No | No | No |
| `GET /api/v1/dashboard/clusters/:id` | Cluster profile, metrics, ITI list and AIP list | No | No | No |
| `GET /api/v1/dashboard/finance` | Legacy finance/proposal aggregates | No | No | No |
| `GET /api/v1/dashboard/training` | Student-capacity/profile aggregates | No | No | No |
| `GET /api/v1/dashboard/placements` | Informational unavailable-source message | No | No | No |

Evidence inspected:
- `src/modules/dashboard/dashboard.routes.ts`: registers all six GET handlers directly; the only middleware is parameter validation on the cluster-detail route.
- `src/modules/dashboard/dashboard.controller.ts`: delegates to dashboard service; no authentication or audience filtering.
- `src/modules/dashboard/dashboard.service.ts`: returns state, cluster, finance and training repository aggregates; cluster detail includes ITI and AIP child lists.
- `src/app.ts`: applies Helmet, CORS, rate limiting, parsing, logging and routes; no global authentication guard.
- `src/routes/index.ts`: mounts `/dashboard` directly; neighbouring protected modules apply their own guards.
- `src/middleware/auth.middleware.ts`, `rbac.middleware.ts`, `scope.middleware.ts`: generic primitives exist and rehydrate active user roles/permissions, but dashboard routes do not use them.
- `src/modules/roles/role.constants.ts`: no dashboard-specific permission code or confirmed dashboard role matrix is defined.

## 3. Data-exposure considerations

### 3.1 Cluster detail is the highest-priority route

The service returns:
- cluster ID, name, district and sector;
- Hub/Spoke ITI, AIP and SPV counts;
- SIP submitted/approved counts;
- legacy investment aggregate;
- ITI list and AIP list.

The child lists contain organisation-level records, not merely a top-level anonymous aggregate. The route currently has no identity check and no cluster assignment check.

### 3.2 Other aggregate endpoints still require an approved audience

State, cluster-list, finance and training endpoints are aggregate-oriented, but their intended public/internal audiences have not been approved. Aggregate data should not automatically be assumed public. In addition, finance and training response fields are legacy proposal/profile proxies and must not be represented as approved FIN or academic outcome KPIs.

### 3.3 Placements endpoint

The placements endpoint returns only a message that the source is not established. It does not expose placement records in the inspected service. It still lacks route-level access policy like the other dashboard routes.

## 4. Existing security infrastructure

The repository already contains reusable middleware:
- `requireAuth`: verifies HS256 access tokens, checks the account is active, and reloads current roles and permissions from the database.
- `requireRoles` and `requirePermissions`: enforce current role/permission claims attached by `requireAuth`.
- `requireResourceScope("CLUSTER")`: checks direct cluster assignment, with a global-admin bypass for Super Admin and State PMU Admin.
- Scope integration tests cover assigned/unassigned users, inherited cluster access to child resources, direct ITI/AIP assignment, SIP access through AIP, malformed IDs and global-admin bypass.

However, these primitives do not by themselves establish which dashboard roles should see which aggregates or whether Dashboard Viewer is state-wide, cluster-scoped or both.

## 5. Required policy decisions before route changes

The following are approval requirements, not implementation assumptions:

| Decision | Required confirmation |
|---|---|
| Public dashboard allowlist | Which exact metrics and fields may be returned without authentication? |
| Internal dashboard audience | Which roles may read state, cluster list, finance, training and placements endpoints? |
| Cluster detail scope | Must a caller have direct/parent cluster assignment, or may an approved dashboard viewer see all clusters? |
| Finance/training visibility | Are legacy proposal/profile aggregates allowed for each audience, and what labels/disclaimers are required? |
| Exports and caching | Are dashboard responses exportable/cacheable, and what controls apply to internal data? |
| Permission vocabulary | Confirm whether a dedicated `dashboard.read` permission is required and which roles receive it. |

Relevant Phase 0 gates remain open: DASH-10, Data Dictionary DB-08 and PB-003. The access matrix in `docs/operational-workflow-contract.md` is proposed, not signed dashboard-access approval.

## 6. Recommended remediation sequence

After the owner signs the audience and scope matrix:

1. Define a server-side dashboard access policy using confirmed role/permission codes.
2. Apply `requireAuth` before internal-only routes and `requirePermissions` or confirmed role guards as specified.
3. Apply `requireResourceScope("CLUSTER")` to cluster detail for organisation-scoped users, with only explicitly approved global-view roles bypassing assignments.
4. If selected aggregates are public, expose only an explicit public allowlist and ensure no internal child records or sensitive fields are included.
5. Add route-level tests for anonymous, authenticated-but-unprivileged, authorised global viewer, assigned cluster user, and cross-cluster user.
6. Add response-shape tests proving public responses omit internal-only fields.
7. Re-run typecheck, all tests, build, and security tests; validate deployed configuration separately.

Do not add a blanket role list to dashboard routes until the portal owner confirms the dashboard audience. Do not rely on frontend visibility, CORS or rate limiting as authorization.

## 7. Test coverage gap

Existing tests cover generic RBAC and resource-scope middleware. The inspected test tree contains no dashboard route authorization or public-response allowlist tests. The registry KPI integration test validates query behaviour, not endpoint authorization.

Required tests after policy approval:
- anonymous access to each internal route is rejected;
- authenticated user without dashboard permission is rejected;
- approved Dashboard Viewer access follows the signed scope policy;
- assigned cluster user can read only permitted cluster detail;
- cross-cluster access is denied;
- global roles bypass scope only where the signed policy permits;
- public allowlist endpoints return only approved aggregate fields;
- finance/training proxy fields are not mislabeled as official KPIs.

## 8. Exit status

| Deliverable | Status |
|---|---|
| Dashboard route inventory | Complete |
| Authentication / RBAC / scope middleware inspection | Complete |
| Cluster-detail exposure identified | Complete |
| Existing generic middleware and test coverage reviewed | Complete |
| Dashboard audience and role matrix | Pending owner approval |
| Public metric/field allowlist | Pending owner approval |
| Route authorization implementation | Blocked pending DASH-10 / DB-08 / PB-003 |
| Dashboard route security tests | Pending approved policy |
| Deployed configuration / penetration test | Not performed |

**Phase 3.10 exit:** Source audit complete. The current dashboard route layer has no access guards. The highest-priority remediation is cluster-detail authentication and cluster scope, followed by an approved public/internal allowlist for aggregate routes. Implementation is intentionally held until the accountable owner confirms the policy, avoiding an invented access model or accidental breaking change.

---

**End of Phase 3.10 — Dashboard Access-Control & Data-Exposure Audit**
