# AIP operational workflows

## Scope
AIP users manage activity records and periodic progress reports only within AIP IDs assigned to their account. Every operational route uses authentication, role checks and `requireResourceScope("AIP")`. Cluster Admin scope can cover AIPs associated with the assigned cluster using the shared scope middleware.

## Activity register
Supported activity types: industry engagement, apprenticeship, placement, faculty support, equipment support, training support and other. Records include title, description, quantity, date, optional institute and evidence URL. If an institute is linked, it must belong to the AIP's cluster.

## Progress reports
AIP users create and edit their own drafts, submit reports, and revise reports returned for correction. Cluster Admin, State PMU Admin and Super Admin can review submitted reports with remarks.

## API
- `GET/POST /api/v1/aips/:id/activities`
- `GET/POST /api/v1/aips/:id/submissions`
- `PATCH /api/v1/aips/:id/submissions/:submissionId`
- `POST /api/v1/aips/:id/submissions/:submissionId/submit`
- `POST /api/v1/aips/:id/submissions/:submissionId/review`

## Validation required
Apply the migration, regenerate Prisma Client, run backend typecheck/build, and add integration tests for AIP scope, institute-to-cluster association, report ownership and workflow transitions. No test database or build was run in the authoring environment.
