# PM-SETU Phase 1 Release 1 — Readiness Checklist

**Status:** Implementation substantially complete; release verification and formal acceptance remain open.  
**Branch policy:** All Phase 1 fixes are committed directly to `main`.  
**Repositories:**
- Frontend: https://github.com/SMDHussain912/PM-SETU-Frontend
- Backend: https://github.com/SMDHussain912/PM-SETU-Backend

## Phase 1 scope

Phase 1 is the first launchable public information portal and its supporting release foundation. It includes:

- Public portal: Home, About PM-SETU, Governance, AP Clusters, Industry Partners/AIPs, SPVs, Documents, Contact, and basic News/Gallery.
- Government identity/header, leadership banner, homepage KPI/workflow/milestones/cluster highlights, public navigation and footer.
- English/Telugu content structure and responsive/accessibility foundations.
- Public API/CMS publishing controls; unpublished news, documents, gallery content and search results must not leak through public endpoints.
- Authentication, role/permission guards, and organisation/resource scope enforcement for protected workspaces.
- Document upload validation, metadata persistence, version history and audit consistency.
- Automated frontend/backend checks and controlled UAT.

Phase 2 dynamic operational modules and Phase 3 monitoring-dashboard expansion are not release-acceptance substitutes for this Phase 1 checklist.

## Implementation evidence

| Area | Current evidence | Status |
|---|---|---|
| Public portal routes and homepage modules | Frontend routes and page/component structure are present on `main` | Implemented; visual UAT pending |
| English/Telugu structure | Frontend locale resources exist | Implemented; translation/content review pending |
| Public content visibility | Backend public-query regression test covers news, documents, gallery and search visibility | Test authored; execution pending |
| Authentication and RBAC | Backend auth module, role/permission middleware, frontend protected routes and route-access tests exist | Implemented; end-to-end UAT pending |
| Organisation scope | Scope middleware and PostgreSQL integration tests cover cluster inheritance, direct ITI/AIP assignment, linked SIP, denial and admin bypass | Implemented; execution pending |
| Document handling | Upload signature checks, metadata tuple validation, managed-storage path checks, transactional audit writes and row locks | Implemented; regression execution pending |
| Audit/approval consistency | Transactional workflow/approval code and audit-failure integration tests exist | Implemented; execution pending |
| CI workflows | Frontend and backend workflows run install, tests and builds; backend also generates Prisma client, migrates and typechecks | Configured; no workflow runs/status checks are visible yet |
| Manual CI trigger | `workflow_dispatch` added to both CI workflows | Available in GitHub Actions UI |
| Release/UAT approval | No completed departmental UAT or sign-off evidence recorded | Open |

## Required verification

### Backend

Run in GitHub Actions (or a clean Node.js 22 environment with PostgreSQL 16):

1. `npm ci`
2. `npm run db:generate`
3. `npm run db:migrate:deploy`
4. `npm run typecheck`
5. `npm test`
6. `npm run build`

The test script recursively discovers every `*.test.ts` file, including root-level document tests and nested integration tests.

### Frontend

1. `npm ci`
2. `npm test`
3. `npm run lint`
4. `npm run build`

The test script recursively discovers every `*.test.js` file.

### Controlled UAT

- Verify public pages and navigation at desktop and mobile widths.
- Verify English and Telugu selection and content rendering.
- Verify public pages never expose draft/unpublished news, documents or gallery items.
- Verify unauthenticated users cannot enter protected workspaces.
- Verify AIP/SPV/ITI users cannot cross into another role's workspace.
- Verify a scoped user can access only assigned organisation records and permitted descendants.
- Verify authorised CMS users can create, preview, publish and archive content according to their assigned permissions.
- Verify document upload rejects unsupported/spoofed files, persists metadata, downloads only managed files and preserves version history.
- Verify each critical state transition has its audit record; deliberately failed audit writes must roll back the associated mutation.
- Record UAT defects, retest fixes and obtain departmental acceptance.

## Decisions and approvals that must not be guessed

- Final departmental role-to-permission matrix and scope assignment ownership.
- Official content, leadership photographs, KPI values and source/date labels.
- Document metadata vocabulary, retention/archival policy, malware scanning and production storage/backup policy.
- Audit failure policy confirmation (current implementation is fail-closed for transactional mutations).
- Final SPV/SIP/authority workflow and approval responsibility where not yet formally approved.

## Exit criteria

Phase 1 may be marked **Complete** only when:

- Both CI workflows have successful runs for the current `main` commits.
- Backend migrations, typecheck, complete test suite and production build pass.
- Frontend complete test suite, lint and production build pass.
- Controlled UAT passes with recorded evidence and no release-blocking defects.
- Required departmental decisions are confirmed or explicitly accepted as deferred.
- Phase 0 closure and Phase 1 acceptance are formally recorded.

Until then, report the phase as **Implementation complete / release verification pending**, not production-ready.
