# Integration Source Owner Contract

> Complete and approve this document with the system owner before implementing or enabling a provider-specific integration. Blank fields are unresolved requirements, not permission to infer defaults.

## 1. Ownership and approval

| Field | Required value |
|---|---|
| Source code (proposed) | |
| Provider / system name | |
| Business owner | |
| Technical owner | |
| Data steward / privacy contact | |
| Environment (sandbox / production) | |
| Contract version and date | |
| Approval reference / ticket | |
| Approved by and approval date | |

## 2. Purpose and scope

- Business process supported:
- Intended users and decisions supported:
- In-scope entities and records:
- Explicitly out-of-scope data:
- Expected sync direction (provider to PM-SETU / PM-SETU to provider):
- Required freshness / maximum acceptable lag:
- Expected volume per run and per day:

## 3. Connectivity and endpoint

- Transport: REST / SFTP / CSV upload / webhook
- Base URL or approved host:
- Environment-specific endpoint paths:
- HTTP method(s), if applicable:
- Network allowlisting / VPN / certificate requirements:
- TLS requirements:
- Sandbox availability and test window:
- Provider status / health endpoint, if available:

Do not place passwords, tokens, private keys, or live secrets in this document. Record only the approved secret-manager reference name and delivery owner.

## 4. Authentication and authorization

- Authentication mechanism and protocol:
- Required scopes / roles:
- Credential owner and rotation contact:
- Secret-manager reference name (not secret value):
- Credential expiry / rotation interval:
- Revocation procedure:
- Webhook signing algorithm and exact header/canonicalization contract, if applicable:
- IP allowlisting or mTLS requirements:
- Evidence of a successful sandbox authentication test:

## 5. Data contract and mapping

For every field consumed by PM-SETU, document:

| Provider field / JSON path | PM-SETU field | Type and format | Required? | Transformation | Allowed values / validation | Sensitive? |
|---|---|---|---|---|---|---|
| | | | | | | |

Also specify:

- Provider schema version and change-notification process:
- Stable provider record identifier and uniqueness scope:
- Identifier reuse policy:
- Null / missing / deleted-field semantics:
- Date/time timezone and format:
- Numeric precision, units and currency:
- Reference/master-data dependencies:
- Record deletion / deactivation semantics:
- Authoritative source for each mapped field:

Do not map direct personal identifiers or sensitive attributes into the generic integration payload without explicit privacy approval and a separately reviewed data-minimization design.

## 6. Pagination, checkpoints and ordering

- Pagination mechanism:
- Cursor / page token format and maximum size:
- First-page request semantics:
- Continuation request semantics:
- End-of-data signal:
- Cursor expiry and recovery procedure:
- Stable ordering guarantee:
- Late-arriving and backfilled record behaviour:
- Incremental watermark / since semantics:
- Full-resynchronization procedure:
- Whether cursors are inclusive or exclusive:

## 7. Idempotency, updates and replay

- Stable idempotency key:
- Provider version / revision field:
- Update ordering guarantee:
- Conflict resolution rule:
- Duplicate delivery expectations:
- Replay window and replay detection mechanism:
- Webhook timestamp / nonce requirements, if any:
- Out-of-order event behaviour:
- Correction and deletion events:
- Safe reprocessing procedure:

These rules must be explicitly agreed. Do not assume that a signature alone prevents replay or that a repeated identifier always means an update.

## 8. Rate limits, retries and operational limits

- Published request quota:
- Burst limit:
- Rate-limit response and headers:
- Retryable status codes / error classes:
- Retry-After semantics:
- Provider maintenance windows:
- Maximum response size:
- Maximum page size:
- Expected request timeout:
- Provider escalation path:

The generic scheduler currently retries adapter fetch failures four times with bounded exponential backoff. Provider-specific retry or throttling behaviour requires an approved deviation or explicit confirmation that this default is compatible.

## 9. Data protection and security

- Data classification:
- Purpose limitation:
- Minimum necessary fields:
- Personal / sensitive data present:
- Approved legal / policy basis and retention:
- Data residency constraints:
- Encryption in transit / at rest requirements:
- Logging and redaction rules:
- Access roles:
- Incident notification contact and SLA:
- Retention / deletion procedure:
- Security assessment reference:

Never include real personal data, production credentials, or secrets in example payloads, fixtures, tickets, or this contract.

## 10. Error model and support

- Provider error response schema:
- Stable provider error codes:
- Temporary vs permanent error classification:
- Partial-response semantics:
- Support contact and escalation SLA:
- Planned maintenance notification channel:
- Change / deprecation notice period:

## 11. Test evidence and acceptance

Attach or reference sanitized fixtures for:

- [ ] Successful first page
- [ ] Successful subsequent page
- [ ] Empty result
- [ ] Maximum page / batch boundary
- [ ] Duplicate delivery
- [ ] Updated record / changed version
- [ ] Late or out-of-order record
- [ ] Invalid or expired cursor
- [ ] Authentication failure
- [ ] Rate limit and retry response
- [ ] Provider timeout / server error
- [ ] Malformed response
- [ ] Deletion / deactivation event, if supported
- [ ] Webhook invalid signature / replay case, if applicable

Acceptance owners:

| Acceptance item | Responsible owner | Evidence / reference | Approved? |
|---|---|---|---|
| Endpoint and connectivity | | | |
| Authentication | | | |
| Field mapping and semantics | | | |
| Privacy and security | | | |
| Pagination and checkpoint behaviour | | | |
| Idempotency / replay behaviour | | | |
| Rate limits and retries | | | |
| Operational support | | | |

## 12. Go-live decision

- Approved source code:
- Approved transport:
- Approved environment:
- Open risks / exceptions:
- Rollback / disable procedure:
- Monitoring owner:
- Go-live approver:
- Approval date:

**Implementation gate:** provider-specific adapter code, credentials, schedules, and production enablement must remain disabled until the required sections are complete and the relevant business, technical, and privacy/security owners have approved them.
