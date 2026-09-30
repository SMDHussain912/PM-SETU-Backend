/**
 * Cluster module types — RoadMap.md §6 "CLUSTER APIs".
 *
 * The specification defines clusters through "map/list/district/sector views
 * and the cluster master data" plus explicit district/sector/search filters.
 * It does NOT define a detailed field list, so this shape is intentionally
 * minimal: only fields grounded in the specification. Related information
 * (ITIs, AIP, SPV, SIP, summary, map) lives behind dedicated endpoints and
 * is implemented by/belongs to their own modules — no fabricated joins or
 * invented fields.
 *
 * Response/query keys use snake_case-free plain names consistent with the
 * NIC-style payloads of the other modules. SQL aliases in
 * cluster.repository.ts map 1:1 onto these keys. Everything is
 * database-driven — never hard-code cluster records.
 */

/** Cluster master data (spec-grounded fields only). */
export interface Cluster {
    id: number;
    name: string;
    /** §6: district view + ?district= filter. */
    district: string;
    /** §6: sector view + ?sector= filter. Single-valued TO CONFIRM (DBA). */
    sector: string;
}

/**
 * Accepted list filters — exactly the §6 "Filtering" examples that are
 * implementable without inventing schema. The ?status=approved example is
 * intentionally deferred: no cluster status vocabulary is defined anywhere
 * in the specification (documented in sql/clusters/cluster_queries.sql).
 */
export interface ClusterListFilters {
    district?: string;
    sector?: string;
    search?: string;
    page: number;
    pageSize: number;
}
