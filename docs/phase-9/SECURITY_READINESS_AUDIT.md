# Phase 9 — Security Readiness Audit

**Status:** In progress; latest engineering hardening verified by CI on 2026-11-07.  
**Repository:** `smdgamekingindo-TN/PM-SETU-Backend`  
**Branch:** `main`  
**Verified commit:** `2bf29fd29726a5a69a7ebe881a850f30e65e4dba`

## 1. Verified changes

### Dependency vulnerability gate

The CI pipeline runs:

```bash
npm audit --audit-level=high
```

The first scan found 11 advisories: 1 critical, 7 high and 3 moderate. A semver-compatible `npm audit fix` updated the lockfile (19 packages changed, 9 removed, 3 added). The remediation run reported **zero vulnerabilities**. The updated lockfile is committed on `main`; the one-time remediation workflow was removed after use.

The audit command remains in the normal CI pipeline. It fails the pipeline for high or critical advisories. Moderate advisories are also reported by npm but are below this command's failure threshold.

### Image upload content validation

Banner and gallery uploads previously relied on the client-provided MIME declaration after Multer's MIME filter. The new shared validator checks:
- Extension and declared MIME type agree.
- File is non-empty.
- Leading bytes match JPEG, PNG, WebP or GIF signatures.
- Returned gallery filename is reduced to a basename and control characters are removed.
- A rejected multi-image batch has all its stored files removed.
- Banner image uploads accept at most two files, matching the desktop/mobile image slots.

The existing document upload path already had a separate signature validator and was not replaced.

Regression tests cover valid signatures, spoofed bytes, mismatched MIME declarations, empty/unsupported files, filename sanitisation, batch cleanup and safe repeated cleanup.

### Multipart parser resource bounds

The shared Multer wrapper now limits each multipart request to 2 files, 10 text fields and 12 total parts; individual fields are limited to 64 KiB, field names to 100 bytes and header pairs to 2,000. Route-level `.single()` / `.array()` limits and the environment-configured per-file byte limit remain in force. Regression coverage is in `tests/upload-multipart-limits.test.ts`.

## 2. GitHub Actions evidence

Commit: `2bf29fd29726a5a69a7ebe881a850f30e65e4dba`

The completed workflow **Install, migrate, typecheck, test and build** (#67) passed:
- npm dependency audit
- Prisma client generation
- Migrations against the isolated CI PostgreSQL database
- TypeScript typecheck
- Test suite: 334 passed, 0 failed, 0 skipped
- Production build

The CI job sets `PM_SETU_TEST_DATABASE_URL`; zero skipped tests confirms the opt-in PostgreSQL integration tests ran in the isolated CI database. Workflow: https://github.com/smdgamekingindo-TN/PM-SETU-Backend/actions/runs/42293460253

## 3. Remaining Phase 9 work

The following items are not certified by the checks above and remain open:
- The initial source-level route authorization and organisation-scope audit is documented in `ROUTE_AUTHORIZATION_SECURITY_AUDIT.md`; exhaustive live HTTP tests and formal role-policy approval remain open.
- Security review of file storage, download headers, retention, malware scanning and production object storage.
- Review of CORS, trusted proxy, rate-limit storage and deployment-specific configuration.
- Privileged-account controls, MFA availability and account recovery policy.
- Security logging, alerting, secret rotation and incident response runbook.
- Backup/restore and disaster-recovery evidence.
- Dependency update policy and recurring vulnerability review.
- End-to-end security testing, Vulnerability Assessment and Penetration Testing (VAPT), and formal security sign-off.

## 4. Scope boundaries

A passing CI run is engineering verification, not government acceptance, VAPT certification or production approval. Do not claim the portal is production-secure until the remaining checks, operational controls and required approvals are evidenced.

Phase 7 KPI definitions and Phase 8 provider integrations retain their existing source-owner and approval gates. Security work must not invent external endpoints, credentials, KPI formulas or permissions.
