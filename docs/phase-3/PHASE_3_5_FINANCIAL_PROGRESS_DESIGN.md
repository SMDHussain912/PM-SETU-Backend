# Phase 3.5 — Financial Progress Reporting Design

**Repository:** `SMDHussain912/PM-SETU-Backend`  
**Branch:** `main`  
**Design version:** Draft 0.1  
**Status:** Technical design proposal — DB-05 / DASH-05 and Finance-owner approval pending  
**Depends on:** Phase 3.0 Dashboard Data Audit; Phase 3.1 Reporting Data Contract; Phase 3.2 Physical Progress Reporting Design; Phase 3.4 Industry Outcomes Reporting Design  
**Scope:** Approved outlay, funds released, expenditure, utilisation percentage and balance (FIN-01 to FIN-05).

> **Approval boundary:** This document translates the Phase 0 financial KPI mapping into a technical proposal. It is not an approved financial data model or accounting policy. No production Prisma models, SQL migrations, API routes, accounting rules, formulas, status vocabularies, role grants or external integrations are introduced until Finance, DET, the Approving Authority and the relevant Financial Management System (FMS) owner approve the definitions and source contracts.

## 1. Purpose and source basis

Phase 0 identifies five financial-progress measures:

| KPI ID | Official KPI label | Phase 0 source expectation |
|---|---|---|
| FIN-01 | Approved outlay | Approved programme / project outlay |
| FIN-02 | Funds released | Funds released |
| FIN-03 | Expenditure | Expenditure incurred |
| FIN-04 | Utilisation percentage | Utilisation percentage |
| FIN-05 | Balance | Unutilised balance |

The Phase 0 mapping proposes a hierarchy of State → Cluster → ITI / Project for these measures and identifies the following source expectations and open questions:

- FIN-01 requires formally approved outlay; calculation and reporting grain are not specified. AIP investment and SIP proposal/contribution fields are only partial proxies and must not be labelled approved outlay.
- FIN-02 requires formally released amounts and release transactions linked to an approved outlay/sanction. The source asks for release order/reference, date, amount and recipient.
- FIN-03 requires accepted/verified expenditure records or an authoritative FMS. The accounting basis — booked, paid, certified or otherwise accepted — is unresolved.
- FIN-04 has no approved formula. The Phase 0 mapping notes that expenditure ÷ funds released × 100 is only a candidate requiring approval, including denominator and zero-release handling.
- FIN-05 has no approved formula. The mapping asks whether balance means unreleased allocation, unspent releases or total available balance.

The Phase 0 Data Dictionary identifies **DB-05 — Financial progress** as an open decision: define sanctioned/approved outlay, releases, expenditure, utilisation and balance with fiscal period and source authority. It names Finance / DET as proposed owners.

The Phase 0 decision register identifies **DASH-05 — Finance KPI definitions**: approve the definitions for outlay, release, expenditure, utilisation percentage and balance, and identify the authoritative financial system. DASH-06, DASH-07, DASH-08, DASH-09 and DASH-10 also affect financial reporting periods, hierarchy, ownership, integrations and access.

The Phase 3.0 source/schema audit found AIP `investment_amount` and SIP proposal/contribution fields, but no authoritative approved-outlay ledger, release transactions or expenditure ledger in the inspected Prisma schema. The existing `GET /api/v1/dashboard/finance` endpoint sums AIP investment and SIP proposed/contribution values. Those values are not proof of approved outlay, funds released, expenditure, utilisation or balance. This is repository evidence only; it is not a production database inspection or Finance reconciliation.

## 2. Scope and non-scope

### In scope

1. Approved budget/outlay and sanction records.
2. Release orders and release transactions.
3. Expenditure records and accepted accounting basis.
4. Derived utilisation percentage contract, only after formula approval.
5. Balance definitions and reconciliation, only after formula/meaning approval.
6. Financial scope attribution to programme, project, cluster, ITI and recipient.
7. Financial year, as-of snapshots, revisions, provenance, reconciliation and audit.
8. Access controls for sensitive financial information and aggregate dashboard values.

### Explicitly out of scope

