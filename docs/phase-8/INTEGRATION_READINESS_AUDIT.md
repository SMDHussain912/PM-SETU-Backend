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
| Adapter registry | In-memory registry keyed by validated source code; registration validates supported system and fetchPage, rejects duplicates, and snapshots the registered method/system | No provider adapter is registered in the repository by this audit |
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

## 6. Adapter registration hardening completed

The adapter registry now rejects malformed source codes, duplicate registrations, unsupported systems and adapters without a callable `fetchPage`. It stores a frozen registration snapshot and binds the registered method to its original adapter instance so replacing the caller's method or system property after registration cannot silently swap the registered implementation. Focused regression coverage is in `tests/integration-adapters.test.ts`.

This is a registry integrity safeguard, not provider certification. It does not validate upstream endpoint safety, provider authentication, schema semantics or source-owner approval; those remain provider-contract gates.

## 7. Exit condition

Phase 8 provider implementation can begin when at least one named source owner supplies an approved technical/data contract, permitted data scope, test access and operational acceptance criteria. Until then, retain the existing integration foundation without registering speculative adapters.

## 8. Adapter page-envelope validation completed

Scheduled adapter output is validated as an untrusted runtime envelope before any checkpoint or record write:

- `records` must be an array containing no more than 500 entries.
- `hasMore` must be a boolean.
- `nextCursor`, when supplied, must fit the existing 2,000-character persisted cursor limit.
- A page declaring `hasMore: true` must include a non-empty, non-whitespace continuation cursor.
- Unexpected top-level properties are rejected.
- The cursor remains opaque: no provider-specific syntax, ordering, or version semantics are imposed.
- Individual records still pass through the existing generic ingestion schema before persistence.

Regression coverage is in `tests/integration-adapter-page.test.ts`. Invalid page envelopes fail before empty-page checkpoint commits or non-empty record ingestion. This hardens the generic adapter boundary; it does not replace provider pagination/snapshot contracts.

 
## 9. Scheduler claim batching and lease utilisation

Due sources are now claimed in batches of at most 10, ordered by next scheduled time and source ID. The claim query uses PostgreSQL row locks with `SKIP LOCKED`, allowing separate application instances to claim different rows without waiting on each other's selected rows. Each bounded batch is processed concurrently, so one slow provider does not leave other already-claimed sources waiting in a sequential queue while their leases age.

This is a throughput/lease-utilisation safeguard, not a provider retry or ordering contract. Sources beyond the batch limit remain due for a subsequent scheduler tick. The existing per-source claim token, lease expiry, heartbeat, and transaction fencing remain in force.


Scheduler shutdown is coordinated with application shutdown: polling is stopped first, then the scheduler exposes an awaitable stop operation that waits for the active tick and all claimed-source processing (including claim release) before the server disconnects Prisma. The server's existing shutdown deadline remains the upper bound; if in-flight work does not finish within that deadline, the process is forced to exit.

## 10. Graceful scheduler shutdown verification

Scheduler tick coordination is isolated in `integration.scheduler.lifecycle.ts` so shutdown behaviour can be tested without a live timer, provider adapter, or database:

- Repeated triggers while a tick is active are coalesced; they do not start overlapping ticks.
- `stop()` first blocks future triggers, then waits for the already accepted tick to settle.
- Because a tick settles only after its claimed-source promises settle, shutdown waits for each source's lease-release `finally` block.
- The lifecycle can be started again after a completed stop, which keeps the controller deterministic for process/test lifecycle reuse.

Regression coverage is in `tests/integration-scheduler-lifecycle.test.ts`. The server awaits this stop operation before disconnecting Prisma. The process-level shutdown deadline remains the upper bound for a provider or database operation that does not settle.

## 11. PostgreSQL verification of bounded multi-worker claims

Added the opt-in test `tests/integration-scheduler-batch-postgres.test.ts`. It creates 23 uniquely named due sources in the dedicated test database, invokes `claimDueSources()` concurrently through two independent Prisma/PostgreSQL clients, and verifies:

- Each worker receives no more than the fixed batch limit of 10.
- Both workers receive 10 distinct sources, with no duplicate IDs across their claims.
- A subsequent claim receives the remaining three due sources.
- All 23 fixture sources are claimed exactly once.
- Cleanup deletes only fixture IDs created by this test.

