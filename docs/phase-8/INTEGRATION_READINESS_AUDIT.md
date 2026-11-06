# Phase 8 — Integration readiness audit

**Status:** Engineering foundation exists; provider-specific integration is blocked on source-owner contracts.  
**Branch:** `main`  
**Audit date:** 2026-11-06

## Purpose

Record what the current integration module can actually do before connecting any government, MIS, finance, apprenticeship, placement, or other external system. This is a repository evidence audit, not approval to connect a provider or enable a production feed.

## 1. Existing implementation

The following capabilities are present in `src/modules/integrations/`:

| Area | Existing capability | Boundary |
|---|---|---|
| Source registry | Create/list integration sources, enable/disable, configure sync interval | Source registration does not establish that a provider contract or production credential is approved |
| Adapter registry | In-memory registry keyed by validated source code; adapter system must match source system | No provider adapter is registered in the repository by this audit |
| Scheduled sync | Due-source claiming, 15-minute lease, heartbeat renewal, token-guarded commit/release, retry of adapter page fetch | Scheduler is opt-in through `INTEGRATION_SCHEDULER_ENABLED=true`; no provider is connected merely by enabling it |
| Checkpoints | Uses the latest committed SUCCEEDED/PARTIAL run; failed runs do not advance the cursor | Provider-specific cursor semantics still need definition |
| Record ingestion | Transactional upsert keyed by (sourceId, sourceRecordId), source version and occurred-at fields | Generic payload persistence is not yet a domain-specific validated fact or KPI qualification |
| CSV | Parses bounded CSV input and validates records against the generic ingestion schema | No source-specific CSV mapping contract is established |
| Webhooks | HMAC-SHA256 signature validation using a configured deployment secret; raw-body verification | Requires provider signature agreement, secret provisioning/rotation and delivery/replay policy |
| Run history | Persists run status, counts, cursor and sanitised error summaries | Operational monitoring/alerting and retention policy still require confirmation |

Relevant implementation:
- `integration.adapters.ts`
- `integration.service.ts`
- `integration.scheduler.ts`
- `integration.repository.ts`
- `integration.controller.ts`
- `integration.csv.ts`
- `integration.schema.ts`

## 2. Important constraints and findings

1. **No provider-specific adapter is registered.** The adapter registry is an empty in-memory map until reviewed code registers an adapter. No provider endpoint, authentication format, pagination model, or field mapping should be guessed.
2. **The generic record model is not a KPI fact model.** A stable source record ID and JSON payload provide an ingestion envelope. They do not define whether a record qualifies as an admission, completed training, placement, employer engagement, physical milestone, or finance transaction.
3. **Upsert semantics overwrite the current payload for the same source identity.** Provider version ordering, stale-event rejection, immutable raw-event retention, correction history and replay semantics must be specified before connecting feeds where older events may arrive late.
4. **Checkpoint correctness depends on provider pagination semantics.** Each adapter contract must define stable continuation tokens, ordering, page limits, snapshot/watermark behaviour, and what happens when records change during pagination.
5. **Webhook security is only one part of delivery safety.** Provider-specific timestamp/replay protection, event IDs, retry acknowledgement behaviour, key rotation, IP restrictions (if required), and payload-size limits must be agreed and tested.
6. **CSV parsing is not a provider mapping.** Each approved file feed still needs an explicit schema/version, encoding, delimiter, header policy, identity mapping, validation report and duplicate/correction behaviour.
7. **Scheduler is opt-in.** Production activation requires deployment ownership, polling/lease settings, graceful shutdown behaviour, monitoring, and an operational runbook.
8. **Source registration and scheduling are not provider approval.** Do not enable a source or register a real credential until the source owner, data controller, permitted fields, security requirements, retention and operational support are documented.

## 3. Required provider contract before implementation

For each external source, record and approve:

- Named system owner, accountable PM-SETU/DET owner, technical contact and support escalation.
- Transport: API pull, webhook push, CSV/SFTP or other approved mechanism.
- Fixed provider base URL/allowlist, TLS requirements, authentication method, secret reference, rotation and revocation.
- API/file schema version, field mapping, required/optional fields, enum mapping, timezone and date semantics.
- Stable source identity, version ordering, duplicate handling, late arrivals, correction/deletion and replay semantics.
- Pagination/snapshot/watermark contract and checkpoint recovery procedure.
- Rate limits, timeouts, retry/backoff, idempotency and provider outage behaviour.
- Data classification, minimisation, permitted fields, privacy, retention and deletion requirements.
- Validation/rejection policy, quarantine/review workflow and reconciliation totals.
- Sync frequency, freshness objective, monitoring, alert recipient and operational owner.
- Test/sandbox credentials, representative fixtures and provider acceptance evidence.
- Whether ingested data may feed a particular KPI; KPI qualification remains governed by the Phase 7 approval register.

## 4. Safe next implementation sequence

1. Select one source only after its owner and contract are identified.
2. Add a versioned provider contract and mapping document; keep it explicitly draft until approved.
3. Implement an adapter using a fixed, reviewed endpoint and allowlisted transport. Never accept arbitrary fetch URLs from source-registry input.
4. Add provider fixtures and tests for authentication, pagination, duplicate delivery, out-of-order updates, retries, malformed records, checkpoint recovery, and redacted errors.
5. Run against provider sandbox/test data; verify counts and rejected records with the source owner.
6. Enable scheduling only after operational ownership, secrets, monitoring and runbook are approved.
7. Promote mapped records into domain-specific facts only under an approved domain contract. Do not expose generic payloads as official dashboard KPIs.

## 5. Explicit non-goals

- No provider endpoints, credentials, field mappings or source owners are invented here.
- No real external system is connected or enabled.
- No generic JSON payload is promoted into an official KPI.
- No new source is scheduled by default.
- No arbitrary URL fetch, direct external database access, or public exposure of raw integration payloads is authorised.
- No change to existing source, run, record or dashboard API contracts is made by this audit.

## 6. Exit condition

Phase 8 provider implementation can begin when at least one named source owner supplies an approved technical/data contract, permitted data scope, test access and operational acceptance criteria. Until then, retain the existing integration foundation without registering speculative adapters.