- Replacing the State's authoritative FMS, treasury, accounting or sanction system.
- Treating AIP investment amounts or SIP proposed contributions as approved outlay.
- Treating a proposal, commitment, allocation request, sanction, release and expenditure as the same financial event.
- Assuming that a release order means funds were received, drawn or spent.
- Assuming that an invoice, bill, claim, utilisation certificate or uploaded document is accepted expenditure without the approved accounting/verification rule.
- Defining accounting treatment, budget heads, scheme rules, carry-forward rules, fiscal-year dates or audit standards without Finance approval.
- Defining FIN-04 or FIN-05 formulas in production before their meanings and source records are approved.
- Publishing transaction-level banking, vendor, beneficiary, invoice or other restricted financial data through public dashboard endpoints.

## 3. Design principles

1. **Keep financial stages separate.** Approved outlay, release, expenditure and balance represent different events or measures.
2. **Use authoritative financial records.** Each amount must trace to an approved source system, sanction/order or accounting record.
3. **Preserve transaction grain.** Store individual sanctions, revisions, releases, adjustments and expenditure records; derive aggregates from them.
4. **Do not overwrite financial history.** Corrections, cancellations, reversals and revised sanctions must be represented as auditable events or versions.
5. **Use exact monetary precision.** Store currency amounts in an approved fixed-precision decimal representation; do not use binary floating-point for accounting values.
6. **Make currency and unit explicit.** Do not aggregate unlike currencies or units without an approved conversion policy.
7. **Attribute scope explicitly.** Each record must identify its programme/project and the approved organisational/recipient dimensions.
8. **Make fiscal period explicit.** Financial year, transaction date, effective date and as-of date must not be conflated.
9. **Separate actuals from proposals and commitments.** Proposed contributions, estimates and planned expenditure must have distinct labels and must not enter actuals.
10. **Reconcile every reporting total.** Dashboard aggregates must be traceable to source records and reconciliation results.
11. **Represent uncertainty honestly.** Missing, stale, unreconciled, pending and not-applicable values must not silently become zero.
12. **Version definitions and mappings.** Historical values must be interpretable under the financial rules and source mappings effective at the time.
13. **Enforce least privilege.** Transaction-level financial data is restricted; public dashboard access must be explicitly allowlisted.
14. **Do not make accounting decisions in application code.** Formula and classification rules belong to the approved Finance contract.

## 4. Proposed conceptual architecture

```text
Authoritative FMS / Treasury / Sanction Systems
                  |
                  v
         Approved API / File Interface
                  |
                  v
       Staging + source reconciliation
                  |
                  v
        Validation / financial controls
                  |
       +----------+-----------+----------------+
       |                      |                |
       v                      v                v
 Approved outlay         Release ledger    Expenditure ledger
 / sanction records      / transactions     / adjustments
       |                      |                |
       +----------------------+----------------+
                              |
                              v
                 PM-SETU financial repository
                              |
                              v
                Approved KPI calculation layer
                              |
                              v
                  Dashboard aggregation API
                              |
                              v
             State → Cluster → ITI / Project
```

This is a conceptual architecture. It does not assert that any external FMS, treasury or sanction interface is currently available. The Phase 3.1 integration contract applies: source owner, system of record, interface, identifier mapping, authentication, delivery schedule, retry/error handling, reconciliation and legal/operational approval must be documented before integration.

Dashboard APIs should read the PM-SETU reporting repository. They must not query multiple external production financial databases directly at request time.

## 5. Shared financial data model concepts

The following are conceptual record types for review, not approved Prisma models or final table names.

| Concept | Purpose | Candidate attributes | Approval dependency |
|---|---|---|---|
| FinancialProgramme / Project | Canonical reporting scope | source ID, programme/project code, name, effective dates | Programme/project master and ownership |
| BudgetHead / FundingCategory | Classify approved financial scope | code, label, parent, effective dates | Official budget-head taxonomy and mapping |
| ApprovedOutlay | Record a formally approved amount | sanction reference, amount, currency, scope, approval date, effective period | What qualifies as approved outlay |
| OutlayRevision | Preserve revised sanction/outlay history | original record, revision number, revised amount, reason, effective date | Revision/cancellation rules |
| ReleaseOrder | Record formal release authority | order/reference, date, issuing authority, scope, recipient | What event constitutes release |
| ReleaseTransaction | Record amount released under an order | source transaction ID, amount, currency, date, recipient, sanction link | Release grain, partial releases and reversal rules |
| ExpenditureRecord | Record expenditure under approved accounting basis | source voucher/transaction ID, amount, currency, date, scope, category, status | Booked/paid/certified/accepted definition |
| ExpenditureAdjustment | Record correction/reversal/credit | original expenditure, adjustment reference, amount, date, reason | Accounting treatment and effective date |
| FinancialPeriod | Approved financial-year/calendar reference | period code, start/end dates, status | Official fiscal calendar and cut-off |
| FinancialSnapshot | Reproducible aggregate as-of a point in time | period, scope, KPI definition version, source watermark, calculated time | Snapshot schedule and restatement policy |
| SourceReference | Trace source record and import | system, record ID, source version, import batch, timestamps | Source interface and identifier mapping |
| ReconciliationRun | Record source-to-reporting comparison | run ID, period, scope, totals, exceptions, status | Reconciliation owner and tolerance |
| Approval / VerificationEvent | Record validation and sign-off | actor, role, decision, timestamp, reason, evidence reference | Finance approval and delegation rules |

