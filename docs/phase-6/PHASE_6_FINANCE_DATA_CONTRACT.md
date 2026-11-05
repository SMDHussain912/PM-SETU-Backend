# Phase 6 — Finance Management

**Branch:** `main`  
**Status:** Requirements mapped; implementation foundation in progress  
**Source baseline:** PM SETU Phase 0 Dashboard KPI Source Mapping workbook, Finance KPI rows FIN-01 through FIN-05; PM SETU Functional, Content & Technical Architecture, §20–22.

## 1. Scope

Phase 6 establishes a trustworthy financial data foundation for the PM-SETU financial progress view. The five required financial indicators are:

1. Approved outlay
2. Funds released
3. Expenditure
4. Utilisation percentage
5. Balance

Required drill-down: State → Cluster → ITI / Project. Reporting context: financial year and as-of date.

## 2. Existing implementation evidence

The current `GET /api/v1/dashboard/finance` endpoint aggregates:
- AIP `investment_amount`
- SIP `proposed_investment`
- SIP contribution fields (infrastructure, equipment, training, industry, government)

These are planning/registry indicators only. They are not evidence of formally approved outlay, actual fund releases, or accepted expenditure. The existing endpoint must not relabel these proxy values as the five official financial progress KPIs.

## 3. Required financial records

### 3.1 Approved outlay / sanction

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Sanction/order reference
- Sanction date
- Approved amount (INR)
- Financial year
- Scope attribution: State, Cluster, ITI and/or Project
- Source system and stable source record ID
- Created/updated audit metadata

### 3.2 Fund release

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Release order/reference
- Release date
- Released amount (INR)
- Recipient / implementing entity
- Link to the approved sanction/outlay record
- Financial year and scope attribution
- Source system and stable source record ID

### 3.3 Expenditure

Minimum proposed fields, subject to Finance/DET approval:
- Unique record ID
- Voucher / bill / transaction reference
- Transaction date
- Amount (INR)
- Recipient / payee or implementing entity
- Link to sanction/outlay and, where applicable, release record
- Financial year and scope attribution
- Verification evidence/reference
- Source system and stable source record ID

The authoritative accounting basis is unresolved: booked, paid, certified, or another Finance-approved definition. Do not treat an unverified submitted claim as accepted expenditure.

## 4. Derived indicators — approval required

The official source names utilisation percentage and balance but does not define their formulas.

Candidate formulas for Finance owner approval only:
- Utilisation % = accepted expenditure ÷ funds released × 100
- Balance = funds released − accepted expenditure

Before implementation, approve:
- The numerator and denominator for utilisation
- Zero-release behaviour
- Whether balance means unreleased allocation, unspent released funds, or total available balance
- Treatment of reversals, refunds, cancelled releases, adjustments and restatements
- Financial-year boundaries and as-of/snapshot semantics

Until approved, these derived indicators must remain unavailable (not zero and not calculated).

## 5. Integration and data integrity

The architecture requires Source Systems → Integration / ETL → PM-SETU Data Repository → Dashboard API. External Financial Management System access must be through approved APIs or file contracts; no external system receives direct production database access.

Ingestion must preserve stable external IDs, source system, source timestamps, reconciliation status and audit history. Duplicate delivery must be idempotent. Corrections must be traceable; financial records must not be silently overwritten.

## 6. Security and authorization

Finance write permissions, maker-checker separation, approval authority, visibility of sensitive finance data, and public-vs-internal dashboard policy require confirmation from Finance / DET / State PMU. Do not invent role grants or expose financial ledgers publicly by default.

## 7. Open decisions / external dependencies

| Decision | Owner | Required before |
|---|---|---|
| System of record and official FMS interface / export contract | Finance / DET / NIC | Live ingestion |
| Approved outlay definition, grain and sanction evidence | Finance / Approving Authority | Outlay ledger acceptance |
| Release event definition, recipient and sanction linkage | Finance / DET | Release ledger acceptance |
| Expenditure basis: booked, paid, certified, or other | Finance / FMS owner | Expenditure acceptance |
| Utilisation and balance formulas, reversals and zero-denominator rules | Finance / DET | Derived KPI activation |
| Financial year and historical restatement policy | Finance / State PMU | Reporting |
| State / Cluster / ITI / Project attribution rules | DET / Finance | Drill-down |
| Maker-checker, roles and public/internal visibility | Finance / State PMU / NIC | Write API and publication |

## 8. Acceptance criteria

- Every financial amount is traceable to a source record and stable reference.
- Amounts are stored as exact decimal values, not floating-point values.
- Duplicate source records cannot create duplicate financial events.
- Outlay, releases and expenditure are separately represented.
- Scope and financial-year filters are deterministic.
- State and cluster aggregates reconcile to the underlying accepted records.
- Unavailable source data is represented as unavailable, never fabricated as zero.
- Utilisation and balance are not published until their formulas are approved.
- Write access is restricted by an approved Finance authorization matrix.
- Automated tests cover idempotency, validation, reconciliation, scope filtering, auditability and arithmetic boundaries.

## 9. Delivery boundary

This document establishes the Phase 6 engineering contract from the evidence currently available. It does not claim that a Finance-approved ledger schema, accounting policy, FMS interface, permission matrix or production financial dataset has been supplied. Those decisions are explicit gates, not assumptions to hide in code.