The repository claim function accepts an optional Prisma client, defaulting to the application singleton. This keeps production behaviour unchanged while allowing the test to exercise independent database connections. The test is opt-in through `PM_SETU_TEST_DATABASE_URL` and refuses database names without the `_test` or `-test` suffix.

This verifies concurrent disjoint batch claims and batch draining against PostgreSQL; it does not replace provider-specific scheduler acceptance or production load testing.

## 12. PostgreSQL lease renewal and release fencing

Added opt-in test `tests/integration-scheduler-lease-renewal-postgres.test.ts` using two independent Prisma clients and a uniquely keyed source fixture. It verifies that the current owner can renew an unexpired lease, a wrong token cannot renew it, an expired lease cannot be renewed, a second worker can reclaim an expired lease, and the stale owner cannot release the new owner's claim. The current owner can release its own lease, clearing both token and expiry.

Repository `renewSourceClaim()` and `releaseSourceClaim()` accept an optional Prisma client for isolated database testing; their default remains the shared application client. Cleanup is restricted to the fixture source ID. The test requires `PM_SETU_TEST_DATABASE_URL` and the dedicated test database guard.

This exercises lease ownership and expiry predicates against PostgreSQL. It does not simulate a real 60-second scheduler heartbeat interval or establish production latency/load limits.



## 12. Deterministic adapter retry execution

Scheduled adapter fetches now use the shared `executeWithRetry()` helper in `integration.retry.ts`. Production behaviour remains four attempts with exponential delays of 1, 2 and 4 seconds (maximum configured delay 8 seconds). The helper accepts an injected wait function so unit tests can exercise recovery, exhaustion and backoff without sleeping.

- Transient failures can recover before the attempt limit.
- Exhaustion returns an explicit exhausted result without retaining or exposing upstream exception text.
- The service reuses the same committed cursor and `since` timestamp for every attempt; a failed fetch records a FAILED run with the last committed cursor.
- Retry tests are in `tests/integration-retry.test.ts`.
- This generic retry policy does not replace provider-specific rate-limit, retry-after, idempotency or outage requirements in an approved provider contract.



## 13. Scheduled-source retry and checkpoint service tests

Added service-level tests in `tests/integration-scheduled-source-service.test.ts` using an injected repository boundary. They verify that four failed adapter attempts produce exactly one sanitized FAILED run, preserve the prior committed cursor, reuse the prior completed-at timestamp as the same `since` value on every attempt, and never call ingestion. A recovery case verifies that a transient failure followed by a valid page ingests through the transactional repository path with the original checkpoint context and current claim token.

The repository dependency is optional and defaults to the production repository module; the test seam does not change runtime behaviour. These tests validate service orchestration and repository calls, not PostgreSQL transaction or lease fencing (covered separately by opt-in PostgreSQL tests).



## 14. Serialized scheduler heartbeat and release ordering

Extracted lease heartbeat coordination into `integration.scheduler.heartbeat.ts`. A source execution now coalesces overlapping renewal attempts, marks ownership uncertain when renewal returns false or throws, and marks confirmed lease loss only when renewal returns false. It waits for an in-flight renewal to settle before releasing its claim token. Stopping the heartbeat prevents any subsequent renewal attempt. The scheduler still uses the existing 60-second heartbeat interval and repository token/expiry predicates.

Focused tests in `tests/integration-scheduler-heartbeat.test.ts` cover renewal coalescing, stop waiting for an active renewal, lost-lease handling, renewal errors, and no renewal after stop. These are deterministic lifecycle tests; real PostgreSQL ownership/fencing remains covered by the separate opt-in lease test.



## 15. Scheduler failure writes and lease ownership certainty

The heartbeat now distinguishes a confirmed lease rejection from an inconclusive renewal error:

- A renewal returning `false` marks the lease as lost and ownership as uncertain.
- A renewal throwing an error marks ownership as uncertain, but does not claim that another worker definitely owns the lease.
- Both outcomes suppress later heartbeat attempts for that claim and are exposed separately for diagnostics.

When scheduled source execution throws, the scheduler now checks ownership certainty before attempting a scheduler-level FAILED run. If ownership is uncertain, it skips both checkpoint lookup and failure-run persistence; this avoids stale workers attempting writes after a rejected or unverified renewal. When ownership remains verified, it preserves the last committed cursor and writes the same sanitized failure summary as before. Repository transaction fencing remains the final authority for all writes.

