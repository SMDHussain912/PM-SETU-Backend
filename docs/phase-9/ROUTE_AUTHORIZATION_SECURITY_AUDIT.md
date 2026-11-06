# Phase 9 — Route Authorization and Security Control Audit

**Status:** Static audit completed; engineering remediations verified through CI #91; operational deployment verification and VAPT remain open.  
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
- Login account lockout counters are persisted in the database and updated atomically in one PostgreSQL statement; concurrent failed-login increments are covered by a dedicated PostgreSQL integration test.
- Global API and stricter authentication/admin rate limiters are mounted in the application.
- Administrative route families are mounted separately from public read routes. User/role, approval, audit, CMS, cluster/ITI/AIP/SPV/SIP, and integration administration routers include authentication and route-level role guards.
- Resource-scoped mutation routes for clusters, ITIs, AIPs, SPVs and SIPs use `requireResourceScope` where the route design requires an individual resource check.
- Integration webhooks are not protected by a user JWT; they use the separate HMAC signature flow. The webhook service verifies the raw request bytes before validating the parsed payload.
- Banner/gallery image upload signature checks and document upload signature validation have dedicated implementation and regression tests.
- Privileged user and role mutations, password changes and legacy password-hash upgrades write append-only audit entries using allowlisted before/after projections; request actor, IP, user agent and route path are captured.
- Multipart uploads have bounded file, field, part, field-size, field-name and header-pair limits.
- Public document downloads resolve paths under the managed documents root, use attachment disposition, and set `X-Content-Type-Options: nosniff`.
- Latest CI run #93 on commit `996df8985096cb17706cbef9791e96e590bb01fa` passed dependency audit, Prisma generation, all migrations against the isolated CI PostgreSQL database, typecheck, 347 tests with zero skips, and production build. The run includes the public dashboard SQL field-projection regression test. The run includes PostgreSQL lockout concurrency tests, JWT secret/password hashing tests, public projection tests, and privileged audit/request-context coverage. The workflow sets `PM_SETU_TEST_DATABASE_URL`, so opt-in PostgreSQL tests ran in CI. CI sets `PM_SETU_TEST_DATABASE_URL`, so the opt-in PostgreSQL tests are enabled in that run.

## 3. Findings and open controls

### SEC-ROUTE-01 — Role and permission matrix approval record

**Evidence:** `src/modules/roles/role.constants.ts` explicitly labels several role mappings and permission sets as INFERRED / TO CONFIRM. This includes approval, audit, contact, banner, document, news and gallery guard groups. The file also labels the baseline user/role management role groups as inferred defaults.

**Impact:** The code enforces a consistent matrix, but the repository does not establish that this matrix is the formally approved government/portal access policy.

**Required action:** Obtain the approved role-to-action matrix, including scope rules and separation of duties. Record the approving authority and version. Update constants and authorization tests only against that decision.

**Owner-confirmed acceptance (2026-11-07):** Project owner confirms the existing role/permission matrix was discussed with NIC and approved. The existing `role.constants.ts` matrix remains in force; no replacement permissions were inferred during this remediation. The owner confirmation is recorded in `docs/PHASES.md`; a separate signed approval artifact/version was not attached to this repository.

**Disposition:** Accepted based on project-owner confirmation; preserve the current matrix and regression coverage. Reopen only for a formally approved policy change.

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

**Disposition:** Code hardening implemented and verified by successful CI run #74 (commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`). Production deployment must still set `CORS_ORIGIN` to the actual frontend allowlist.

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

### SEC-ROUTE-09 — Public dashboard field-level publication

**Evidence:** `src/modules/dashboard/dashboard.routes.ts` deliberately exposes read-only GET endpoints without authentication. The route comments state that the public model is a project direction and should not be changed without a policy decision.

**Impact:** Public access is an intentional current design, not proof that every returned field is approved for public disclosure.

