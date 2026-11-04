# Organisation scope assignments

## Purpose
The `user_scope_assignments` table binds an official account to one or more organisation records. This is the foundation for resource-level authorisation; role membership alone does not grant access to every cluster, institute, partner or SPV.

## Supported scope types
- `CLUSTER` — Cluster Admin accounts.
- `ITI` — Hub ITI User accounts must be assigned to HUB records; Spoke ITI User accounts must be assigned to SPOKE records.
- `AIP` — AIP User accounts.
- `SPV` — SPV User accounts.

An account with multiple scoped roles must receive matching assignments for each role. Duplicate assignments, nonexistent targets, incompatible ITI types, self-assignment changes and scope changes to privileged administrator accounts by non-Super-Admins are rejected.

## API
- `GET /api/v1/admin/users/:id/scopes` — read a user's assignments (Super Admin / State PMU Admin).
- `PUT /api/v1/admin/users/:id/scopes` — replace all assignments (Super Admin / State PMU Admin; Super Admin only for privileged accounts).
- `GET /api/v1/auth/me/scopes` — read the current authenticated user's assignments.

## Migration
Apply the new Prisma migration before deploying the API/frontend changes:

```bash
npx prisma migrate deploy
npx prisma generate
npm run typecheck
npm run build
```

Do not manually create the table in production; use the migration history.

## Resource guard
`src/middleware/scope.middleware.ts` provides `requireResourceScope` for future write endpoints. Mount it after `requireAuth` and before validation/controllers. The guard allows global Super Admin and State PMU Admin operators; all other accounts need a direct resource assignment or a matching parent-cluster assignment.

## Important boundary
The assignment API and guard establish the scope model. They do not, by themselves, turn existing public directory GET routes into private routes or implement every role's submission/edit/approval workflow. Every future mutation endpoint must use the scope guard and must also enforce its own business transition rules and audit requirements.
