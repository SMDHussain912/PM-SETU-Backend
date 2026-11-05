# Finance import recovery report

## Purpose

The recovery report composes an existing reconciliation-derived recovery plan and its evidence checklist into one deterministic, serialisable report.

## Report contents

- Recovery status and batch identifier, where available.
- Case type and a concise status summary.
- Discrepancy codes and affected row numbers.
- Investigation steps.
- Evidence checklist, preserving REQUIRED, NOT_AVAILABLE, and CONDITIONAL states.
- Explicit safeguards stating that automatic retry is disabled, no financial records were modified, and no accounting approval was granted.

## Safety boundaries

- The report is informational; it is not an accounting decision, approval, or proof that evidence has been collected.
- It does not persist reports or source payloads and does not perform financial writes.
- It does not authorise retry, correction, reversal, or re-import.
- Operational ownership, retention, permissions, audit semantics, and approval workflow remain subject to Finance/DET approval.