**Remediation and owner-confirmed acceptance (2026-11-07):** Project owner confirms NIC approval for the current public read-only dashboard response fields. The current public cluster detail query explicitly projects ITI code/name/type/district and AIP name/sector/status/investment amount; other dashboard endpoints expose aggregate registry/planning/capacity values or explicit unavailable states. Official finance values remain null/unavailable rather than exposing transaction-level finance records. Added `tests/dashboard/public-field-projection.test.ts`, which asserts explicit public query projections and rejects private account/contact/bank/storage metadata columns.

The owner confirmation is recorded in `docs/PHASES.md`; a separate signed field-by-field approval artifact/version was not attached to this repository. Future public fields or endpoint additions must be reviewed before exposure.

**Disposition:** Current public read-only dashboard field set accepted based on project-owner confirmation; regression test verified by CI #93.

### SEC-ROUTE-10 — Authorization ordering is inconsistent with the documented middleware sequence

**Evidence:** The route documentation in `RoadMap.md` §27 specifies Authentication → RBAC → Validation → Controller. The initial audit found validation before route-level RBAC in approval, academic, industry-outcome and integration routes. Router-level authentication already ran first in these protected routers.

**Impact:** Authenticated users without the required role could receive validation errors before the authorization denial. This was a response-order inconsistency, not evidence of data access.

**Remediation on `main` (2026-11-07):** Reordered every protected route in `academic.routes.ts`, `approval.routes.ts`, `industry-outcome.routes.ts` and `integration.routes.ts` so `requireRoles` runs before request validation. The integration CSV route now checks the admin role before parsing the CSV body. The HMAC-authenticated integration webhook remains intentionally separate from user RBAC.

**Regression coverage:** `tests/route-middleware-order.test.ts` inventories all 27 protected route declarations across the four modules and asserts that each has an explicit role guard before validation; it also asserts authorization precedes CSV body parsing. This is a source-structure regression test, not a live HTTP authorization test.

**Additional remediation on `main` (2026-11-07):** The initial fix did not yet put resource-level scope authorization ahead of request validation. Reordered all resource-scoped registry and workflow routes in AIP, Cluster, ITI, SIP and SPV modules so the effective chain is Authentication → role authorization → resource-scope authorization → validation → controller. Cluster reassignment restrictions for ITI/AIP/SPV updates also run before validation. Public registry GET routes remain public as explicitly documented in their route modules; this change does not silently change their audience policy.

**Regression coverage:** `tests/route-middleware-order.test.ts` now checks role-before-scope, scope-before-validation, and reassignment-guard-before-validation across the nine affected route files, in addition to the original four route families. The PostgreSQL scope integration test covers cluster inheritance to child resources, direct ITI/AIP assignments, unassigned denial, cross-cluster denial, global admin bypass, and invalid/unauthenticated requests.

**Disposition:** Code remediation and structural regression tests committed and verified by successful CI run #74 (commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`). Public read-field disclosure and exhaustive list/search/summary/export policy review remain open.


### SEC-ROUTE-12 — Privileged user and role mutations have incomplete audit coverage

**Evidence:** Before remediation, user creation, profile/status changes, role replacement, deactivation and role create/update/delete paths did not write audit entries. Organisation-scope replacement already had an audit hook.

**Impact:** Without before/after records, privileged account and permission changes cannot be reliably attributed or reconstructed.

**Remediation on `main` (2026-11-07):**
- User create, profile update, status change, role replacement and soft deactivation now write audit entries.
- Role create/update/delete now write audit entries with permission snapshots.
- Password changes and legacy password-hash upgrades are audited without storing plaintext passwords or password hashes.
- User snapshots use an explicit allowlist and exclude password hashes, failed-login counters and lockout timestamps; role permission lists are sorted for deterministic snapshots.
- Audit context captures actor ID, request IP, user agent and route path.
- Added projection and request-context regression tests.

