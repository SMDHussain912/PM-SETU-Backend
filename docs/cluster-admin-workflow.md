# Cluster Admin operational workflow

## Scope
Cluster Admin accounts operate only on clusters assigned through `user_scope_assignments`. The backend enforces this with `requireResourceScope("CLUSTER")` on every cluster workflow endpoint. State PMU and Super Admin retain the global scope bypass defined by the shared scope middleware.

## Capabilities delivered
- Cluster overview with Hub/Spoke/active ITI counts and pending report counts.
- Institute submission inbox for all ITI reports belonging to the assigned cluster.
- Cluster progress report drafts with reporting period and structured JSON payload.
- Submit cluster reports to State PMU.
- State PMU/Super Admin review decisions: approve, reject or request revision.
- Audit entries for cluster report create, update, submit and review actions.

## API
- `GET /api/v1/clusters/:id/overview`
- `GET /api/v1/clusters/:id/iti-reports`
- `GET /api/v1/clusters/:id/submissions`
- `POST /api/v1/clusters/:id/submissions`
- `PATCH /api/v1/clusters/:id/submissions/:submissionId`
- `POST /api/v1/clusters/:id/submissions/:submissionId/submit`
- `POST /api/v1/clusters/:id/submissions/:submissionId/review`

## Review boundary
Cluster Admin reviews institute submissions through the ITI submission review endpoint, which checks that the ITI belongs to the assigned cluster. Cluster reports are submitted to State PMU; only State PMU and Super Admin can decide those reports in this milestone.

## Validation required
Apply the new migration, regenerate Prisma Client, run typecheck/build, and execute integration tests for assigned-vs-unassigned cluster access, ITI report review scope, report creator ownership, and invalid state transitions. This PR has not been run against a test database in the authoring environment.
