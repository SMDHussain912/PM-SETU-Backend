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


## 21. Database-clock scheduler configuration

Administrative enable/disable and schedule-update operations now set `next_sync_at` using PostgreSQL `NOW()`, matching the database clock already used by due-source claims, lease renewal and write fencing. This avoids application-server clock drift making a newly enabled or scheduled source appear prematurely due or unexpectedly delayed.

Disabling a source still clears its lease; re-enabling makes it immediately eligible. Removing a schedule still clears its lease; restoring a schedule makes it immediately eligible. Changing a non-null interval preserves an active lease so an already-running execution can finish under its current ownership.

The opt-in PostgreSQL disable and unschedule tests now compare the resulting due timestamp with database time. They require the dedicated `PM_SETU_TEST_DATABASE_URL` and must be confirmed as executed rather than skipped.


## 22. Database-clock initial source scheduling

Creating an enabled integration source with a non-null sync interval now initializes `next_sync_at` with PostgreSQL `NOW()` inside the source-creation transaction. Disabled sources and sources without a configured interval retain a null due timestamp. This completes clock consistency across source creation, enable/disable, schedule updates, due claims, lease renewal and write fencing.

Added opt-in PostgreSQL coverage in `tests/integration-scheduler-create-postgres.test.ts`. It verifies database-clock alignment for a newly scheduled source and confirms disabled/unscheduled sources are not made due. The test requires the dedicated `PM_SETU_TEST_DATABASE_URL` and must be confirmed as executed rather than skipped.

## 23. Manual ingestion fenced against source disable

Manual JSON, CSV and webhook ingestion now rechecks source enablement inside the same PostgreSQL transaction that writes integration records. The transaction locks the source row with `FOR UPDATE`; disable operations serialize against that lock. If disable commits first, ingestion is rejected and writes no records. If ingestion acquires the lock first, it completes before disable can commit. Scheduled ingestion retains its stronger claim-token/expiry fence.

The service maps the repository's disabled-source rejection to HTTP 409 `INTEGRATION_DISABLED`, including the race where the source becomes disabled after the initial service-level read.

Added opt-in PostgreSQL coverage in `tests/integration-manual-ingest-disable-postgres.test.ts`. It verifies enabled manual ingestion, rejection after disable with no extra record, and successful ingestion after re-enable. The test requires the dedicated `PM_SETU_TEST_DATABASE_URL` and must be confirmed as executed rather than skipped.


## 24. Duplicate source identities rejected within ingestion batches

The shared ingestion schema now rejects repeated `source_record_id` values within one batch after trimming/normalization. This applies uniformly to manual JSON ingestion, CSV uploads, signed webhooks and scheduled adapter pages because each path passes through the same ingestion schema before persistence.

Previously, two entries for the same source identity in one batch could be processed sequentially by the upsert loop. That produced ambiguous last-write-wins behaviour and misleading created/updated counts for a single logical record. The batch is now rejected with a field-level validation issue before any write occurs.

Regression coverage is in `tests/integration-ingest-schema.test.ts`, including distinct IDs, repeated IDs and whitespace-normalized duplicates. This is batch-local identity validation; provider version ordering and cross-delivery replay/correction semantics still require an approved provider contract.


## 25. Strict CSV quoting validation

The CSV parser now rejects malformed quote placement instead of silently accepting ambiguous input:

- A quote may begin a field only at the start of that field.
- A closing quote must be followed by a delimiter, record ending or end of input.
- Unterminated quoted fields remain rejected.
- Properly quoted fields may contain commas and line breaks; doubled quotes continue to represent a literal quote.
- The existing 1 MB request/parser limit and 500-record batch limit remain unchanged.

Regression coverage in `tests/integration-csv.test.ts` includes quoted JSON with commas, a multiline quoted field, unterminated quotes, quotes embedded in unquoted fields, trailing characters after a closing quote, and input above 1 MB. This is syntax hardening for the generic CSV transport; it does not define a provider-specific CSV mapping.


## 26. Webhook-only raw-body retention

The application JSON parser now retains a raw-body copy only for the mounted `/api/v1/integrations/webhooks/:id` endpoint, where HMAC verification requires the exact request bytes. Other JSON API requests no longer allocate and retain an additional raw-body buffer on the request object. The parser's existing 1 MB limit and webhook signature verification remain unchanged.

