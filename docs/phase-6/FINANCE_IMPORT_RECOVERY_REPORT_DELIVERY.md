# Finance import recovery report delivery descriptor

## Purpose

Creates a transport-neutral download descriptor for a validated recovery report. It provides a stable JSON filename, content type, attachment disposition, serialized body, and `no-store` cache policy.

## Security boundary

- This helper is intended for an already-authorised internal caller.
- It does not authenticate users, define permissions, register an HTTP route, or expose a public endpoint.
- Route integration must apply the approved Finance/DET access matrix before invoking the helper.
- `no-store` is supplied to discourage caching of operational investigation reports.
- The descriptor contains technical recovery evidence only; it is not an accounting approval or finance ledger export.
