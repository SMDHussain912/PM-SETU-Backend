# Finance import operational recovery planning

## Purpose

This milestone turns reconciliation outcomes into a deterministic investigation plan. It is a planning helper only; it does not create or persist operational case records.

## Outcomes

- NO_RECOVERY_REQUIRED: the persisted technical metadata matches the execution summary.
- REQUIRES_REVIEW: metadata is missing or mismatched and must be investigated.
- Mismatched row numbers are extracted, de-duplicated, and sorted for focused review.
- Missing metadata and mismatched metadata receive different investigation steps.

## Safety boundaries

- Automatic retry is always disabled. Independently committed row handlers may already have changed financial records.
- The helper does not write finance data, persist raw CSV/source payloads, or mutate reconciliation evidence.
- It does not assign owners, define roles, establish maker-checker approval, or authorise corrections/reversals.
- Investigation steps are technical guidance, not accounting acceptance or Finance approval.
- Persisted case lifecycle, retention, ownership, permissions, audit semantics, and correction policy remain subject to Finance/DET approval.

## Operational next step

An authorised operational process must compare the evidence with the authoritative source system and obtain the required Finance/DET decision before any correction or re-import.
