# Phase 4.10 — Scheduled Synchronization and Inbound Adapters

**Branch:** main  
**Status:** Scheduler, bounded retries, CSV intake and signed webhook intake implemented. Live government connectors remain approval-gated.

## Scheduled synchronization
- Each source can optionally define `sync_interval_seconds` (60–86,400).
- Scheduling is opt-in using `INTEGRATION_SCHEDULER_ENABLED=true`; polling defaults to 30 seconds and accepts 5–300 seconds.
- PostgreSQL atomically claims due source rows with `UPDATE ... RETURNING`, preventing duplicate claims by concurrently running instances.
- Only enabled sources with a configured interval are eligible.
- Adapters are registered in application code using `registerIntegrationAdapter`; admin-supplied arbitrary URLs are not accepted.
- Each scheduled execution fetches one page of at most 500 records and stores its continuation cursor in the sync-run ledger.
- Adapter fetches receive four total attempts with bounded exponential delays (1s, 2s, 4s). Failures are recorded in the run ledger.

## Inbound adapters
- `POST /api/v1/admin/integrations/:id/csv` accepts authenticated admin CSV uploads.
- CSV content type must be `text/csv` or `application/csv`; maximum body size is 1 MB and maximum batch size is 500.
- CSV headers must be exactly `source_record_id,source_version,occurred_at,payload_json`.
- `POST /api/v1/integrations/webhooks/:id` accepts source-neutral JSON batches authenticated with `X-PMSETU-Signature: sha256=<hex>`.
- Webhook signatures are HMAC-SHA256 over the exact raw request body. The secret is resolved from the environment using the source's `credential_ref`; secrets are never persisted in PostgreSQL.
- Both paths use the same payload privacy, depth and size validation as the existing batch ingestion API.

## Operational configuration
```env
INTEGRATION_SCHEDULER_ENABLED=false
INTEGRATION_SCHEDULER_POLL_SECONDS=30
PMSETU_DET_WEBHOOK_SECRET=<deployment-managed random secret>
```

Set a source's `sync_interval_seconds` only after its adapter and data contract have been reviewed. Keep the scheduler disabled until an approved adapter is registered and configured.

## Not complete / external blockers
- No live DET MIS, Student MIS, Training MIS, Finance MIS, Apprenticeship, Placement, DGT/MSDE or AP Government connector is claimed by this implementation.
- Production connectors require the system owner, approved endpoint allowlist, interface specification, authentication contract, data classification, rate limits, source status mapping, refresh cadence, reconciliation and correction procedure.
- ACD-01 through ACD-05 KPI formulas remain gated by the authoritative source-owner decisions documented in Phase 4.0–4.7. Accepted raw intake records are not verified KPI facts.
- Scheduler/adapter code requires CI and deployment verification before production enablement.