### Required shared record controls

- Stable source-system identifier and source record version.
- Currency code and approved decimal precision.
- Transaction/effective date and financial-year attribution.
- Programme/project, funding category/budget head and recipient/scope references as applicable.
- Import batch, source update timestamp and captured timestamp.
- Validation/reconciliation state and definition version.
- Actor, reason and immutable audit trail for manual corrections.
- Idempotent source ingestion and duplicate detection.
- Effective-dated mappings when a project, ITI, cluster or budget classification changes.

The design should prefer references to authoritative records over unnecessary duplication of vendor, beneficiary or bank details.

## 6. Approved outlay — FIN-01

Phase 0 describes FIN-01 as approved programme/project outlay and calls for approved budget/outlay records with sanction reference, amount, date and scope. It explicitly warns not to label proposed SIP investment as approved outlay.

### Proposed record concept

**ApprovedOutlay** represents an amount formally approved/sanctioned by the competent authority for a defined programme/project, scope and period. Whether the sanctioned amount, approved budget allocation or another formal amount is the authoritative unit must be decided by Finance.

### Candidate attributes

| Attribute | Purpose | Decision required |
|---|---|---|
| Source sanction ID/reference | Identify the authoritative approval | Which system/document is the system of record? |
| Approval authority | Identify competent approving body | Which authorities and delegation levels are valid? |
| Approval date | Date of formal approval | Which date controls reporting period? |
| Effective period | Period the approval applies to | Can an approval span financial years? |
| Programme/project | Scope of approved amount | Which master identifiers are authoritative? |
| Budget head/funding source | Financial classification | Which codes and mapping version apply? |
| Approved amount/currency | Monetary value formally approved | Is amount gross/net of taxes or other components? |
| Revision/supersession reference | Link amended approvals | How are revisions, reductions and cancellations handled? |
| Recipient/implementing entity | Attribution for reporting | Which entity receives outlay attribution? |
| Evidence/source reference | Trace to sanction/order | What document or electronic reference is mandatory? |

### Definition decisions requiring approval

Finance must confirm:

1. Whether FIN-01 means sanctioned amount, approved budget allocation, approved project cost or another formal outlay measure.
2. Whether the measure is gross approved amount, net of any deductions, or split into separately reported categories.
3. The grain: programme, project, sanction, budget head, recipient, ITI or another scope.
4. How multiple sanctions and revised sanctions are counted.
5. Whether cancelled, superseded, expired or partially withdrawn approvals remain in historical totals.
6. How multi-year sanctions are attributed to financial years.
7. Whether committed liabilities or carry-forward amounts are included or separately reported.

### Explicit exclusions until approved

- AIP `investment_amount` profile values.
- SIP proposed investment or contribution fields.
- Draft proposals, submitted SIPs or unapproved estimates.
- Announced project costs without an authoritative approval record.

These may be displayed in a separately labelled proposal/commitment view only if that is approved as a separate measure; they must not be substituted for FIN-01.

## 7. Funds released — FIN-02

Phase 0 describes FIN-02 as the sum of formally released amounts and requires release order/reference, date, amount and recipient. It proposes release transactions linked to sanction/outlay and scope.

### Proposed record concepts

- **ReleaseOrder:** formal authority/document directing release of funds.
- **ReleaseTransaction:** one release event or instalment recorded by the authoritative source.
- **ReleaseAdjustment:** cancellation, correction, recovery or reversal linked to an earlier release.
- **ReleaseRecipientAllocation:** allocation of a release to the approved recipient/scope where the source records this separately.

### Candidate attributes

