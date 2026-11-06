# Phase 9 — Route Authorization and Security Control Audit

**Status:** Initial static audit completed; remediation and stakeholder decisions remain open.  
**Branch:** `main`  
**Baseline commit:** `fc326ca4859366564d5afbf65eeb6370f1d2be95`  
**Audit date:** 2026-11-07

## 1. Scope and method

This is a source-level review of the Express application setup, route mounts, authentication/RBAC middleware, role constants, authentication service, contact submission path, and current file-storage wrappers.

It is not a penetration test, VAPT, production configuration inspection, or formal authorization approval. Findings below distinguish directly observed implementation facts from items that need an owner decision or deeper verification. No production policy is inferred by this audit.

## 2. Verified positive controls

- Protected requests use `requireAuth`, which verifies JWTs with an explicit HS256 algorithm allowlist.
- Protected requests re-check that the account is currently ACTIVE and reload current role and permission assignments from PostgreSQL. Authorization does not rely on stale role/permission claims from an old access token.
- Login uses a generic invalid-credentials response and performs a dummy password hash comparison for unknown usernames to reduce account-enumeration timing differences.
- Login account lockout counters are persisted in the database.
- Global API and stricter authentication/admin rate limiters are mounted in the application.
- Administrative route families are mounted separately from public read routes. User/role, approval, audit, CMS, cluster/ITI/AIP/SPV/SIP, and integration administration routers include authentication and route-level role guards.
- Resource-scoped mutation routes for clusters, ITIs, AIPs, SPVs and SIPs use `requireResourceScope` where the route design requires an individual resource check.
- Integration webhooks are not protected by a user JWT; they use the separate HMAC signature flow. The webhook service verifies the raw request bytes before validating the parsed payload.
- Banner/gallery image upload signature checks and document upload signature validation have dedicated implementation and regression tests.
- The latest CI run on the baseline commit passed dependency audit, all 19 migrations, typecheck, 321 tests with zero skips, and production build. CI sets `PM_SETU_TEST_DATABASE_URL`, so the opt-in PostgreSQL tests are enabled in that run.

## 3. Findings and open controls

### SEC-ROUTE-01 — Role and permission matrix is not formally approved

**Evidence:** `src/modules/roles/role.constants.ts` explicitly labels several role mappings and permission sets as INFERRED / TO CONFIRM. This includes approval, audit, contact, banner, document, news and gallery guard groups. The file also labels the baseline user/role management role groups as inferred defaults.

**Impact:** The code enforces a consistent matrix, but the repository does not establish that this matrix is the formally approved government/portal access policy.

**Required action:** Obtain the approved role-to-action matrix, including scope rules and separation of duties. Record the approving authority and version. Update constants and authorization tests only against that decision.

**Disposition:** Acceptance blocker; do not guess replacement roles.

### SEC-ROUTE-02 — Public contact form has no CAPTCHA integration

**Evidence:** `RoadMap.md` §23 calls for CAPTCHA on the public form. `src/modules/contact/contact.routes.ts` applies request validation and `authLimiter`, but its route documentation states that no CAPTCHA provider exists yet and marks it TO CONFIRM.

**Impact:** Rate limiting reduces abuse but does not satisfy a CAPTCHA requirement.

**Required action:** Confirm the approved CAPTCHA provider, server-side verification contract, secret configuration, failure behaviour, accessibility requirements and test/sandbox credentials. Then implement verification before persisting a contact message.

**Disposition:** Open implementation dependency; provider must be selected/approved first.

### SEC-ROUTE-03 — Authentication lifecycle is incomplete

**Evidence:** `src/modules/auth/auth.routes.ts` exposes login, current-user/profile-scope reads and change-password. Logout, refresh, forgot-password and reset-password are documented as deferred. Access tokens are stateless bearer JWTs with an eight-hour default lifetime; no token denylist or refresh-token persistence is present in the inspected auth implementation.

**Impact:** A client cannot revoke an already-issued token through a logout endpoint. Password recovery and refresh-session requirements are not implemented.

**Required action:** Approve the session model first: access/refresh lifetimes, rotation, reuse detection, revocation, logout semantics, password recovery channel, token invalidation after password change, and account recovery controls. Then implement and test that contract.

**Disposition:** Open; do not add a token store or recovery provider without an agreed contract.

### SEC-ROUTE-04 — CORS defaults to wildcard when not configured

**Evidence:** `src/config/env.ts` returns `"*"` when `CORS_ORIGIN` is absent, blank or explicitly `*`. `src/app.ts` maps that setting to `cors({ origin: true, credentials: false })`.

**Impact:** A deployment that omits `CORS_ORIGIN` accepts cross-origin browser requests from arbitrary origins. This is broader than a least-privilege production allowlist.

