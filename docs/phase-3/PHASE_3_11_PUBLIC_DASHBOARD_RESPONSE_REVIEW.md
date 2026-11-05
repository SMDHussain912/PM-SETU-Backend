# Phase 3.11 — Public Dashboard Response & Data-Disclosure Review

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Status:** Source review complete; disclosure approval and response-contract tests pending  
**Depends on:** Phase 3.6 cross-domain readiness; Phase 3.7 registry KPI implementation; Phase 3.10 public access decision  
**Decision applied:** All six dashboard GET endpoints are intentionally public and read-only.

> **Boundary:** This is a source-level response review. It is not a departmental data-classification approval, privacy assessment, penetration test, or production-data inspection.

## 1. Objective

With public access selected, review the fields returned by dashboard endpoints and distinguish:
- registry/profile facts currently exposed by source queries;
- legacy proxy aggregates that must not be presented as official outcome KPIs;
- null or unavailable metrics;
- fields requiring explicit public-disclosure confirmation.

The review does not invent KPI definitions or assume that a field is public merely because it exists in the database.

## 2. Endpoint response inventory

| Endpoint | Current response content | Source interpretation | Disclosure status |
|---|---|---|---|
| `GET /dashboard/state` | Registry counts, SIP submitted/approved counts, AIP investment sum, null trainees and industries_engaged | Mixed registry and unapproved workflow/financial proxies | Departmental field approval required |
| `GET /dashboard/clusters` | Cluster ID, name, district, sector, registry counts, investment aggregate | Organisation-level cluster directory and registry snapshot | Confirm public cluster directory and investment field |
| `GET /dashboard/clusters/:id` | Cluster identity, metrics, ITI identity/code/name/type/district, AIP name/sector/status/investment_amount | Detailed organisation-level records | Explicit confirmation required for every child-list field |
| `GET /dashboard/finance` | AIP investment and SIP proposed/contribution aggregates, including cluster breakdown | Legacy proposal/investment proxies; not an approved finance ledger | High-priority finance-owner approval required |
| `GET /dashboard/training` | ITI student_strength capacity totals and cluster/type breakdown | Capacity/profile data, not admissions, enrolment or training completion | Explicit approval; must retain capacity labels |
| `GET /dashboard/placements` | Informational message that source is not established | No placement data returned | No placement KPI may be inferred |

## 3. Field-level findings

### 3.1 State and cluster registry metrics

The repository excludes `is_sample = TRUE` records for registry counts implemented in Phase 3.7. The registry population does not apply unapproved active/approved filters. This is consistent with the registered-entity interpretation documented in Phase 3.6.

SIP status counts currently use literal `SUBMITTED` and `APPROVED` states. Phase 3.8 found unresolved workflow vocabulary and counting semantics. These values must not be represented as authoritative submitted/approved KPIs until the workflow owner confirms the contract.

### 3.2 Cluster drill-down fields

The cluster detail response includes:
- cluster ID, name, district and sector;
- ITI ID, code, name, type and district;
- AIP ID, name, sector, status and investment amount.

The route is intentionally public under the selected project direction. No field-level data-classification approval was present in the inspected repository. In particular, confirm whether internal registry identifiers, ITI codes, AIP statuses and organisation-level investment amounts may be published.

### 3.3 Finance endpoint

The finance repository currently aggregates AIP `investment_amount` and SIP proposal/contribution fields. These are not evidenced as sanctioned outlay, funds released, expenditure, utilisation or balance. Some finance queries also do not consistently apply the Phase 3.7 sample-row exclusion used by registry dashboard counts.

Do not relabel or calculate official FIN-01 to FIN-05 measures from these proxy fields. A Finance/DET-approved source and formula contract remains required.

### 3.4 Training endpoint

The training endpoint sums ITI `student_strength` and labels it as student capacity. This field does not establish admissions, learner enrolment, attendance, training completion or placement outcomes. The current query does not consistently apply sample-row exclusions.

Keep the capacity terminology. Do not expose or derive person-level learner information from this endpoint.

### 3.5 Null and unavailable metrics

- `trainees` and `industries_engaged` are returned as `null` because no source is established.
- Placements returns an informational source-unavailable message.

These are honest source-gap representations. Do not replace them with zero, fabricated estimates or proxy calculations.

## 4. Required release safeguards

Before production publication, the accountable department/NIC data owner should approve:
1. the public disclosure of cluster names, district and sector;
2. the public disclosure of ITI names/codes and AIP names/statuses;
3. the public disclosure of organisation-level and aggregated investment values;
4. the public disclosure and exact labels for legacy finance and student-capacity aggregates;
5. whether internal identifiers should be omitted from public responses;
6. cache duration, export availability and any public data freshness disclaimer.

If any field is not approved, create an explicit public response DTO/allowlist and tests that assert the exact response keys. Do not rely on frontend hiding.

## 5. Engineering follow-ups

| Item | Required work | Gate |
|---|---|---|
| PUB-01 | Obtain field-level public disclosure approval | Department/NIC |
| PUB-02 | Define stable public response DTOs after approval | Approved response contract |
| PUB-03 | Add route-level anonymous-access tests for all six GET routes | Test harness and response contract |
| PUB-04 | Add exact response-key allowlist tests for each public endpoint | Approved response contract |
| PUB-05 | Resolve sample-row treatment for legacy finance/training proxy queries | KPI/source owner |
| PUB-06 | Preserve proxy labels and provenance in API documentation | API contract review |
| PUB-07 | Validate deployed CORS, cache, proxy and rate-limit configuration | Deployment/security review |

## 6. Exit status

| Deliverable | Status |
|---|---|
| Six public endpoint response inventory | Complete |
| Source/proxy interpretation review | Complete |
| Cluster detail field inventory | Complete |
| Finance/training caveats recorded | Complete |
| Field-level public disclosure approval | Pending |
| Public response DTO/allowlist implementation | Blocked on disclosure approval |
| Anonymous route and response-shape tests | Pending approved response contract |
| Production security validation | Not performed |

**Phase 3.11 exit:** Source review complete. The selected public model is reflected in route documentation, but public disclosure of every returned field is not certified. The next safe work is to obtain field-level approval, then implement a stable public DTO and response-shape tests without changing KPI semantics.

---

**End of Phase 3.11 — Public Dashboard Response & Data-Disclosure Review**