| Attribute | Purpose | Decision required |
|---|---|---|
| Release order/reference | Authoritative release document | What document/source constitutes a release? |
| Source transaction ID | Unique release event | Which source identifier is stable? |
| Release date | Date of release event | Order date, treasury date, debit date or credit date? |
| Amount/currency | Released amount | Gross/net and currency treatment |
| Sanction/outlay link | Approved authority for release | Can one release reference multiple sanctions? |
| Recipient | Receiving entity | Is the recipient the ITI, cluster, agency or another entity? |
| Funding/budget head | Financial classification | Which official code applies? |
| Destination/scope | Project, activity or organisational attribution | How are split releases represented? |
| Adjustment link | Reversal/correction history | How are failed, returned or cancelled releases handled? |
| Evidence | Order/transaction reference | Which proof is required? |

### Release semantics requiring approval

Finance must distinguish among:

- Release order issued.
- Treasury/payment instruction initiated.
- Amount debited/released by the issuing authority.
- Amount credited/received by the recipient.
- Amount made available for expenditure.

These are not necessarily the same date or event. The official FIN-02 definition must identify which stage is counted. A release order must not automatically be represented as recipient receipt unless the approved definition says so.

Partial releases, split recipients, returned funds, failed payments, revalidation and reversals must have explicit treatment. The reporting model must preserve the original event and its adjustment rather than silently overwriting the amount.

## 8. Expenditure — FIN-03

Phase 0 describes FIN-03 as the sum of accepted/verified expenditure and asks Finance to clarify whether the accounting basis is booked, paid, certified or otherwise accepted. It proposes an authoritative FMS or accepted expenditure records.

### Proposed record concepts

- **ExpenditureRecord:** source transaction/voucher/claim recorded under the approved accounting basis.
- **ExpenditureEvidence:** reference to voucher, invoice, payment or certification evidence as required by Finance.
- **ExpenditureVerification:** review/acceptance outcome, reviewer and date.
- **ExpenditureAdjustment:** reversal, credit note, correction, recovery or reclassification linked to the original record.
- **ExpenditureClassification:** approved budget head, project/activity and expenditure category.

### Candidate attributes

| Attribute | Purpose | Decision required |
|---|---|---|
| Source voucher/transaction ID | Unique source record | Which FMS identifier is authoritative? |
| Transaction/document type | Invoice, voucher, payment, certificate, etc. | Which types qualify for FIN-03? |
| Accounting date | Date recognised in the source system | Which date controls financial-year inclusion? |
| Payment date | Date paid, if separately tracked | Is cash payment required for inclusion? |
| Amount/currency | Recorded amount | Gross/net, tax and rounding treatment |
| Budget head/category | Classification | Which chart of accounts and mapping apply? |
| Programme/project/scope | Attribution | How are shared costs apportioned? |
| Payee/recipient reference | Restricted counterparty reference | What is required in the reporting layer? |
| Verification/acceptance | Approved quality state | Who can accept and under what rule? |
| Adjustment reference | Correction/reversal link | How are historical totals restated? |
| Evidence reference | Audit support | Which records must be retained and for how long? |

### Accounting basis choices requiring approval

Finance must choose and define the measure, for example:

1. **Booked expenditure:** recognised/posted in the authoritative accounting system.
2. **Paid expenditure:** amount actually paid/disbursed.
3. **Certified/accepted expenditure:** amount supported by an approved certification/verification process.
4. **Another official basis:** explicitly named and documented by Finance.

These bases can produce different values. The dashboard must not combine them under one FIN-03 label. If Finance needs multiple views, each must have a separate approved label, unit and definition.

### Expenditure controls

- Do not count an uploaded invoice, claim or utilisation certificate as expenditure solely because a file exists.
- Prevent duplicate import of the same source voucher/transaction.
- Preserve credit notes, reversals, recoveries and reclassifications as linked adjustments.
- Separate planned/committed expenditure from actual expenditure.
- Do not infer expenditure from an approved outlay or funds released.
- Require source reconciliation and approved accounting-period attribution.

## 9. Utilisation percentage — FIN-04

Phase 0 explicitly states that the formula is not specified. It notes a candidate of expenditure ÷ funds released × 100, but requires approval of the formula, denominator and treatment of zero releases. No production formula is approved by this design.

### Required formula contract

Finance must approve all of the following before FIN-04 can be implemented:

| Component | Decision required |
|---|---|
| Numerator | Exact FIN-03 expenditure basis and adjustment treatment |
| Denominator | Funds released, approved outlay, available funds or another defined base |
| Scope | Programme/project/recipient/ITI and budget-head grain |
| Period | Financial-year-to-date, period-only, cumulative-to-date or another basis |
| Carry-forward | Treatment of prior-year balances and releases |
| Revisions | Treatment of revised outlay, returned releases and adjustments |
| Zero denominator | Explicit undefined/not-applicable display behaviour |
| Above 100% | Whether possible, permitted, flagged or invalid under the approved basis |
| Rounding | Display precision and rounding rule |
| Restatement | How late expenditure and source corrections update historical rates |

### Candidate formula — discussion only

The Phase 0 mapping mentions this candidate:

`expenditure ÷ funds released × 100`

This is not an approved business rule. It must not be implemented or displayed as FIN-04 unless Finance approves the numerator basis, denominator, period, carry-forward, adjustment and zero-denominator rules. Another denominator may be required by the official financial policy.

### Display safeguards

- Never divide by zero.
- Do not display 0% when the denominator is absent, zero or unavailable unless the approved policy explicitly defines that outcome.
- Distinguish unavailable, pending reconciliation, stale and not applicable.
- Display the formula/definition version, financial period and as-of date with the value.
- Do not average ITI-level percentages to obtain a cluster/state percentage. Recompute using approved aggregate numerator and denominator at the requested scope.
- Flag values above 100% for review if they are possible under the approved rule; do not silently cap them.

## 10. Balance — FIN-05

Phase 0 labels FIN-05 as “Unutilised balance” but states that its formula is not defined. It asks Finance to clarify whether balance means unreleased allocation, unspent releases or total available balance. A candidate of released funds minus accepted expenditure is mentioned only as a possibility requiring approval.

### Candidate balance concepts

| Candidate meaning | Conceptual interpretation | Why it differs |
|---|---|---|
| Unreleased allocation | Approved outlay less funds released | Represents amount not yet released, subject to approved revisions and scope |
| Unspent releases | Released funds less accepted expenditure | Represents released funds not yet expended under the chosen accounting basis |
| Available balance | Official available funds after considering opening balance, releases, expenditure, recoveries and other adjustments | Requires a complete approved financial ledger and policy |
| Sanction balance | Remaining amount under a sanction after eligible releases/adjustments | Depends on sanction-level rules and commitments |

These are alternatives, not interchangeable components of a single value.

### Required decisions

Finance must approve:

1. The exact meaning and display label for FIN-05.
2. The opening balance and carry-forward policy, if applicable.
3. Which releases and expenditure basis are included.
4. Treatment of recoveries, refunds, advances, liabilities, commitments, write-backs and reversals.
5. Treatment of revised/cancelled sanctions and returned/unspent funds.
6. Whether balance is calculated per sanction, project, budget head, recipient or programme.
7. The financial period and as-of timestamp.
8. Whether negative balances are valid, exceptional or invalid under the chosen definition.

### Candidate formulas — discussion only

- Approved outlay less released amount could represent an unreleased amount.
- Released amount less accepted expenditure could represent an unspent released amount.

Neither is an approved FIN-05 formula. Do not implement either until Finance confirms the balance meaning and all included adjustments.

## 11. Financial periods, snapshots and historical restatement

Phase 0 assigns FIN-01 through FIN-05 a financial-year and as-of-date context. DASH-06 requires confirmation of snapshot frequency, financial year, cohort period and historical restatement policy.

### Required time dimensions

- **Transaction date:** date of the source financial event.
- **Accounting date:** date recognised in the accounting system, if distinct.
- **Approval/effective date:** date a sanction or revision becomes effective.
- **Financial year:** official fiscal period assigned under the approved calendar.
- **As-of timestamp:** point at which an aggregate snapshot represents the financial position.
- **Source update/capture time:** when the source changed and when PM-SETU received it.
- **Reconciliation timestamp:** most recent successful comparison with authoritative totals.

Do not assume a universal date rule. Finance must identify which date controls each KPI and how transactions crossing financial-year boundaries are treated.

### Snapshot and restatement requirements

- Preserve reproducible snapshots or sufficient immutable transaction history to reconstruct them.
- Record source watermark, last successful sync, reconciliation status and KPI-definition version.
- Support late-arriving transactions and approved corrections.
- Define whether historical reports are restated or remain frozen after period close.
- If restated, retain prior published values and the reason/version for the restatement.
- Distinguish provisional/current-period values from closed and reconciled financial-year values.

## 12. Hierarchy and financial attribution