**Remaining limitation:** Business mutations currently commit in their repository calls before the audit insert. Audit-write errors propagate to the request, but they do not roll back an already committed mutation. Transactional coupling or an outbox remains a hardening item; do not describe the current post-mutation audit write as atomic.

**Disposition:** Event coverage and safe request metadata implemented and verified by CI #91 (commit `3160d8cf9d4a6acba63f7af9264c0357837b76e3`). Atomic coupling remains open.


### SEC-ROUTE-13 — Public document APIs exposed internal filesystem paths

**Evidence:** The public document list/detail/version queries selected and serialized `file_path`; document version responses also exposed the internal `created_by` identifier. These values are storage and internal-account metadata, not required to download a published document (the public download endpoint resolves the stored path server-side).

**Impact:** Public API consumers could learn server filesystem layout and opaque internal user identifiers. The paths do not grant filesystem access by themselves, but their disclosure is unnecessary and increases information exposure.

**Remediation on `main` (2026-11-07):** Added explicit public document projections. Public document list/detail responses omit `file_path`; public version-history responses omit both `file_path` and `created_by`. Public news detail responses now omit nested attachment `file_path` values. Admin mutation responses and server-side download resolution remain unchanged.

**Regression coverage:** `tests/documents/public-projection.test.ts` and `tests/news/public-projection.test.ts` assert that filesystem paths and internal creator IDs are absent while public metadata remains available.

**Disposition:** Code remediation committed and verified by successful CI run #74 (commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`). This does not constitute the broader field-level publication approval required for all public document metadata.


### SEC-ROUTE-14 — Multipart upload parser lacked field and aggregate-part bounds

**Evidence:** The shared Multer wrapper previously set only a per-file byte limit. It did not bound the number of multipart text fields, aggregate parts, individual field size, field-name size or header pairs. Route-level `.single()` and `.array()` calls constrained file counts for the current upload routes, but did not bound non-file multipart parser work.

**Impact:** An authenticated uploader could submit an excessive number of small multipart fields or oversized field values, increasing parser and memory work despite the per-file size limit.

**Remediation on `main` (2026-11-07):** Added shared Multer bounds: maximum 2 files, 10 text fields, 12 total parts, 64 KiB per field, 100-byte field names and 2,000 header pairs. The existing environment-configured per-file size limit and route-specific `.single()` / `.array()` limits remain in force. Added `tests/upload-multipart-limits.test.ts` to protect the shared bounds and ensure the two-image banner upload fits within the parser budget.

**Disposition:** Code hardening committed and verified by successful CI run #74 (commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`).


### SEC-ROUTE-15 — Document downloads did not explicitly disable MIME sniffing

**Evidence:** The public document download controller used Express `res.download()`, which sends an attachment, but did not explicitly set `X-Content-Type-Options`.

**Impact:** Browsers may attempt MIME sniffing in some response contexts rather than consistently respecting the declared content type.

**Remediation on `main` (2026-11-07):** Added `applyDocumentDownloadSecurityHeaders()` to set `X-Content-Type-Options: nosniff` before sending the file. The existing service still resolves the stored path with `realpath`, enforces containment beneath the managed documents directory, and retrieves only published documents. Added `tests/document-download-headers.test.ts`.

**Disposition:** Code hardening committed and verified by successful CI run #74 (commit `94d6205dfc2bff7a38361037f4e15025a91d77e9`). Explicit cache policy remains subject to the public document publication contract.


### SEC-ROUTE-16 — Concurrent failed logins could lose account-lockout increments

**Evidence:** The login service previously read `failed_login_attempts` with the user row, calculated the next value in application memory, then wrote that stale calculated value. Concurrent failed-password requests could therefore overwrite one another's increments and delay the configured lockout threshold.

**Impact:** An attacker distributing failed login attempts across concurrent requests could make the account lockout counter advance more slowly than the actual number of failed attempts.

