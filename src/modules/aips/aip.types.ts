/**
 * AIP module types — RoadMap.md §8 "AIP APIs".
 *
 * Spec source: "The AIP registry is required to contain company, sector,
 * cluster, partnership, investment, SIP/SPV information, etc." plus the
 * §8 filter examples. Response/query keys use snake_case, consistent with
 * the Home/ITI/Cluster modules. SQL aliases in aip.repository.ts map 1:1
 * onto these keys. Everything is database-driven — never hard-code AIPs.
 */

/** Embedded cluster reference returned with every AIP (§8 "cluster"). */
export interface AipClusterSummary {
    id: number;
    name: string;
}

/**
 * AIP registry record (public shape).
 *
 * Database fields mirror prisma/schema.prisma. SIP/SPV relationships are
 * represented by their owning modules and are not embedded in this response.
 */
export interface Aip {
    id: number;
    /** §8 "company" — AIP / company name. */
    name: string;
    /** Logo URL. Storage/format TO CONFIRM (user-required field). */
    logo_url: string | null;
    /** §8 "cluster" — null when not yet assigned. */
    cluster: AipClusterSummary | null;
    /** §8 explicit; exact match filter supported. */
    sector: string;
    /** §8 "partnership" status. Vocabulary TO CONFIRM — passed through as-is. */
    status: string;
    /** §8 "investment". Column name established by the Home KPI contract. */
    investment_amount: number | null;
    /** Academic/technology partner. Scalar-vs-relational storage TO CONFIRM. */
    academic_partner: boolean;
    /** Contact. Format TO CONFIRM (user-required field). */
    contact: string | null;
    /** Website. Format TO CONFIRM (user-required field). */
    website: string | null;
}

/** Accepted list filters — exactly the §8 "Search/filter" examples. */
export interface AipListFilters {
    sector?: string;
    cluster_id?: number;
    /** Free-string exact match; no enum invented (vocabulary TO CONFIRM). */
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
}
