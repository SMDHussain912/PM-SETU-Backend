/**
 * SPV module types — RoadMap.md §9 "SPV APIs".
 *
 * Spec source: "SPV must be separate from AIP and support lifecycle states
 * such as: Proposed / Under Formation / Incorporated / Operational" plus the
 * §9 public endpoints. The specification lists NO fields and NO filters, so
 * this shape is intentionally minimal: only the lifecycle status, a registry
 * identifier (spec-implied, flagged TO CONFIRM), and the two relationships
 * whose target tables are ALREADY ESTABLISHED by existing project contracts
 * (§25: SPV → Cluster, AIP → SPV). Response keys use snake_case, consistent
 * with the other modules. Everything is database-driven — never hard-code
 * SPVs.
 */

/** Embedded cluster reference returned with every SPV (§25 SPV → Cluster). */
export interface SpvClusterSummary {
    id: number;
    name: string;
}

/** Embedded AIP reference returned with every SPV (§25 AIP → SPV). */
export interface SpvAipSummary {
    id: number;
    name: string;
}

/**
 * SPV registry record (public shape).
 *
 * ⚠ Database contract: the backing table does not exist yet (no Prisma
 * models/migrations). Required columns, the lifecycle vocabulary and every
 * "TO CONFIRM" item are documented in sql/spvs/spv_queries.sql. The SIP
 * relationship is intentionally deferred (its table is not established).
 */
export interface Spv {
    id: number;
    /** Registry identifier. Spec-implied (no field list in §9) — TO CONFIRM. */
    name: string;
    /**
     * §9 lifecycle state. Specified states: Proposed, Under Formation,
     * Incorporated, Operational ("such as" — list may grow; exact DB storage
     * values TO CONFIRM). Passed through as-is.
     */
    status: string;
    /** §25 SPV → Cluster (established table); null when not yet assigned. */
    cluster: SpvClusterSummary | null;
    /** §25 AIP → SPV (established table); null when not yet assigned. */
    aip: SpvAipSummary | null;
}

/**
 * Accepted list filters. §9 documents NO list filters (its "Status" section
 * is an admin PATCH endpoint), so pagination only — no invented parameters.
 */
export interface SpvListFilters {
    page: number;
    pageSize: number;
}