**Remediation on `main` (2026-11-07):** Replaced the read-then-write sequence and separate lockout update with one atomic PostgreSQL `UPDATE`. The statement increments the current row value, applies the threshold and lock expiry in the same write, resets the counter at lockout, and ignores in-flight attempts while a lock is active. Added `tests/auth-lockout-postgres.test.ts`, which verifies four concurrent increments are retained and a further concurrent burst triggers lockout without losing counts.

**Regression coverage:** CI sets `PM_SETU_TEST_DATABASE_URL` to its isolated migrated PostgreSQL database. The test ran in CI #79 rather than being skipped.

**Disposition:** Code remediation and PostgreSQL concurrency regression committed and verified by successful CI run #79 (commit `bdd063e2ba9f71c7f239d5c1bbf34b3ce3e276cf`).


### SEC-ROUTE-17 — JWT access tokens accepted undersized signing secrets

**Evidence:** Both JWT signing and verification previously rejected only a missing `JWT_ACCESS_SECRET`; any non-empty value was accepted, including values too short to provide a robust HS256 key.

**Impact:** A weak signing secret materially reduces the security of bearer-token integrity and may be vulnerable to offline guessing.

**Remediation on `main` (2026-11-07):** Added a shared use-time validator requiring at least 32 UTF-8 bytes before either signing or verifying access tokens. The environment example continues to recommend generating 48 cryptographically random bytes. Added `tests/auth-secret-validation.test.ts` covering missing, empty, short, boundary-length and multibyte UTF-8 values.

**Deployment requirement:** Configure a cryptographically random secret of at least 32 bytes (recommended 48 bytes) and rotate any previously weak or exposed secret. A length check alone cannot establish entropy.

**Disposition:** Code hardening and regression tests verified by successful CI run #82 (commit `cbf0e4de416ea6d1d470f3a944176993a61a9243`).


### SEC-ROUTE-18 — bcrypt silently truncated passwords beyond 72 bytes

**Evidence:** Password request schemas allowed up to 128 characters, while the backend used bcrypt directly. bcrypt processes only the first 72 input bytes, so a longer password's suffix was not represented in the stored hash.

**Impact:** Users could believe a password's full value was protected when bytes beyond the bcrypt limit did not contribute to authentication.

**Remediation on `main` (2026-11-07):** New password hashes now use a domain-separated SHA-256 pre-hash before bcrypt, so the full UTF-8 password is represented within bcrypt's input limit. The stored format is version-prefixed. Verification remains backward-compatible with existing raw bcrypt hashes; successful logins upgrade legacy hashes automatically when the submitted password is at most 72 bytes. Added `tests/password-hashing.test.ts` covering long UTF-8 passwords, altered suffixes, and legacy hash verification.

**Migration note:** Legacy hashes used with passwords longer than 72 bytes are not automatically rewritten on login, to avoid silently changing the user's effective credential. Those users should use the authenticated change-password flow to move to the full-input hash format. The reset/recovery lifecycle remains an external acceptance item.

**Disposition:** New hash format, backward-compatible verification and regression tests verified by successful CI run #84 (commit `84a84b8a078367679373a10af070233dd2f1d8a3`).

## 4. Additional verification required before sign-off

- Protected resource-specific mutation and workflow routes in AIP, Cluster, ITI, SIP and SPV use resource-scope middleware; PostgreSQL integration coverage exists for inherited and direct assignment cases. Public registry GET routes are intentionally unguarded in the current route design. Still inspect every public list/search/summary/export response against the approved publication policy; route-level mutation guards do not prove public-field disclosure is safe.
- Verify the role/permission matrix and permission seeding against the approved access policy.
- Confirm production uses a cryptographically random JWT signing secret of at least 32 bytes and rotate any prior weak secret.
- Complete transactional coupling of privileged mutations and their audit writes; extend coverage to failed transitions and file operations.
- Document downloads are published-record-only, path-contained, sent as attachments and protected with `X-Content-Type-Options: nosniff`; confirm the appropriate cache policy with the publication owner.
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
