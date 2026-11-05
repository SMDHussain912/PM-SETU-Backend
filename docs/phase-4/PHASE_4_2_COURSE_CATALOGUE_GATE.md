# Phase 4.2 — Course Catalogue and ITI Offering Gate

**Status:** Blocked pending authoritative course-source and offering-definition confirmation  
**Branch:** `main`

## Repository findings

- The ITI profile stores `existingTrades` and `proposedTrades` as string arrays.
- The ITI API exposes these fields as `existing_trades` and `proposed_trades`.
- The fields are profile descriptions; they have no canonical course IDs, source-system identifiers, taxonomy version, approval reference, effective period, delivery instance or verified offering status.
- No dedicated course master, future-skills taxonomy, ITI-offering or course-delivery model/module/migration exists in the inspected repository.

## Why production CRUD is not safe yet

The source design explicitly requires DET to decide whether ACD-01 counts approved courses, active offerings or courses actually running. ACD-02 also requires a DET-approved future-skills taxonomy. Implementing a catalogue now would require inventing at least the authoritative course codes/source, classification rules and lifecycle semantics. That could create counts that disagree with the official MIS.

## Phase 4.2 disposition

No production schema, migration, API or KPI aggregation was added. Existing ITI profile fields remain unchanged and must not be treated as a verified catalogue or offering register.

## Minimum input to unblock

1. Authoritative course/trade master or approved source extract with stable course identifiers.
2. DET decision on the ACD-01 counting meaning: approved, active or actually running (or separate approved measures).
3. DET-approved future-skills taxonomy and version/effective-date policy for ACD-02.
4. Source owner and approved interface/file specification, including update and correction process.

**Exit:** Repository audit complete; implementation is gated. Resume with a versioned course master and ITI-offering model only after these inputs are confirmed.
