# PM SETU operational workflow implementation contract

Status: implementation contract for the operational workflow workstream. This document does not claim that the workflows described below are already implemented.

## Security invariants

1. Every write request requires an authenticated, active account.
2. Organisation-scoped roles may read or mutate only resources covered by their current `user_scope_assignments`.
3. Scope checks are performed on the server for every resource ID. Hiding a link or form in the UI is not authorization.
4. Super Admin and State PMU Admin may have state-wide access according to the permission matrix; privileged account management remains Super Admin-only.
5. A Hub ITI assignment must target an ITI whose `type` is `HUB`; a Spoke ITI assignment must target `SPOKE`.
6. AIP, SPV and SIP access must be checked against the direct assignment and validated parent relationships. Never trust a client-supplied cluster/AIP ID without loading the resource relationship.
7. Audit events are append-only and must not contain credentials or secrets.

## Role-to-workflow matrix

| Role | Operational responsibility | Write boundary |
|---|---|---|
| Super Admin | Platform administration and emergency oversight | Global; privileged user/role operations |
| State PMU Admin | State programme coordination and monitoring | State-wide programme records; no privileged account administration |
| DET Content Admin | Programme content and communication | CMS resources only |
| Cluster Admin | Cluster coordination, assigned ITI monitoring and cluster reports | Assigned clusters and their related records |
| Hub ITI User | Hub institute profile, personnel, trades, training and progress | Assigned HUB ITIs only |
| Spoke ITI User | Spoke institute profile, personnel, trades, training and progress | Assigned SPOKE ITIs only |
| AIP User | Industry partner activities and placement reporting | Assigned AIPs and validated related records |
| SPV User | SPV records and SIP preparation/tracking | Assigned SPVs and validated related SIPs |
| Approving Authority | Review and decide on assigned submissions | Assigned approval tasks only |
| Dashboard Viewer | Read-only programme monitoring | No mutations |

This is the proposed operational matrix. Before enabling production decisions, the portal owner must confirm the exact approval delegation and whether Cluster Admin submissions require a separate State PMU acceptance step.

## Workflow contracts

### Institute and cluster operations

- Hub and Spoke users create/update drafts for their assigned institute only.
- Institute data sections: profile/contact, trades, infrastructure/labs, personnel, training activity, student strength and progress reports.
- Cluster Admin can review the assigned cluster's institute submissions, return them for correction, and submit cluster-level progress reports.
- State PMU can monitor submissions across clusters and request clarification.
- All writes use optimistic concurrency or an equivalent stale-update check.

### AIP and SPV operations

- AIP users maintain their assigned partner profile and submit activity, training partnership and placement reports.
- SPV users maintain assigned SPV records and track linked SIP progress.
- The API must derive and validate parent relationships from database records, not trust IDs sent in the request body.

### SIP state machine

Allowed states:
`DRAFT -> SUBMITTED -> UNDER_SCRUTINY -> (REVISION_REQUESTED | RECOMMENDED | REJECTED)`
`REVISION_REQUESTED -> SUBMITTED`
`RECOMMENDED -> APPROVED`
`APPROVED -> IMPLEMENTATION`

Every transition must be an explicit server-side command with:
- actor and timestamp;
- current-state precondition;
- role/delegation check;
- mandatory remarks for revision/rejection;
- immutable decision-history record;
- corresponding audit event.

No client may PATCH the status field directly. The workflow transition API owns state changes.

## API design direction

Use resource-oriented endpoints for drafts and submissions, for example:
- `GET/PATCH /api/v1/itis/:id` for scoped institute data;
- `POST /api/v1/itis/:id/submissions` for an institute report;
- `GET /api/v1/clusters/:id/submissions` and cluster report endpoints;
- AIP activity and placement-report endpoints under the assigned AIP;
- SPV and SIP endpoints with relationship-aware scope checks;
- approval inbox/detail/transition endpoints for assigned approvers.

Exact endpoint naming should follow the existing router conventions and be reconciled with `RoadMap.md` before implementation. Do not expose mutation endpoints as public directory endpoints.

## Required tests before merge

- Unauthenticated and inactive accounts are rejected.
- Each scoped role can access its assigned resource.
- The same role cannot read or mutate another organisation by changing a URL/body ID.
- Hub/Spoke type mismatch is rejected.
- Parent cluster/AIP/SPV relationship mismatch is rejected.
- Invalid SIP transitions and unauthorized decisions are rejected.
- Successful writes create audit entries; failed writes do not create misleading success events.
- Validation, pagination and error envelopes follow existing API conventions.

## Delivery sequence

1. Verify current Prisma schema and actual table/column contracts; do not infer columns from old SQL comments.
2. Implement shared authorization and audit helpers with tests.
3. Implement ITI draft/profile and institute report workflow.
4. Implement cluster review/report workflow.
5. Implement AIP and SPV operations.
6. Implement SIP state machine and approval inbox.
7. Add frontend forms, statuses, history and role-specific guides.
8. Run typecheck, build, migration validation and integration tests against a disposable test database.

## Current limitations

This document is a contract only. It does not create database tables, routes, UI screens or operational workflows. A feature is complete only when its API, UI, authorization, audit behaviour and tests are merged and deployed.
