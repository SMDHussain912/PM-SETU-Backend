# Finance import recovery evidence checklist

## Purpose

This milestone creates a deterministic checklist projection from an existing recovery plan. It helps an authorised reviewer identify which evidence to gather without claiming that evidence has been collected or verified.

## Checklist entries

- Execution summary: original counters and row outcomes (required).
- Source file SHA-256: digest of the exact uploaded file (required).
- Persisted batch snapshot: required for mismatches; explicitly marked not available when reconciliation reported missing metadata.
- Authoritative source-system comparison: required.
- Execution failure logs: conditional, where relevant.

## Safety boundaries

- The checklist does not fetch, store, or certify evidence.
- It does not persist raw CSV payloads or financial records.
- It does not authorise re-import, corrections, reversals, or accounting acceptance.
- A checklist item marked required is an investigation requirement, not proof that the evidence exists.
- Finance/DET must determine the authorised operational process, ownership, retention, and approval rules.
