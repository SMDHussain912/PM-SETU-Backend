# Phase 4.4 — Admissions and Student Cohort Readiness

**Status:** Production implementation gated on authoritative Student MIS and DET decisions  
**Branch:** `main`  
**KPI:** ACD-04 — Admissions

## Repository audit

- No student, admission, academic-year, cohort or enrolment module/file exists in the repository tree.
- The existing `Iti.studentStrength` field is a profile/strength value, not an admission event or unique-student register.
- No verified student source interface or privacy-safe student identifier is present in the inspected repository.

## Required ACD-04 decisions

1. Identify the authoritative Student MIS and its owner.
2. Confirm whether ACD-04 counts admission events or unique students admitted.
3. Define the admission state that qualifies as an admission.
4. Define academic-year boundaries and cohort/intake identifiers.
5. Decide how cancellations, withdrawals, transfers, re-admissions, course changes and duplicate records affect counts.
6. Confirm which date controls academic-year attribution.
7. Approve a privacy-preserving student identifier, matching rules and retention/access controls.
8. Specify the approved API/file interface, update cadence and reconciliation/correction process.

## Safe implementation boundary

- Do not create student identities from names, phone numbers or other weak identifiers.
- Do not infer academic years or cohorts from the current date.
- Do not treat student strength, capacity, applications or enrolment as admissions.
- Preserve source event identifiers and correction history once an approved feed exists.
- Keep student-level data and evidence out of public dashboard responses.

## Phase 4.4 disposition

No production schema, migration, API or KPI aggregation was added. The repository does not contain the authoritative source or decisions needed to implement admissions correctly.

**Unblock with:** Student MIS owner/interface specification, privacy-safe identifier contract, admission counting definition and academic-year/cohort rules.

**Exit:** Readiness audit complete; ACD-04 implementation remains gated. Proceed to ACD-05 readiness while preserving the separation between admission and training completion.
