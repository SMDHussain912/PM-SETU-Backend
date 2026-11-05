# Phase 7 — KPI decision record and acceptance criteria templates

**Status:** Reusable draft templates; not an approved KPI contract  
**Branch:** `main`  
**Purpose:** Capture formal domain decisions consistently and define the evidence required before a KPI can be implemented, exposed, or accepted.

> Copy one decision record per KPI. Do not fill unknown values by assumption. Use `TBD — decision required` and keep the KPI blocked until the accountable authority records a decision.

## 1. KPI decision record template

Copy this section for each KPI.

### Decision identity

| Field | Decision |
|---|---|
| KPI ID and official label | TBD — decision required |
| Contract version | TBD — assign after approval |
| Decision status | DRAFT / UNDER_REVIEW / APPROVED / REJECTED / SUPERSEDED |
| Decision date and effective date | TBD |
| Approving authority and named approver | TBD |
| Accountable source owner | TBD |
| Decision evidence/reference | TBD |

### Definition and qualification

| Field | Decision |
|---|---|
| Purpose / intended interpretation | TBD |
| Exact definition | TBD |
| Unit and value type | TBD |
| Counting grain / one counted fact represents | TBD |
| Qualifying event or state | TBD |
| Numerator | TBD / NOT_APPLICABLE |
| Denominator | TBD / NOT_APPLICABLE |
| Inclusion rules | TBD |
| Exclusion rules | TBD |
| Deduplication identity and window | TBD |
| Zero, null and unavailable semantics | TBD |

### Source and provenance

| Field | Decision |
|---|---|
| Authoritative system and dataset/table | TBD |
| Source owner and support contact | TBD |
| Stable source record identifier | TBD |
| Source version / correction sequence | TBD |
| Ingestion method and cadence | TBD |
| Required source fields | TBD |
| Evidence required and evidence reference policy | TBD |
| Source completeness/reconciliation control | TBD |

### Scope and time

| Field | Decision |
|---|---|
| Organisation hierarchy mapping | State → Cluster → ITI → Project, or approved alternative |
| Attribution rules for cross-organisation records | TBD |
| Reporting period and calendar | TBD |
| Event date vs effective date semantics | TBD |
| As-of timestamp definition | TBD |
| Late-arriving data policy | TBD |
| Source freshness target and breach handling | TBD |

### Governance and publication

| Field | Decision |
|---|---|
| Reviewer and verification authority | TBD |
| Meaning of ACCEPTED / VERIFIED for this KPI | TBD |
| Correction, rejection and restatement policy | TBD |
| Audit requirements | TBD |
| Public aggregate fields | TBD |
| Restricted fields and authorised roles | TBD |
| Privacy and retention requirements | TBD |
| Approved dashboard aggregation levels | TBD |
| Known limitations and caveats | TBD |

### Sign-off

| Role | Name | Decision | Date | Evidence/reference |
|---|---|---|---|---|
| KPI/business owner | TBD | PENDING | TBD | TBD |
| Authoritative source owner | TBD | PENDING | TBD | TBD |
| DET / programme authority | TBD | PENDING | TBD | TBD |
| Security/privacy owner, if applicable | TBD | PENDING | TBD | TBD |
| Finance authority, for FIN KPIs | TBD / N/A | PENDING | TBD | TBD |

**Approval rule:** A KPI is not approved until the required authorities are identified, decisions are explicit, the contract version/effective date are recorded, and supporting evidence is attached or referenced. Silence, meeting attendance, implementation, and test success do not constitute approval.

## 2. Engineering acceptance criteria template

Complete these criteria against the approved decision record. Mark each as PASS, FAIL, BLOCKED or NOT_APPLICABLE and attach test/evidence references.

| ID | Acceptance criterion | Required evidence |
|---|---|---|
| AC-01 | API and persisted contract use the approved KPI ID, label, unit and version | Contract test and schema/API review |
| AC-02 | Every reported fact traces to an authoritative source identity | Provenance test and sample trace |
| AC-03 | Qualification follows approved inclusion/exclusion rules | Positive and negative fixtures |
| AC-04 | Duplicate and replay behaviour follows the approved identity policy | Duplicate/replay tests |
| AC-05 | Corrections, reversals and restatements follow approved policy without silent destructive overwrite | Correction lifecycle tests and audit evidence |
| AC-06 | State/cluster/ITI/project attribution follows approved hierarchy rules | Scope and reconciliation tests |
| AC-07 | Reporting period, event date and as-of semantics match the approved contract | Boundary and late-arrival tests |
| AC-08 | Missing/unavailable values remain distinct from genuine zero | Null/zero/empty-source tests |
| AC-09 | Sample/test records are excluded according to approved rules | Sample isolation tests |
| AC-10 | Totals reconcile to source control totals within an approved tolerance (or exact equality where required) | Reconciliation fixture/report |
| AC-11 | Evidence and review state are validated according to KPI-specific rules | Evidence validation and reviewer workflow tests |
| AC-12 | Public responses expose only approved aggregate fields | API response and access-control tests |
| AC-13 | Restricted data cannot be retrieved outside approved organisation/role scope | Positive and negative authorisation tests |
| AC-14 | Freshness and data-as-of are populated only from trustworthy source timestamps | Staleness and missing-timestamp tests |
| AC-15 | OpenAPI, API docs, source inventory and change log match implementation | Documentation review |
| AC-16 | Typecheck, automated tests, build and required migrations pass in the target environment | Actual command output and migration evidence |
| AC-17 | Operational owner accepts the reconciled result and known limitations | Dated sign-off and acceptance evidence |

