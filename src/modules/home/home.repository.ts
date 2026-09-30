import { prisma } from "../../config/database";
import type { HomeKpis } from "./home.types";

/**
 * Home module — database access layer.
 *
 * The statement below mirrors `sql/home/home_kpis.sql`, which is the
 * DBA-maintained copy of the query. If the query changes, update BOTH files
 * (the .sql file is the canonical reference for the database developer).
 *
 * ⚠ STATUS (full details in sql/home/home_kpis.sql):
 *   The PM SETU tables this query reads (clusters, itis, aips, spvs, sips)
 *   do not exist yet — prisma/schema.prisma has no models and there are no
 *   migrations. Until the database developer creates the real schema, this
 *   query fails at runtime and the endpoint returns a 500 error envelope.
 *   That is intentional: KPI values must come from the database, never from
 *   hard-coded or fake numbers.
 */
export async function getHomeKpis(): Promise<HomeKpis> {
    const rows = await prisma.$queryRaw<HomeKpis[]>`
        SELECT
            (SELECT COUNT(*)::int
               FROM clusters)                                         AS clusters,
            (SELECT COUNT(*)::int
               FROM itis
              WHERE itis.type = 'HUB')                                AS hub_itis,
            (SELECT COUNT(*)::int
               FROM itis
              WHERE itis.type = 'SPOKE')                              AS spoke_itis,
            (SELECT COUNT(*)::int
               FROM aips)                                             AS aips,
            (SELECT COUNT(*)::int
               FROM spvs)                                             AS spvs,
            (SELECT COUNT(*)::int
               FROM sips
              WHERE sips.status = 'SUBMITTED')                        AS sip_submitted,
            (SELECT COUNT(*)::int
               FROM sips
              WHERE sips.status = 'APPROVED')                         AS sip_approved,
            COALESCE(
                (SELECT SUM(aips.investment_amount)::double precision
                   FROM aips),
                0
            )                                                         AS investment,
            /* TODO(DBA): no source table/column defined yet for these two
               KPIs (RoadMap.md §25 lists none). Replace the NULLs with the
               real aggregates once the schema is finalised. */
            NULL::double precision                                    AS trainees,
            NULL::double precision                                    AS industries_engaged`;

    const kpis = rows[0];
    if (!kpis) {
        // Unreachable for this query (a bare SELECT always returns one row),
        // but keeps the return type honest.
        throw new Error("Home KPI query returned no rows");
    }
    return kpis;
}