Regression coverage:
- `tests/integration-scheduler-heartbeat.test.ts` distinguishes lease loss from renewal uncertainty.
- `tests/integration-scheduler-failure.test.ts` verifies that uncertain owners perform no checkpoint read or failure write, while a verified owner persists one sanitized FAILED run with the committed cursor.

A renewal error is treated conservatively as unverified ownership, not proof of lease transfer. Provider-specific failure and retry policies remain subject to the approved source contract.


## 16. PostgreSQL verification of scheduler output fencing

Added opt-in test `tests/integration-scheduler-write-fencing-postgres.test.ts`, using two independent Prisma/PostgreSQL clients and a uniquely keyed source fixture.

The test claims a source with worker A, expires that fixture lease, and lets worker B reclaim it with a different token. It then verifies:

- Worker A cannot create a scheduler sync-run record using its stale token.
- Worker A cannot ingest a record or advance the checkpoint using its stale token.
- Neither rejected stale operation leaves a run or integration record behind.
- Worker B can persist a scheduler run and ingest a record with the current token.
- Cleanup deletes only the unique fixture source; related run and record rows cascade from that source.

The repository's `createScheduledRun()` and `ingestBatch()` now accept an optional Prisma client for isolated multi-client testing. Production defaults remain the shared Prisma client, and the existing row-lock/token/expiry/enabled predicate remains inside each transaction.

The test requires `PM_SETU_TEST_DATABASE_URL` and the dedicated test database guard. It must be confirmed as executed (not skipped) in the user's local test output.


## 17. PostgreSQL verification of scheduler row-lock contention

Added opt-in test `tests/integration-scheduler-row-lock-postgres.test.ts` using two independent PostgreSQL clients and a uniquely keyed source fixture.

The test first claims a source and expires its lease, then holds a PostgreSQL row lock on that already-expired source in one transaction. A competing scheduler claim must skip the locked row rather than reclaim it. After the lock transaction commits, the competing scheduler can claim the source with a new token.

This exercises the actual `FOR UPDATE SKIP LOCKED` contention boundary used by the scheduler. It complements the output-fencing test, which verifies stale writes after a lease has already been reclaimed. The test is opt-in through `PM_SETU_TEST_DATABASE_URL`, validates the dedicated test database name, and cleans up only its fixture source. Confirm that it ran rather than skipped in local test output.


## 18. PostgreSQL-clock lease renewal

Lease renewal now uses PostgreSQL `NOW()` for both the still-valid lease predicate and the 15-minute expiry extension. This keeps claim selection, renewal, and transaction write-fencing on the same database clock; application-server clock drift no longer changes the renewal predicate or computed expiry.

The existing opt-in PostgreSQL lease-renewal test now also reads the remaining lease duration from a second client and verifies that the renewed expiry is approximately 15 minutes from database time. The test continues to cover wrong-token rejection, expired-lease rejection, reclaim, stale-release fencing and current-owner release.

Verification requires the dedicated `PM_SETU_TEST_DATABASE_URL`; confirm the test ran rather than skipped.


## 19. Immediate scheduler lease revocation when disabling a source

Disabling an integration source now clears its claim token and lease expiry while setting `next_sync_at` to null. A worker already executing with the previous token can no longer pass the transaction-scoped enabled/token/expiry fence and therefore cannot commit scheduler output after the source is disabled.

Re-enabling the source schedules it immediately; because disable cleared the old lease, it does not have to wait for the previous 15-minute lease expiry. Added opt-in PostgreSQL coverage in `tests/integration-scheduler-disable-postgres.test.ts` using two independent clients. It verifies lease clearing, stale commit rejection, no run row written, and immediate claimability after re-enable.

The test requires the dedicated `PM_SETU_TEST_DATABASE_URL`; confirm it ran rather than skipped.


## 20. Immediate lease revocation when removing a schedule

Setting an integration source's sync interval to `null` now clears its scheduler claim token and lease expiry, in addition to clearing `next_sync_at`. A worker already running under the removed schedule can no longer pass the transaction-scoped claim fence and commit scheduler output. The source's `enabled` flag is intentionally unchanged, so separately authorised manual ingestion remains available.

Restoring a non-null interval schedules the source immediately. Added opt-in PostgreSQL coverage in `tests/integration-scheduler-unschedule-postgres.test.ts` using two independent clients. It verifies lease clearing, continued enabled state, stale commit rejection, no sync-run row, and immediate reclaim after schedule restoration.

The test requires the dedicated `PM_SETU_TEST_DATABASE_URL`; confirm it ran rather than skipped.
