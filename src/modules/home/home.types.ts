/**
 * Home module types — RoadMap.md §5 "HOME APIs".
 *
 * The KPI payload is 100% database-driven: every value is produced by the
 * aggregate query in `sql/home/home_kpis.sql` (executed by home.repository.ts).
 * Never hard-code counter values here.
 */
export interface HomeKpis {
    /** Total registered industry skill clusters. */
    clusters: number;
    /** ITIs marked as HUB. */
    hub_itis: number;
    /** ITIs marked as SPOKE. */
    spoke_itis: number;
    /** Registered AIPs (industry/accelerator partners). */
    aips: number;
    /** Registered SPVs (special purpose vehicles). */
    spvs: number;
    /** SIPs currently in SUBMITTED status. */
    sip_submitted: number;
    /** SIPs in APPROVED status. */
    sip_approved: number;
    /** Total investment mobilised (INR), aggregated from the AIP registry. */
    investment: number;
    /**
     * Total trainees.
     *
     * ⚠ Nullable for now: RoadMap.md §25 defines no source table/column for
     * this KPI yet (see sql/home/home_kpis.sql). It becomes a plain number
     * once the database developer defines the real source. Do NOT fake a
     * value for it.
     */
    trainees: number | null;
    /**
     * Total industries engaged.
     *
     * ⚠ Nullable for now: no source table/column is defined yet (see
     * sql/home/home_kpis.sql). Do NOT fake a value for it.
     */
    industries_engaged: number | null;
}