The path matcher is isolated in `integration.webhook.raw-body.ts` and covered by `tests/integration-webhook-raw-body.test.ts` for valid webhook paths, query strings, trailing slashes and non-webhook paths. This is a memory-allocation reduction; it does not alter webhook authentication, replay semantics or provider contracts.


## 27. Isolated webhook raw-body capture policy

The JSON-parser verification callback now delegates to `captureIntegrationWebhookRawBody()` in `integration.webhook.raw-body.ts`. The helper accepts the Node request URL as optional and safely does nothing when it is absent or does not match the exact webhook route. For matching requests it copies the parser buffer, so later mutation of the parser's input buffer cannot alter the bytes used for HMAC verification.

Regression coverage in `tests/integration-webhook-raw-body.test.ts` now exercises the capture operation itself: exact byte preservation, independent buffer ownership, ordinary-route exclusion, and missing-URL handling. This remains a transport-level safeguard only; it does not add replay protection or define provider-specific signature headers.


## 28. Isolated webhook HMAC verification

The HMAC-SHA256 comparison is now isolated in `integration.webhook.signature.ts`. The helper validates the existing `sha256=<64 hex characters>` signature shape, computes the digest over the exact raw request bytes, checks digest length, and uses Node's `timingSafeEqual` for comparison. Secret lookup, minimum secret length, transport selection, and HTTP error mapping remain in the service layer; the wire contract is unchanged.

Regression coverage in `tests/integration-webhook-signature.test.ts` verifies valid signatures, body tampering, wrong secrets, malformed encodings, and the existing case-insensitive hexadecimal behaviour. This is unit-level cryptographic verification coverage, not provider replay protection or a provider acceptance test.

## 29. Non-advancing continuation cursor rejection

Scheduled adapter execution now rejects a page that declares `hasMore: true` while returning the exact cursor used to request that page. The service raises HTTP 502 `ADAPTER_CURSOR_NOT_ADVANCING` before either the empty-page checkpoint path or record-ingestion path can persist anything. This prevents a misbehaving adapter from repeatedly committing the same continuation position and causing an endless scheduled replay loop.

Regression coverage in `tests/integration-scheduled-source-service.test.ts` verifies that the repeated cursor produces the expected error and that neither a run/checkpoint write nor record ingestion occurs. Cursor contents remain opaque; the generic layer only enforces forward progress when the adapter explicitly claims another page exists. Provider-specific ordering, snapshot and cursor semantics remain part of the approved source contract.

## 30. Enforce transport-specific scheduler eligibility

Scheduled polling is now restricted to pull transports:

- Source creation validation rejects a non-null sync interval for `CSV_UPLOAD` and `WEBHOOK`.
- Schedule updates return HTTP 409 `INTEGRATION_TRANSPORT_NOT_SCHEDULABLE` for those push-based transports.
- The PostgreSQL due-source claim query selects only `REST` and `SFTP`, so legacy or manually altered push-source schedules are not claimed.
- REST and SFTP scheduling remain supported; CSV and webhook sources remain valid when unscheduled and continue to use their existing delivery paths.

Regression coverage in `tests/integration-transport-schedule.test.ts` verifies accepted pull transports, rejected push-transport schedules, and valid unscheduled push sources. The database claim predicate is a defense-in-depth guard for existing rows. Provider-specific SFTP connection, authentication and file semantics remain blocked on an approved source-owner contract.

## 31. Service-level pull-transport enforcement

Transport eligibility is now enforced at three independent boundaries: source validation, schedule-update service validation, and the PostgreSQL scheduler claim predicate. The scheduled execution service also checks the source transport before adapter lookup, checkpoint reads, retries or writes. This protects direct service invocations and test/maintenance call paths even if they bypass the scheduler query.

The pull-transport predicate is centralized in `integration.types.ts` as `isIntegrationPullTransport()` / `INTEGRATION_PULL_TRANSPORTS`. Regression coverage in `tests/integration-scheduled-source-service.test.ts` verifies a WEBHOOK source is rejected before adapter execution, checkpoint lookup or run persistence. CSV_UPLOAD remains covered by the shared transport rule. This is generic transport enforcement, not provider certification.


