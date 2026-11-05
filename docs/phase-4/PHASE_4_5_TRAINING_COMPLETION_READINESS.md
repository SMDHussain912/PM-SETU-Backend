# Phase 4.5 — Training Enrolment & Completion Readiness

**Status:** Production implementation gated on authoritative Training MIS and DET decisions  
**Branch:** `main`  
**KPI:** ACD-05 — Training completed

## Repository audit

- No training enrolment, progress, completion, assessment or certificate module exists in the inspected repository.
- No authoritative Training MIS adapter or verified completion evidence source is present.
- The existing ITI `studentStrength` field is not an enrolment or completion record.
- Admission, enrolment, attendance and completion are distinct events and must not be conflated.

## Required ACD-05 decisions

1. Identify the authoritative Student/Training MIS and its owner.
2. Define the enrolment grain and stable source enrolment identifier.
3. Define exactly what qualifies as completed training: prescribed duration, attendance, practical/theory assessment, examination, certificate, or an approved combination.
4. Define the authoritative completion date and reporting-period attribution.
5. Confirm accepted evidence, issuing authority and verification process.
6. Define treatment of repeat training, transfers, withdrawals, reopened results, corrections and revoked certificates.
7. Confirm privacy, evidence retention and role-based access.
8. Provide the approved API/file interface, source status mapping, refresh cadence and reconciliation process.

## Safe implementation boundary

- Do not mark a trainee complete from admission, enrolment, attendance alone or course availability.
- Do not invent attendance thresholds, pass marks, assessment rules or certificate requirements.
- Do not derive completion from `studentStrength` or profile fields.
- Preserve source event IDs, criteria/version references and correction history when an approved feed is available.
- Quarantine unvalidated or conflicting completion records from verified KPI aggregation.
- Keep student identities and completion evidence out of public dashboard responses.
- Apprenticeship and OJT remain separate industry outcomes (IND-01/IND-02), not ACD-05.

## Phase 4.5 disposition

No production schema, migration, API or KPI aggregation was added. The authoritative source, completion criteria and evidence rules are not present in the repository and cannot safely be guessed.

**Unblock with:** Training MIS owner/interface specification, approved completion definition, evidence/verification policy, reporting-period rules and correction/reconciliation process.

**Exit:** ACD-05 readiness audit complete; production implementation remains gated. Next safe step is a consolidated Phase 4 review and source-owner decision checklist before attempting KPI aggregation.