**Remediation on `main` (2026-11-07):** Added `resolveCorsOrigins()` and changed configuration loading so production startup throws unless `CORS_ORIGIN` contains an explicit comma-separated allowlist. Missing, blank and wildcard values remain permissive only outside production. Wildcard cannot be mixed with explicit origins; explicit origins are trimmed and deduplicated. Added `tests/cors-config.test.ts` for these cases.

**Operational requirement:** Set `CORS_ORIGIN` to the actual frontend origins in every production environment before deployment. The repository cannot determine the deployment's authoritative domains.

**Disposition:** Code hardening implemented; CI verification and deployment environment configuration remain pending.

### SEC-ROUTE-05 — Upload storage is local filesystem storage

**Evidence:** `src/modules/documents/document.storage.ts`, `news.storage.ts` and `gallery.storage.ts` wrap `createUploader` with local folders under `uploads/`; `UPLOAD_DIR` defaults to a local directory. The repository roadmap calls for object/file storage plus database metadata.

**Impact:** Local-disk uploads are not, by themselves, evidence of durable shared production object storage. Ephemeral/container deployments may lose files on replacement, and multiple application instances may not share the same files.

**Required action:** Confirm the production storage provider, durability, private/public access model, download authorization, signed URL policy, encryption, retention/deletion, backup and migration requirements. Implement an approved storage adapter without changing public file contracts unexpectedly.

**Disposition:** Production dependency; provider and deployment policy required.

### SEC-ROUTE-06 — Malware scanning and full file-content inspection remain open

**Evidence:** The Phase 9 security audit records that upload signature checks are not malware scanning or full format decoding. The inspected upload wrappers use Multer and MIME allowlists; signature validation is not equivalent to content disarm/reconstruction or antivirus scanning.

**Impact:** A matching file signature alone does not prove that an uploaded file is safe to store or serve.

**Required action:** Confirm accepted file types, scanning provider/location, quarantine behaviour, scan timeout/failure policy, file-size limits, and whether files can be downloaded before a clean scan result. Add tests for rejected, pending and failed scans.

**Disposition:** Open security control; provider/policy decision required.

### SEC-ROUTE-07 — Rate-limit state is process-local in the current configuration

**Evidence:** `src/middleware/rateLimit.middleware.ts` creates express-rate-limit instances without a configured shared store.

**Impact:** In a multi-instance deployment, each process maintains its own limiter state. Limits are not a single shared quota across instances and reset when a process restarts.

**Required action:** Confirm deployment topology and abuse-control requirements. If multiple instances are used, configure an approved shared store and test cross-instance enforcement. Also verify trusted-proxy configuration against the actual hosting topology.

**Disposition:** Deployment-dependent hardening; do not claim global rate-limit enforcement yet.

### SEC-ROUTE-08 — Privileged-user MFA is not implemented/verified

**Evidence:** The Phase 9 security audit lists privileged-account MFA availability as an open item. The inspected login flow uses username/password and does not show a second-factor challenge.

**Impact:** Password-only authentication does not meet a requirement for privileged-user MFA if the approving authority requires it.

**Required action:** Confirm which privileged roles require MFA, accepted factors, recovery procedures, enforcement and rollout policy. Implement only against the approved identity/security contract.

**Disposition:** Open security/acceptance dependency.

### SEC-ROUTE-09 — Public dashboard exposure requires an approved field-level publication review

**Evidence:** `src/modules/dashboard/dashboard.routes.ts` deliberately exposes read-only GET endpoints without authentication. The route comments state that the public model is a project direction and should not be changed without a policy decision.

**Impact:** Public access is an intentional current design, not proof that every returned field is approved for public disclosure.

**Required action:** Review each public dashboard response and drilldown field against the approved publication policy. Test that restricted personal, operational and financial details cannot leak through aggregates or nested records.

**Disposition:** Keep read-only behaviour; obtain field-level publication acceptance.

### SEC-ROUTE-10 — Authorization ordering is inconsistent with the documented middleware sequence

**Evidence:** The route documentation in `RoadMap.md` §27 specifies Authentication → RBAC → Validation → Controller. The initial audit found validation before route-level RBAC in approval, academic, industry-outcome and integration routes. Router-level authentication already ran first in these protected routers.

**Impact:** Authenticated users without the required role could receive validation errors before the authorization denial. This was a response-order inconsistency, not evidence of data access.

**Remediation on `main` (2026-11-07):** Reordered every protected route in `academic.routes.ts`, `approval.routes.ts`, `industry-outcome.routes.ts` and `integration.routes.ts` so `requireRoles` runs before request validation. The integration CSV route now checks the admin role before parsing the CSV body. The HMAC-authenticated integration webhook remains intentionally separate from user RBAC.

**Regression coverage:** `tests/route-middleware-order.test.ts` inventories all 27 protected route declarations across the four modules and asserts that each has an explicit role guard before validation; it also asserts authorization precedes CSV body parsing. This is a source-structure regression test, not a live HTTP authorization test.