## 32. Manual run-history writes fenced against source disable

Manual integration run-history persistence now locks and verifies the source row inside the same PostgreSQL transaction that inserts the run. This closes the race where the service could read an enabled source, the source could then be disabled, and a subsequent run-history insert could still succeed.

The service maps the transaction-level disabled-source rejection to HTTP 409 `INTEGRATION_DISABLED`. Regression coverage in `tests/integration-manual-run-disable.test.ts` verifies both the disable-race mapping and normalized run counters on a successful write. The repository lock uses the same row-lock serialization boundary as manual ingestion; live PostgreSQL race verification remains opt-in and must be run against the dedicated test database.


## 2.1 Service-level schedule guard regression coverage

Added an injectable repository seam to `setSchedule()` (production still defaults to the existing repository module) and `tests/integration-schedule-service.test.ts`. The tests verify that CSV_UPLOAD and WEBHOOK schedules are rejected before persistence, REST intervals and SFTP unscheduling are allowed, and missing sources return 404 without an update attempt. This complements schema validation with direct service-layer protection, so callers cannot bypass the transport rule by avoiding the HTTP route.

Commits: `22f8755` (service seam), `62274dd` (regression tests). Local typecheck, full test suite and build verification are pending.


**Verification update (2026-11-06):** The project owner reports that the latest typecheck, complete test suite and production build all passed after this milestone. The five service-level schedule guard tests are included in that verified run. The opt-in PostgreSQL tests remain a separate verification requirement unless the test output confirms they ran with the dedicated database configured.


## Scheduler checkpoint isolation — execution origin

Scheduled checkpoint lookup now considers only `SCHEDULED` and compatibility `LEGACY` runs. Manual JSON/CSV/webhook ingestion and manual run-history writes are tagged `MANUAL` and remain visible in public run history, but cannot replace a scheduled adapter cursor or `since` timestamp. The migration marks pre-existing rows `LEGACY` because their origin cannot be reconstructed from stored columns; those rows remain eligible as the initial compatibility checkpoint until a scheduled run supersedes them. New rows default to `MANUAL`; scheduler-owned writes explicitly set `SCHEDULED`.


## 33. Missing-adapter failure uses the injected repository boundary

The scheduled-source service now persists the `ADAPTER_NOT_CONFIGURED` / `ADAPTER_SYSTEM_MISMATCH` failure through the same injected repository boundary used by the other scheduled execution paths. Previously, this early-return branch called the module-level repository directly, bypassing an injected repository supplied by service tests or controlled callers. The runtime default remains the production repository module; the change makes dependency injection consistent and keeps the failure path testable.

Regression coverage in `tests/integration-scheduled-source-service.test.ts` verifies that a missing adapter writes one sanitized FAILED run through the injected repository without reading a checkpoint or attempting ingestion. This does not register or approve a provider adapter.


## 34. Aggregate integration batch payload bound

The generic ingestion schema now enforces a 1 MB maximum on the complete serialized record batch, in addition to the existing per-record payload, record-count, nesting-depth and field restrictions. This closes the amplification gap where 500 individually valid 16 KB payloads could otherwise produce a multi-megabyte scheduled adapter batch and a correspondingly large database transaction. Non-serializable object graphs are rejected as validation failures rather than escaping the schema boundary as an exception.

Regression coverage in `tests/integration-ingest-schema.test.ts` verifies aggregate-size rejection and safe handling of circular object input. The HTTP JSON parser limit remains unchanged; this additional bound also protects adapter-originated data before persistence. This is a generic resource bound, not a provider field mapping or source approval.


## 35. Bound payload validation work before serialization

Payload validation now applies depth, node-count and cumulative key/value byte budgets while traversing untrusted JSON. The validator rejects excessive structures before calling `JSON.stringify`, preventing a very wide or oversized single value from forcing unbounded traversal before the existing 16 KB per-payload and 1 MB per-batch checks. Non-JSON values and circular structures remain rejected as validation failures.

Regression coverage in `tests/integration-ingest-schema.test.ts` includes excessive node counts and a single oversized string. This is a generic resource-exhaustion safeguard; provider-specific schemas and field contracts remain separate approval requirements.