Phase 0 proposes State → Cluster → ITI / Project. DASH-07 requires confirmation of drill-down levels and DASH-08 requires a named system of record and data owner per KPI.

### Candidate attribution dimensions

- State and Cluster.
- Hub ITI / Spoke ITI, where Finance approves attribution.
- Programme and Project.
- Sanction and budget head.
- Implementing agency / recipient.
- Activity or work package, if an approved project breakdown exists.

### Aggregation safeguards

1. Every financial transaction must have one approved attribution rule for each reporting dimension.
2. Do not duplicate a single release or expenditure across multiple ITIs merely because several ITIs benefit from a project.
3. Where a transaction legitimately covers multiple recipients or projects, use authoritative split allocations whose sum reconciles to the source transaction.
4. Do not infer equal splits from the number of beneficiaries or ITIs.
5. A State total must be computed from non-overlapping source amounts under the approved hierarchy.
6. Transfers between recipients or scopes must be represented as linked transactions/adjustments so they do not inflate totals.
7. Keep budget-head and programme/project totals distinct where they are alternative views of the same underlying amount.
8. Show the attribution basis and unresolved/unallocated amounts rather than silently dropping them.

## 13. Integration, provenance and reconciliation

### Source inventory required

Finance / DET / NIC must identify the authoritative source for each financial record type:

- Approved sanctions/outlay and revisions.
- Release orders and release transactions.
- Accounting/expenditure transactions and adjustments.
- Budget heads and financial-year calendar.
- Recipient/project/ITI mappings.
- Closing balances and carry-forward data, if FIN-05 requires them.

Possible systems may include an FMS, treasury or sanction-management system, but no specific interface is asserted to exist until its owner confirms it.

### Integration contract

For each source, document:

- System name, owner and authoritative record type.
- Approved API/file specification and version.
- Authentication, authorisation and credential custody.
- Stable source identifiers and mapping to PM-SETU scope.
- Currency, amount precision, date/time zone and fiscal-period semantics.
- Full/incremental extraction, refresh frequency and source watermark.
- Idempotency, retry, duplicate detection and correction strategy.
- Error queue, operational alerting and recovery procedure.
- Reconciliation totals, tolerances and sign-off owner.
- Retention, legal approval and permitted use.

### Reconciliation requirements

Every reporting refresh should produce a reconciliation result at agreed periods and scopes:

| Reconciliation check | Required outcome |
|---|---|
| Source record count vs imported record count | Explain accepted, rejected, duplicate and superseded records |
| Approved outlay totals | Match authoritative sanctions/revisions under the approved definition |
| Release totals | Match authoritative release transactions and adjustments |
| Expenditure totals | Match the approved accounting basis and period |
| Currency and precision | No silent currency mixing or rounding drift |
| Scope allocation | Split allocations reconcile to original source amount |
| Opening/closing balance | Reconcile where the approved FIN-05 definition requires it |
| Late changes | Identify and record historical restatements |
| Unallocated records | Surface separately with owner and resolution status |

No tolerance threshold should be invented. Finance must define materiality/tolerance and the escalation process. A failed reconciliation must prevent a value from being represented as verified.

## 14. Data quality and exception handling

| Risk | Required handling |
|---|---|
| SIP proposal treated as approved outlay | Exclude from FIN-01; label proposal data separately if approved |
| AIP investment amount treated as sanction | Exclude from FIN-01 unless authoritative sanction evidence is linked and approved |
| Release order counted as recipient receipt | Use the approved release milestone; distinguish order, payment and receipt |
| Duplicate release import | Idempotent source keys and source reconciliation |
| Partial/split release | Preserve transaction grain and reconcile recipient/project splits |
| Failed/returned release | Record reversal/adjustment; do not silently retain as released if policy says otherwise |
| Invoice treated as expenditure | Require approved accounting recognition/acceptance |
| Duplicate voucher | Deduplicate by authoritative source transaction key |
| Reversal/recovery/credit | Link adjustment to original expenditure and preserve history |
| Wrong financial-year attribution | Apply approved date rule and fiscal calendar; retain correction history |
| Mixed currency | Reject or segregate until approved conversion policy is applied |
| Decimal precision drift | Use fixed precision and documented rounding |
| Unallocated project/ITI amount | Surface as unallocated; do not invent a split |
| Missing source data | Show unavailable/incomplete, not zero |
| Stale FMS sync | Show last successful sync and withhold verified status as required |
| Reconciliation mismatch | Mark pending/failed and route to Finance owner |
| Historical restatement | Retain prior published snapshot and reason for change |