A criterion may be marked NOT_APPLICABLE only with a short reason. BLOCKED is not a pass. Production acceptance requires all applicable criteria to pass and all external sign-offs to be recorded.

## 3. Domain-specific acceptance supplements

These supplements add checks; they do not decide the KPI definition.

### Physical progress (PHY-01..PHY-04)

- [ ] Project, activity, asset, lab or classroom identity is stable and mapped to the approved hierarchy.
- [ ] Lifecycle stages are not collapsed (for example, ordered, received, installed, inspected and commissioned remain distinct where relevant).
- [ ] Completion/operational status has approved criteria and required evidence.
- [ ] Snapshot vs event/period measurement is explicit.
- [ ] Rejected, revised, superseded and reopened records are handled according to policy.
- [ ] Generic `iti_submissions` counts and free-text profile fields are not treated as physical KPI facts unless a separately approved mapping explicitly permits it.

### Academic and training outcomes (ACD-01..ACD-05)

- [ ] Course, trainer, learner and cohort identities follow approved source rules.
- [ ] Academic year, admission, enrolment, transfer, cancellation and completion states are explicit where applicable.
- [ ] Completion is supported by the approved assessment/attendance/evidence threshold.
- [ ] Person-level deduplication and privacy controls are tested.
- [ ] Academic intake `ACCEPTED` is not treated as KPI qualification without the approved mapping.

### Industry and employment (IND-01..IND-06)

- [ ] Apprenticeship, OJT, exposure, placement and employer participation are counted at their separately approved grains.
- [ ] Participant and employer identity/deduplication are tested.
- [ ] Placement verification, qualifying duration/window and evidence are tested.
- [ ] IND-05 numerator, denominator, eligible-completer cohort, exclusions and period are explicitly approved and independently reconciled.
- [ ] Industry intake `VERIFIED` is not treated as KPI qualification without the approved mapping.

### Finance (FIN-01..FIN-05)

- [ ] Finance confirms source ownership and the accounting recognition basis.
- [ ] Monetary values preserve exact decimal precision and approved currency/unit.
- [ ] Sanction, release and expenditure records have stable source references and idempotent ingestion.
- [ ] Corrections/reversals preserve audit history and follow approved policy.
- [ ] FIN-04 formula, zero-release behaviour and rounding are approved and tested.
- [ ] FIN-05 balance meaning and reconciliation equation are approved and tested.
- [ ] Financial-year and as-of-date boundaries are tested.
- [ ] Public dashboard does not expose ledger detail or unapproved finance write/recovery operations.

## 4. Release gate

A KPI may move through these gates only in order:

1. **Decision recorded:** completed decision record with required authority evidence.
2. **Contract approved:** versioned definition, source, time, scope, policy and visibility approved.
3. **Source validated:** authoritative source access, provenance and reconciliation controls demonstrated.
4. **Implementation accepted:** all applicable engineering criteria pass.
5. **Operationally accepted:** accountable owner signs off reconciled results and limitations.
6. **Published:** only approved aggregate fields are enabled at the approved access level.

If any gate fails, keep the KPI unavailable or internal-only as appropriate. Never substitute a proxy metric or fabricated zero to satisfy a dashboard requirement.

## 5. How to use this template

- Create one filled decision record per KPI or explicitly approved KPI family.
- Keep the blank template unchanged; store completed records separately under `docs/phase-7/decisions/`.
- Use filenames such as `PHY-01_CIVIL_WORKS_v1.0.0.md` only after an actual contract version is assigned.
- Link every implementation PR/commit, migration, test fixture, reconciliation output and sign-off to the decision record.
- Update `KPI_APPROVAL_REGISTER_AND_IMPLEMENTATION_BACKLOG.md` only when evidence changes the status. Do not promote a KPI based on engineering readiness alone.