**Additional remediation on `main` (2026-11-07):** The initial fix did not yet put resource-level scope authorization ahead of request validation. Reordered all resource-scoped registry and workflow routes in AIP, Cluster, ITI, SIP and SPV modules so the effective chain is Authentication → role authorization → resource-scope authorization → validation → controller. Cluster reassignment restrictions for ITI/AIP/SPV updates also run before validation. Public registry GET routes remain public as explicitly documented in their route modules; this change does not silently change their audience policy.

**Regression coverage:** `tests/route-middleware-order.test.ts` now checks role-before-scope, scope-before-validation, and reassignment-guard-before-validation across the nine affected route files, in addition to the original four route families. The PostgreSQL scope integration test covers cluster inheritance to child resources, direct ITI/AIP assignments, unassigned denial, cross-cluster denial, global admin bypass, and invalid/unauthenticated requests.

**Disposition:** Code remediation and structural regression tests committed; the latest CI run must be checked for final verification. Public read-field disclosure and exhaustive list/search/summary/export policy review remain open.


### SEC-ROUTE-12 — Privileged user and role mutations have incomplete audit coverage

**Evidence:** `src/modules/users/user.service.ts` writes an audit entry for organisation-scope replacement, but the inspected create-user, profile-update, status-change, role-replacement and deactivation service paths do not call the audit service. `src/modules/roles/role.service.ts` create/update/delete paths also do not write audit entries. The repository exposes an append-only audit-create hook, and `RoadMap.md` §21 explicitly describes transaction audit metadata for approval transactions; the RoadMap does not define a complete audit-event matrix for user/role administration.

**Impact:** Changes to privileged accounts and role definitions may not have an attributable before/after audit record. This is especially important because role and permission assignments directly affect access.

**Required action:** Confirm the required audit event matrix for user creation, profile changes, activation/deactivation, role assignment/removal, role/permission changes and scope replacement. Confirm whether audit-write failure must roll back the business transaction or be handled by another approved delivery mechanism. Then add actor, target, action, before/after values and request metadata with regression tests. Do not choose fail-open/fail-closed semantics by assumption; the audit service currently documents that policy as TO CONFIRM.

**Disposition:** Open security/acceptance finding; implementation depends on audit policy confirmation.


### SEC-ROUTE-13 — Public document APIs exposed internal filesystem paths

**Evidence:** The public document list/detail/version queries selected and serialized `file_path`; document version responses also exposed the internal `created_by` identifier. These values are storage and internal-account metadata, not required to download a published document (the public download endpoint resolves the stored path server-side).

**Impact:** Public API consumers could learn server filesystem layout and opaque internal user identifiers. The paths do not grant filesystem access by themselves, but their disclosure is unnecessary and increases information exposure.

**Remediation on `main` (2026-11-07):** Added explicit public document projections. Public list/detail responses omit `file_path`; public version-history responses omit both `file_path` and `created_by`. Admin mutation responses and server-side download resolution remain unchanged.

**Regression coverage:** `tests/documents/public-projection.test.ts` asserts that filesystem paths and internal creator IDs are absent while public document metadata remains available.

**Disposition:** Code remediation committed; CI verification pending. This does not constitute the broader field-level publication approval required for all public document metadata.

## 4. Additional verification required before sign-off

- Protected resource-specific mutation and workflow routes in AIP, Cluster, ITI, SIP and SPV use resource-scope middleware; PostgreSQL integration coverage exists for inherited and direct assignment cases. Public registry GET routes are intentionally unguarded in the current route design. Still inspect every public list/search/summary/export response against the approved publication policy; route-level mutation guards do not prove public-field disclosure is safe.
- Verify the role/permission matrix and permission seeding against the approved access policy.
- Verify audit event coverage for every privileged mutation, including failed transitions and file operations.
- Inspect file download responses for content disposition, content type, cache controls, path traversal protection and authorization.
- Review production TLS termination, reverse-proxy trust, secrets management/rotation, database least privilege, backup/restore, monitoring and incident response.
- Run authenticated and unauthenticated route tests for every public/admin route family.
- Obtain VAPT and formal security sign-off; CI success is not a substitute.

## 5. Recommended remediation sequence

1. Obtain role matrix, public dashboard disclosure policy, CAPTCHA provider, session lifecycle and storage provider decisions.
2. Fix independently actionable middleware-order and configuration hardening with regression tests.
3. Implement approved CAPTCHA and session lifecycle.
4. Add approved shared storage and malware scanning controls.
5. Complete list/detail/export scope review and audit-event coverage.
6. Verify deployment controls, backup/restore, monitoring and VAPT.
7. Update the Phase 9 tracker only when evidence exists.

## 6. Completion rule

Do not mark Phase 9 complete because the route audit document exists or CI passes. Each finding must be remediated, explicitly accepted with an owner and evidence, or recorded as a release-blocking external dependency. No inferred role matrix, public disclosure decision, provider endpoint, credential or security policy may be represented as approved.