## 15. Privacy, security and access

Financial records may contain restricted sanction documents, transaction references, payee/vendor details, bank/payment information and sensitive project allocations.

Proposed controls, subject to DASH-10 approval:

1. Public dashboard: only an explicit allowlist of approved aggregate values and safe labels.
2. Internal dashboard: authentication, role-based permission and State/Cluster/ITI/project resource-scope checks on every endpoint.
3. Finance operations: transaction-level read/write/review access limited to explicitly authorised Finance and delegated officials.
4. Evidence: private storage, authorised retrieval, access logging, malware/file validation and retention controls.
5. Data minimisation: do not expose bank account details, personal payee data, tax identifiers or unnecessary vendor contacts in dashboard responses.
6. Exports: apply the same access scope, masking, watermarking and audit requirements as interactive endpoints.
7. Audit: record actor, action, timestamp, source/record reference, before/after values or version references, reason and approval outcome.
8. Separation of duties: where policy requires, the person entering or importing a financial record must not be the sole verifier/approver.
9. Public/internal separation: do not rely on frontend hiding; enforce the approved access policy server-side.

The Phase 3.0 audit observed that the inspected dashboard router did not apply authentication/role/scope middleware. No new financial drill-down endpoint should be exposed until DASH-10 and backend enforcement are approved and verified.

## 16. API design proposal (not implemented)

The following are candidate resource shapes for review, not existing routes or approved contracts:

| Candidate resource | Purpose | Approval dependency |
|---|---|---|
| `/finance/outlays` | Approved outlay and sanction records | FIN-01 definition, source and access |
| `/finance/releases` | Release orders, transactions and adjustments | FIN-02 milestone, source and recipient attribution |
| `/finance/expenditures` | Expenditure records and adjustments | FIN-03 accounting basis and source |
| `/finance/utilisation` | FIN-04 derived aggregates | Approved numerator, denominator and period |
| `/finance/balances` | FIN-05 approved balance measure | Approved balance meaning and adjustment rules |
| `/dashboard/finance` | Financial KPI summary by approved scope | All KPI contracts, reconciliation and DASH-10 |

API requirements:

- Validate period, scope, currency and budget-head filters.
- Enforce role and resource scope server-side.
- Keep transaction-level APIs separate from aggregate dashboard APIs.
- Include KPI ID, label, unit/currency, period, as-of timestamp, source freshness, reconciliation status and definition version.
- Return explicit unavailable/stale/unreconciled states rather than substituting zero.
- Avoid returning restricted payee/vendor/bank details in aggregate responses.
- Support pagination and audit logging for operational records.
- Do not introduce these routes until definitions, source interfaces and access policy are approved.

The existing `GET /api/v1/dashboard/finance` route must not be assumed to satisfy the future financial reporting contract. Its current AIP/SIP proposal-related aggregation requires separate review and safe relabelling/removal once the approved finance measures are implemented.

## 17. Decisions required to close DB-05 / DASH-05

| Decision ID | Approval question | Proposed owner |
|---|---|---|
| DB-05 | Define sanctioned/approved outlay, releases, expenditure, utilisation and balance with fiscal period and source authority | Finance / DET |
| DASH-05 | Approve finance KPI definitions and identify authoritative financial system | Finance / DET |
| DASH-06 | Confirm financial year, snapshot frequency, as-of date and historical restatement policy | State PMU / DET / Finance |
| DASH-07 | Confirm State, Cluster, Hub ITI, Spoke ITI, Project and Activity drill-down as applicable | State PMU / DET / Finance |
| DASH-08 | Name system of record and data owner for each KPI; define validation and sign-off | DET / Finance / source-system owners |
| DASH-09 | Confirm FMS/treasury/sanction API or file interfaces, refresh, identifiers, error handling and reconciliation | DET / NIC / system owners |
| DASH-10 | Approve public versus internal financial metrics and authenticated operational access | DET / State PMU / Finance |
| DB-11 / INT-01 | Inventory official financial interfaces, owners, credentials, SLAs and availability | DET / NIC / Finance / system owners |
| DB-12 / provenance | Approve source, captured_at, reporting_period, validation status and last_sync requirements | DET / NIC / Finance |

### Detailed approval checklist

Before FIN implementation begins, record an approved answer for each item:

