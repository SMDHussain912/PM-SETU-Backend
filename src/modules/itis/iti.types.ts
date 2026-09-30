/**
 * ITI module types — RoadMap.md §7 "ITI APIs" + NIC ITI field requirements.
 *
 * Response/query keys use snake_case (NIC style, consistent with the Home
 * module's KPI payload and the RoadMap audit example). SQL aliases in
 * iti.repository.ts map 1:1 onto these keys. Everything is database-driven —
 * never hard-code ITI records.
 */

/** Hub/spoke discriminator (RoadMap §7 filtering examples). */
export type ItiType = "HUB" | "SPOKE";

/** Embedded cluster reference returned with every ITI. */
export interface ItiClusterSummary {
    id: number;
    name: string;
}

/**
 * ITI profile (public shape).
 *
 * ⚠ Database contract: the backing tables do not exist yet (no Prisma
 * models/migrations). The required table/column contract and the storage
 * decisions marked "TO CONFIRM" are documented in sql/itis/iti_queries.sql.
 */
export interface Iti {
    id: number;
    /** NIC: ITI code. */
    iti_code: string;
    /** NIC: ITI name. */
    iti_name: string;
    /** NIC: hub/spoke type. */
    type: ItiType;
    /** NIC: cluster the ITI belongs to (null when not yet assigned). */
    cluster: ItiClusterSummary | null;
    district: string;
    address: string | null;
    principal: string | null;
    contact: string | null;
    email: string | null;
    /** NIC: trades already offered. Storage (text[] vs child table) TO CONFIRM. */
    existing_trades: string[];
    /** NIC: trades proposed under PM SETU. Storage TO CONFIRM. */
    proposed_trades: string[];
    student_strength: number | null;
    /** NIC: infrastructure summary. Storage TO CONFIRM. */
    infrastructure: string | null;
    /** NIC: lab details. Storage TO CONFIRM. */
    lab_details: string | null;
    latitude: number | null;
    longitude: number | null;
    /** NIC: photo URLs. Storage TO CONFIRM. */
    photos: string[];
    /** NIC: lifecycle status. Exact vocabulary TO CONFIRM (RoadMap §21?). */
    status: string;
}

/** Accepted list filters (RoadMap §7 "Filtering") + pagination. */
export interface ItiListFilters {
    district?: string;
    type?: ItiType;
    cluster_id?: number;
    search?: string;
    page: number;
    pageSize: number;
}
