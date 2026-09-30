/**
 * Governance module types — RoadMap.md §11 "GOVERNANCE APIs".
 *
 * Verified spec sources:
 *  - §11: public endpoints GET /governance, /governance/members,
 *    /governance/members/:id plus six group-specific endpoints
 *    (steering-committee, pmu, officers, cluster-officers, spv, contacts)
 *    whose grouping mechanism is specified NOWHERE — deferred.
 *  - §25: entity name `GovernanceMember` (no fields, no relationships).
 *
 * ⚠ §11 documents NO field list. Every field below except `id` comes from
 * the task requirement brief and is NOT verifiable in RoadMap.md — each is
 * marked TO CONFIRM (see sql/governance/governance_queries.sql). Do not add
 * further fields. Response keys use snake_case, consistent with the other
 * modules. Everything is database-driven — never hard-code members.
 */

/**
 * Governance directory member (public shape).
 *
 * ⚠ Database contract: the backing table does not exist yet (no Prisma
 * models/migrations). The required columns and every "TO CONFIRM" item are
 * documented in sql/governance/governance_queries.sql. Admin CRUD and the
 * six group-specific endpoints are intentionally deferred.
 */
export interface GovernanceMember {
    id: number;
    /** Member name. Task-brief field; registry identifier — TO CONFIRM. */
    name: string;
    /** TO CONFIRM (task-brief field, not in RoadMap §11). */
    designation: string | null;
    /** TO CONFIRM: organisation; controlled vocabulary TO CONFIRM. */
    organisation: string | null;
    /**
     * TO CONFIRM: role; controlled vocabulary TO CONFIRM. This field would
     * likely back the deferred group-specific endpoints (steering-committee,
     * pmu, officers, cluster-officers, spv) once defined.
     */
    role: string | null;
    /** TO CONFIRM: URL string vs file reference vs §24 upload metadata. */
    photograph: string | null;
    /** TO CONFIRM: email format validation belongs to the future admin CRUD. */
    email: string | null;
    /** TO CONFIRM: contact format. */
    contact: string | null;
    /**
     * TO CONFIRM: display ordering. RoadMap documents no ordering
     * requirement; the repository draft orders by this column (ASC, NULLS
     * LAST) with id as tiebreaker.
     */
    display_order: number | null;
    /**
     * TO CONFIRM: task brief says "tenure/effective date" — single date vs
     * tenure range (from/to) is an open question; minimal draft uses one
     * date column.
     */
    effective_date: string | null;
}