- [ ] FIN-01: meaning of approved outlay, approval authority, grain, revision/cancellation rules and financial-year attribution.
- [ ] FIN-02: release milestone (order, issued, debited, credited/received or other), release transaction grain, recipient and reversal rules.
- [ ] FIN-03: accounting basis (booked, paid, certified/accepted or other), eligible transaction types, date rule and adjustment handling.
- [ ] FIN-04: numerator, denominator, formula, period, carry-forward, zero denominator, above-100% and rounding behaviour.
- [ ] FIN-05: balance meaning, opening/carry-forward, included adjustments, negative-balance treatment and grain.
- [ ] Currency and precision: official currency, decimal scale, conversion policy and rounding.
- [ ] Periods: financial-year calendar, cut-off, as-of snapshot schedule and historical restatement.
- [ ] Hierarchy: programme/project/recipient/ITI/cluster attribution and split-allocation rules.
- [ ] Sources: system of record, owner, identifiers, interface, refresh, reconciliation tolerance and sign-off.
- [ ] Access: public allowlist, internal roles, resource scopes, evidence access and export policy.

Approval evidence should identify approver, role/department, date, decision text, effective date, source document/reference and contract version. A candidate formula or technical preference is not Finance approval.

## 18. Implementation gates and exit criteria

### Gate A — Financial definition approval

- DB-05 and DASH-05 decisions are documented and signed off by Finance/DET.
- Every KPI has a unit, source record grain, inclusion/exclusion rule and period.
- FIN-04 formula is approved with numerator, denominator and edge-case behaviour.
- FIN-05 meaning and all included/excluded adjustments are approved.
- Currency, precision, fiscal calendar and restatement rules are approved.

### Gate B — Source and integration readiness

- Each financial record type has a named authoritative system and accountable owner.
- Official API/file interface, identifiers, authentication, schedule and error handling are documented.
- Source-to-PM-SETU scope mapping is approved.
- Source reconciliation totals, tolerances and sign-off responsibility are established.
- Security, privacy, retention and legal requirements are approved.

### Gate C — Data model and implementation

- Approved domain models and migrations are reviewed against source contracts.
- Sanctions, revisions, releases, expenditure and adjustments preserve transaction history.
- Monetary values use fixed precision and explicit currency.
- Imports are idempotent and support late updates and corrections.
- Financial-year attribution and hierarchy aggregation are tested.
- FIN-04 tests cover zero denominator, period boundaries, adjustments and aggregate recomputation.
- FIN-05 tests cover opening balance, carry-forward, reversals, recoveries and negative/exception cases as approved.
- Access-control tests cover public allowlist and cross-scope denial.

### Gate D — Financial reconciliation and dashboard verification

- FIN-01, FIN-02 and FIN-03 reconcile to authoritative source totals for agreed periods and scopes.
- FIN-04 and FIN-05 reproduce approved Finance calculations for representative cases.
- Every published value shows period, as-of time, freshness, reconciliation state and definition version.
- Missing/stale/unreconciled values are not shown as verified or converted to zero.
- Public/internal outputs pass Finance, privacy and access review.
- Finance and DET sign off the dashboard values.

## 19. Deliverable status

| Item | Status |
|---|---|
| Phase 0 FIN-01 to FIN-05 source mapping reviewed | Complete |
| DB-05 / DASH-05 and related decisions mapped | Complete |
| Conceptual financial data model and architecture | Drafted |
| Approved outlay and release semantics | Alternatives documented; approval pending |
| Expenditure accounting basis | Choices documented; approval pending |
| Utilisation formula | Not approved; intentionally not implemented |
| Balance meaning/formula | Not approved; intentionally not implemented |
| Source interfaces and owners | Not confirmed |
| Production Prisma models / migrations | Not created |
| Production API routes / dashboard formulas | Not created |
| Tests | Not run; documentation-only deliverable |

**Phase 3.5 exit status:** Design proposal prepared. It is not implementation-ready until the financial definitions, source authority, integration and reconciliation gates above are satisfied.

## 20. Next phase

The financial reporting design completes the Phase 3 KPI-domain design set (physical, academic, industry and financial). The next step should be a cross-domain consolidation/readiness pass: reconcile the five Phase 3 design artefacts against the Phase 0 KPI mapping and decision register, identify shared approval dependencies, and produce a single implementation-readiness matrix. Production KPI implementation should begin only for measures whose definitions, sources, access rules and reconciliation criteria have been approved.

---

**End of Phase 3.5 design — Draft 0.1**
