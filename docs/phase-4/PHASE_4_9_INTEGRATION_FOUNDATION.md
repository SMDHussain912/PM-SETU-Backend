# Phase 4.9 — Integration Foundation

## Scope
This increment establishes the PM-SETU integration control plane. It does not claim that external government systems are connected.

## Implemented
- Source registry for DET MIS, ITI MIS, Student MIS, Training MIS, Apprenticeship, Placement MIS, Finance MIS, AP Government, DGT/MSDE, GIS, SMS and Email.
- Transport vocabulary: REST, SFTP, CSV upload and webhook.
- Disabled-by-default source registration.
- Credential references only; no passwords, tokens, private keys or connection secrets are stored in PostgreSQL.
- Adapter interfaces for paginated source reads and source-neutral records.
- Sync-run ledger with status, cursor, counts and bounded error summary.
- Administrative API for source registration, enable/disable and run history.
- Database constraints for source/transport/status vocabulary and count consistency.

## API
Base: `/api/v1/admin/integrations`
- `GET /` list configured sources (optional `enabled`, `system` filters)
- `POST /` register a source; new sources default disabled
- `PATCH /:id/enabled` enable/disable a source
- `GET /:id/runs` list latest sync runs

Only Super Admin and State PMU Admin may access these endpoints.

## Security boundary
Credentials are resolved by deployment adapter implementations using `credential_ref` as an environment/secret-manager key. The API never accepts credential values. Do not enable a source until its endpoint, owner, contract, authentication method, rate limit, data classification, and reconciliation procedure are approved.

## Adapter contract
Adapters implement `IntegrationAdapter.fetchPage`, return stable source record IDs, optional source versions/timestamps, JSON payloads, and pagination cursors. Adapter implementations must use approved host allowlists, TLS, timeouts, bounded retries with backoff, and idempotent ingestion. Do not permit arbitrary user-supplied URLs.

## Not claimed complete
No live DET/Student/Training/Finance/Apprenticeship/Placement connection is configured. No academic KPI formula or taxonomy is inferred. Academic source records remain reviewable intake records and are not automatically official KPI facts. Actual connector implementations require approved interface specifications and deployment credentials.
