/**
 * SIP module types — RoadMap.md §10 "SIP APIs".
 *
 * Verified spec sources:
 *  - §10: three public endpoints, admin CRUD, 7 workflow transition
 *    endpoints, and the canonical workflow states DRAFT → SUBMITTED →
 *    UNDER_SCRUTINY → REVISION_REQUESTED → RECOMMENDED → APPROVED →
 *    IMPLEMENTATION ("comes directly from the NIC specification").
 *  - §25 relationships: SIP → Cluster, SIP → AIP (both target tables
 *    established by existing contracts).
 *  - Home KPI contract: `sips.status` with 'SUBMITTED'/'APPROVED' values.
 *
 * ⚠ §10 documents NO field list and NO filters. The remaining fields below
 * (submission_date, version, contributions, approval_date, remarks) come
 * from the task requirement brief and are NOT verifiable in RoadMap.md —
 * each is marked TO CONFIRM (see sql/sips/sip_queries.sql). Do not add
 * further fields. Response keys use snake_case, consistent with the other
 * modules. Everything is database-driven — never hard-code SIPs.
 */

/** Embedded cluster reference returned with every SIP (§25 SIP → Cluster). */
export interface SipClusterSummary {
    id: number;
    name: string;
}

/** Embedded AIP reference returned with every SIP (§25 SIP → AIP). */
export interface SipAipSummary {
    id: number;
    name: string;
}

/**
 * SIP record (public shape).
 *
 * ⚠ Database contract: the backing table does not exist yet (no Prisma
 * models/migrations). Required columns, the canonical workflow vocabulary
 * and every "TO CONFIRM" item are documented in sql/sips/sip_queries.sql.
 * Admin CRUD, the 7 workflow transitions and the SPV↔SIP link are
 * intentionally deferred.
 */
export interface Sip {
    id: number;
    /**
     * §10 workflow state. Canonical values (established verbatim):
     * DRAFT | SUBMITTED | UNDER_SCRUTINY | REVISION_REQUESTED |
     * RECOMMENDED | APPROVED | IMPLEMENTATION
     */
    status: string;
    /** §25 SIP → Cluster (established table); null when not yet assigned. */
    cluster: SipClusterSummary | null;
    /** §25 SIP → AIP (established table); null when not yet assigned. */
    aip: SipAipSummary | null;
    /** TO CONFIRM: type/format (task-brief field, not in RoadMap §10). */
    submission_date: string | null;
    /** TO CONFIRM: semantics (revision number vs document versioning). */
    version: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    proposed_investment: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    infrastructure_contribution: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    equipment_contribution: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    training_contribution: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    industry_contribution: number | null;
    /** TO CONFIRM: assumed numeric INR. */
    government_contribution: number | null;
    /** TO CONFIRM: date format; only meaningful from APPROVED onwards. */
    approval_date: string | null;
    /** TO CONFIRM: free text. */
    remarks: string | null;
}

/**
 * Accepted list filters. §10 documents NO list filters, so pagination only —
 * no invented parameters. (A status filter, if ever wanted, would be backed
 * by the canonical §10 workflow values.)
 */
export interface SipListFilters {
    page: number;
    pageSize: number;
}
